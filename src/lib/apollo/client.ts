import type { PersonaFilters } from "@/lib/personas/types";
import type {
  ApolloSearchParams,
  ApolloPerson,
} from "@/lib/apollo/types";
import { apolloRateLimiter } from "@/lib/rate-limit/limiters";
import { apolloBreaker } from "@/lib/circuit-breaker/apollo-breaker";
import { getCachedData, setCachedData } from "@/lib/cache/keys";
import { trackApiUsage } from "@/lib/enrichment/track-api-usage";

/**
 * Custom error for rate limit exceeded.
 */
export class RateLimitError extends Error {
  constructor(public resetAt: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitError";
  }
}

/**
 * Custom error for Apollo API errors.
 */
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
 * Only includes fields that are defined and non-empty.
 *
 * @param filters - Persona filter criteria
 * @returns Apollo API search parameters (partial)
 */
export function translateFiltersToApolloParams(
  filters: PersonaFilters
): Partial<ApolloSearchParams> {
  const params: Partial<ApolloSearchParams> = {};

  // Map titles -> person_titles
  if (filters.titles && filters.titles.length > 0) {
    params.person_titles = filters.titles;
  }

  // Map seniorities -> person_seniorities
  if (filters.seniorities && filters.seniorities.length > 0) {
    params.person_seniorities = filters.seniorities;
  }

  // Map industries -> organization_industries
  if (filters.industries && filters.industries.length > 0) {
    params.organization_industries = filters.industries;
  }

  // Map locations -> person_locations
  if (filters.locations && filters.locations.length > 0) {
    params.person_locations = filters.locations;
  }

  // Map companySize -> organization_num_employees_ranges
  if (filters.companySize && filters.companySize.length > 0) {
    params.organization_num_employees_ranges = filters.companySize;
  }

  // Map keywords -> q_keywords
  if (filters.keywords && filters.keywords.trim().length > 0) {
    params.q_keywords = filters.keywords;
  }

  return params;
}

/**
 * Calculates pagination metadata.
 * Caps totalPages at 500 (Apollo's limit).
 *
 * @param totalEntries - Total number of results
 * @param page - Current page number
 * @param perPage - Results per page
 * @returns Pagination metadata
 */
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
  const cappedTotalPages = Math.min(totalPages, 500); // Apollo's limit
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
 * Searches Apollo.io for people matching persona filters.
 * Applies rate limiting, caching, and circuit breaking.
 *
 * @param tenantId - Tenant identifier for rate limiting and caching
 * @param personaId - Persona identifier for cache key
 * @param filters - Persona filter criteria
 * @param page - Page number (1-indexed)
 * @param pageSize - Results per page
 * @returns Search results with pagination metadata and cache status
 * @throws {RateLimitError} When rate limit is exceeded
 * @throws {ApolloApiError} When Apollo API returns an error
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
  // 1. Check rate limit
  const rateLimitResult = await apolloRateLimiter.limit(`tenant:${tenantId}`);
  if (!rateLimitResult.success) {
    throw new RateLimitError(rateLimitResult.reset);
  }

  // 2. Check cache
  const cacheKey = {
    tenantId,
    resource: "apollo:search",
    identifier: { personaId, page, pageSize },
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
    return {
      ...cachedResult,
      cached: true,
    };
  }

  // 3. Build Apollo params
  const apolloParams: ApolloSearchParams = {
    ...translateFiltersToApolloParams(filters),
    page,
    per_page: pageSize,
  };

  // 4. Call Apollo API through circuit breaker
  try {
    const response = await apolloBreaker.fire(apolloParams);

    // 5. Calculate pagination from response
    const pagination = calculatePagination(
      response.pagination.total_entries,
      page,
      pageSize
    );

    const result = {
      people: response.people,
      pagination,
    };

    // 6. Cache results (24h TTL)
    await setCachedData(cacheKey, result, 86400);

    trackApiUsage("apollo").catch(() => {});

    // 7. Return results
    return {
      ...result,
      cached: false,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "APOLLO_RATE_LIMIT_HIT") {
        throw new ApolloApiError("Apollo API rate limit hit", 429);
      }
      throw new ApolloApiError(error.message, 500);
    }
    throw error;
  }
}
