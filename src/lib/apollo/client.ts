import type { PersonaFilters } from "@/lib/personas/types";
import type {
  ApolloSearchParams,
  ApolloPerson,
} from "@/lib/apollo/types";
import { apolloRateLimiter } from "@/lib/rate-limit/limiters";
import { apolloBreaker } from "@/lib/circuit-breaker/apollo-breaker";
import { getCachedData, setCachedData } from "@/lib/cache/keys";
import { redis } from "@/lib/cache/redis";
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

  if (filters.organization_names && filters.organization_names.length > 0) {
    params.organization_names = filters.organization_names;
  }
  if (filters.titles && filters.titles.length > 0) {
    params.person_titles = filters.titles;
  }
  if (filters.seniorities && filters.seniorities.length > 0) {
    params.person_seniorities = filters.seniorities;
  }
  if (filters.locations && filters.locations.length > 0) {
    params.person_locations = filters.locations;
  }
  if (filters.companySize && filters.companySize.length > 0) {
    // Normalize: convert legacy dash format "51-200" to Apollo comma format "51,200"
    params.organization_num_employees_ranges = filters.companySize.map((s) =>
      s.includes("-") && !s.includes(",") ? s.replace("-", ",") : s
    );
  }

  // Person name search — direct name lookup via Apollo's q_person_name
  if (filters.person_name?.trim()) {
    params.q_person_name = filters.person_name.trim();
  }

  // Organization keyword tags — merge `industries` and free-text `keywords`.
  //
  // Apollo's own UI "Keywords" search matches broadly across BOTH person
  // text AND company keyword tags (industry, specialties, business
  // descriptors). Previously we only routed `filters.keywords` to
  // `q_keywords`, which is person-text only — so a query like
  // "yacht rentals" would miss companies whose Apollo keyword tags
  // contain those terms. Routing to `q_organization_keyword_tags` in
  // addition matches Apollo's actual UI behavior.
  const orgKeywordTags: string[] = [];
  if (filters.industries && filters.industries.length > 0) {
    orgKeywordTags.push(...filters.industries);
  }
  if (filters.keywords?.trim()) {
    orgKeywordTags.push(filters.keywords.trim());
  }
  if (orgKeywordTags.length > 0) {
    params.q_organization_keyword_tags = orgKeywordTags;
  }

  // Person-text search (q_keywords) — matches person titles, descriptions,
  // and current employer name. Combines free-text `keywords` with the
  // wealth signal from `net_worth_range` (which is a person-level
  // attribute, not a company tag, so it stays out of org keyword tags).
  const keywordParts: string[] = [];
  if (filters.keywords?.trim()) keywordParts.push(filters.keywords.trim());
  if (filters.net_worth_range?.trim()) keywordParts.push(filters.net_worth_range.trim());
  if (keywordParts.length > 0) {
    params.q_keywords = keywordParts.join(" ");
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

  // Normalize companySize before cache key to handle legacy formats:
  // - Dash format "51-200" → "51,200"
  // - Split numbers ["51", "200", "201", "500"] → ["51,200", "201,500"] (from broken comma-split)
  let normalizedCompanySize = filters.companySize;
  if (normalizedCompanySize && normalizedCompanySize.length > 0) {
    // Check if values look like orphaned numbers (no comma or dash = likely split artifact)
    const allPureNumbers = normalizedCompanySize.every((s) => /^\d+$/.test(s));
    if (allPureNumbers && normalizedCompanySize.length % 2 === 0) {
      // Re-pair consecutive numbers: ["51","200","201","500"] → ["51,200","201,500"]
      const paired: string[] = [];
      for (let i = 0; i < normalizedCompanySize.length; i += 2) {
        paired.push(`${normalizedCompanySize[i]},${normalizedCompanySize[i + 1]}`);
      }
      normalizedCompanySize = paired;
    } else {
      // Convert dash format: "51-200" → "51,200"
      normalizedCompanySize = normalizedCompanySize.map((s) =>
        s.includes("-") && !s.includes(",") ? s.replace("-", ",") : s
      );
    }
  }
  const normalizedFilters: PersonaFilters = {
    ...filters,
    ...(normalizedCompanySize ? { companySize: normalizedCompanySize } : {}),
  };

  // 1. Check rate limit
  const rateLimitResult = await apolloRateLimiter.limit(`tenant:${tenantId}`);
  console.info(`[searchApollo] Rate limit check:`, {
    success: rateLimitResult.success,
    remaining: rateLimitResult.remaining,
    reset: rateLimitResult.reset,
  });
  if (!rateLimitResult.success) {
    console.warn(`[searchApollo] RATE LIMITED — remaining: ${rateLimitResult.remaining}, reset: ${rateLimitResult.reset}`);
    throw new RateLimitError(rateLimitResult.reset);
  }

  // 2. Check cache (uses normalized filters so old dash-format keys are invalidated)
  // v4: filters.keywords now dual-routes to q_organization_keyword_tags,
  // so old v3 cache entries would return stale results — invalidate them.
  const cacheKey = {
    tenantId,
    resource: "apollo:search:v4",
    identifier: { personaId, page, pageSize: cappedPageSize, filters: normalizedFilters },
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
    console.info(`[searchApollo] CACHE HIT — returning ${cachedResult.people.length} cached results (totalResults: ${cachedResult.pagination.totalResults})`);
    return { ...cachedResult, cached: true };
  }
  console.info(`[searchApollo] Cache miss — calling Apollo API`);

  // 3. Build Apollo search params (use normalizedFilters — companySize already in comma format)
  const translatedParams = translateFiltersToApolloParams(normalizedFilters);
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

    // 5. Return search previews only — NO auto bulk-enrich.
    //    Enrichment is triggered explicitly via "Enrich Selection" button,
    //    which calls bulkEnrichPeople → upsert → Inngest pipeline.

    // Track first-seen timestamps per person in a persistent Redis hash.
    // TTL is 365 days (reset on each search). Survives the 24h search cache.
    const firstSeenKey = `tenant:${tenantId}:apollo:first-seen`;
    const apolloIds = searchPeople.map((p) => p.id);
    const firstSeenMap = new Map<string, string>();
    const now = new Date().toISOString();

    try {
      // Upstash hmget returns Record<field, value> | null, not an array
      const existing = apolloIds.length > 0
        ? (await redis.hmget(firstSeenKey, ...apolloIds) as unknown as Record<string, string | null> | null) ?? {}
        : {} as Record<string, string | null>;
      const toSet: Record<string, string> = {};
      for (const id of apolloIds) {
        const ts = existing[id] ?? null;
        if (ts) {
          firstSeenMap.set(id, ts);
        } else {
          firstSeenMap.set(id, now);
          toSet[id] = now;
        }
      }
      if (Object.keys(toSet).length > 0) {
        await redis.hset(firstSeenKey, toSet);
        await redis.expire(firstSeenKey, 365 * 24 * 60 * 60);
      }
    } catch (err) {
      console.warn("[searchApollo] Failed to track first-seen timestamps (non-fatal):", err);
    }

    const previewPeople: ApolloPerson[] = searchPeople.map((p) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name_obfuscated || "",
      name: `${p.first_name} ${p.last_name_obfuscated || ""}`.trim(),
      title: p.title || "",
      organization_name: p.organization?.name,
      first_seen_at: firstSeenMap.get(p.id),
      _enriched: false,
    }));

    // 6. Calculate pagination (total_entries can be top-level or nested)
    const totalEntries = searchResponse.total_entries ?? searchResponse.pagination?.total_entries ?? searchPeople.length;
    const pagination = calculatePagination(totalEntries, page, cappedPageSize);

    const result = { people: previewPeople, pagination };

    // 7. Cache search results (previews are safe to cache)
    if (previewPeople.length > 0) {
      try {
        await setCachedData(cacheKey, result, 86400);
        console.info(`[searchApollo] Cached ${previewPeople.length} preview results (24h TTL)`);
      } catch (cacheErr) {
        console.error("[searchApollo] Failed to cache results (non-fatal):", cacheErr);
      }
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
