import type { PersonaFilters } from "@/lib/personas/types";
import type {
  ApolloSearchParams,
  ApolloPerson,
} from "@/lib/apollo/types";
import { apolloRateLimiter } from "@/lib/rate-limit/limiters";
import { apolloBreaker, bulkEnrichPeople } from "@/lib/circuit-breaker/apollo-breaker";
import { getCachedData, setCachedData } from "@/lib/cache/keys";
import { trackApiUsage } from "@/lib/enrichment/track-api-usage";

/** Hard limit on results per search — set to 25 for demo. */
const MAX_RESULTS_PER_SEARCH = 25;

export class RateLimitError extends Error {
  constructor(public resetAt: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitError";
  }
}

export class ApolloApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ApolloApiError";
  }
}

/**
 * Translates PersonaFilters to Apollo API parameter names.
 */
export function translateFiltersToApolloParams(
  filters: PersonaFilters
): Partial<ApolloSearchParams> {
  const params: Partial<ApolloSearchParams> = {};

  if (filters.titles && filters.titles.length > 0) {
    params.person_titles = filters.titles;
  }
  if (filters.seniorities && filters.seniorities.length > 0) {
    params.person_seniorities = filters.seniorities;
  }
  if (filters.industries && filters.industries.length > 0) {
    params.organization_industries = filters.industries;
  }
  if (filters.locations && filters.locations.length > 0) {
    params.person_locations = filters.locations;
  }
  if (filters.companySize && filters.companySize.length > 0) {
    params.organization_num_employees_ranges = filters.companySize;
  }
  if (filters.keywords && filters.keywords.trim().length > 0) {
    params.q_keywords = filters.keywords;
  }

  return params;
}

export function calculatePagination(
  totalEntries: number,
  page: number,
  perPage: number
): {
  page: number;
  pageSize: number;
  totalPages: number;
  totalResults: number;
  hasMore: boolean;
} {
  const totalPages = totalEntries === 0 ? 0 : Math.ceil(totalEntries / perPage);
  const cappedTotalPages = Math.min(totalPages, 500);
  const hasMore = page < cappedTotalPages;

  return {
    page,
    pageSize: perPage,
    totalPages: cappedTotalPages,
    totalResults: totalEntries,
    hasMore,
  };
}

/**
 * Searches Apollo for people matching persona filters.
 * Two-step flow: search (free) → bulk enrich (credits) → return full data.
 * Hard-capped at MAX_RESULTS_PER_SEARCH during testing.
 */
export async function searchApollo(
  tenantId: string,
  personaId: string,
  filters: PersonaFilters,
  page: number,
  pageSize: number
): Promise<{
  people: ApolloPerson[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalResults: number;
    hasMore: boolean;
  };
  cached: boolean;
}> {
  // Cap page size
  const cappedPageSize = Math.min(pageSize, MAX_RESULTS_PER_SEARCH);

  // 1. Check rate limit
  const rateLimitResult = await apolloRateLimiter.limit(`tenant:${tenantId}`);
  if (!rateLimitResult.success) {
    throw new RateLimitError(rateLimitResult.reset);
  }

  // 2. Check cache (include filters in key so different searches aren't stale)
  const cacheKey = {
    tenantId,
    resource: "apollo:search",
    identifier: { personaId, page, pageSize: cappedPageSize, filters },
  };

  const cachedResult = await getCachedData<{
    people: ApolloPerson[];
    pagination: {
      page: number;
      pageSize: number;
      totalPages: number;
      totalResults: number;
      hasMore: boolean;
    };
  }>(cacheKey);

  if (cachedResult) {
    return { ...cachedResult, cached: true };
  }

  // 3. Build Apollo search params
  const translatedParams = translateFiltersToApolloParams(filters);
  const apolloParams: ApolloSearchParams = {
    ...translatedParams,
    page,
    per_page: cappedPageSize,
  };

  // 4. Search (free — returns obfuscated previews with Apollo IDs)
  console.info(`[searchApollo] ── Apollo API call ──`, {
    persona: personaId,
    page,
    pageSize: cappedPageSize,
    translatedParams: JSON.stringify(translatedParams),
    fullPayload: JSON.stringify(apolloParams),
  });
  try {
    const searchResponse = await apolloBreaker.fire(apolloParams);
    const searchPeople = searchResponse.people || [];
    console.info(`[searchApollo] Search returned ${searchPeople.length} people`);

    // 5. Bulk enrich all results to get full contact data (costs ~1 credit each)
    let enrichedPeople: ApolloPerson[] = [];
    if (searchPeople.length > 0) {
      const apolloIds = searchPeople.map((p) => p.id);
      try {
        enrichedPeople = await bulkEnrichPeople(apolloIds);
        console.info(`[searchApollo] Enriched ${enrichedPeople.length} people`);
      } catch (enrichErr) {
        console.error("[searchApollo] Bulk enrich failed, falling back to search previews:", enrichErr);
        // Fall back to search data with what we have
        enrichedPeople = searchPeople.map((p) => ({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name_obfuscated || "",
          name: `${p.first_name} ${p.last_name_obfuscated || ""}`.trim(),
          title: p.title || "",
          organization_name: p.organization?.name,
        }));
      }
    }

    // 6. Calculate pagination (total_entries can be top-level or nested)
    const totalEntries = searchResponse.total_entries ?? searchResponse.pagination?.total_entries ?? searchPeople.length;
    const pagination = calculatePagination(totalEntries, page, cappedPageSize);

    const result = { people: enrichedPeople, pagination };

    // 7. Cache results (24h TTL)
    try {
      await setCachedData(cacheKey, result, 86400);
    } catch (cacheErr) {
      console.error("[searchApollo] Failed to cache results (non-fatal):", cacheErr);
    }
    trackApiUsage("apollo").catch(() => {});

    return { ...result, cached: false };
  } catch (error) {
    console.error("[searchApollo] Search failed:", error);
    if (error instanceof Error) {
      if (error.message === "APOLLO_RATE_LIMIT_HIT") {
        throw new ApolloApiError("Apollo API rate limit hit", 429);
      }
      // Circuit breaker open state
      if (error.message.includes("Breaker is open")) {
        throw new ApolloApiError("Apollo API temporarily unavailable (circuit breaker open). Try again in 30 seconds.", 503);
      }
      throw new ApolloApiError(error.message, 500);
    }
    throw error;
  }
}
