import CircuitBreaker from "opossum";
import type {
  ApolloSearchParams,
  ApolloSearchResponse,
} from "@/lib/apollo/types";

/**
 * Internal function to make Apollo API search requests.
 * Throws on rate limits or API errors for circuit breaker to handle.
 *
 * @param params - Apollo search parameters
 * @returns Apollo search response
 * @throws Error on rate limit (429) or other API errors
 */
async function apolloSearchRequest(
  params: ApolloSearchParams
): Promise<ApolloSearchResponse> {
  const response = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": process.env.APOLLO_API_KEY!,
    },
    body: JSON.stringify(params),
  });

  // Apollo rate limit hit - throw for circuit breaker tracking
  if (response.status === 429) {
    throw new Error("APOLLO_RATE_LIMIT_HIT");
  }

  // Other API errors
  if (!response.ok) {
    throw new Error(`Apollo API error: ${response.status}`);
  }

  return (await response.json()) as ApolloSearchResponse;
}

/**
 * Circuit breaker options for Apollo API.
 * - Opens at 50% failure rate
 * - Resets after 30 seconds
 * - Requires 5 requests minimum before opening
 */
const options = {
  timeout: 10000, // 10 second timeout
  errorThresholdPercentage: 50, // Open at 50% failure rate
  resetTimeout: 30000, // Try again after 30 seconds
  volumeThreshold: 5, // Minimum requests before opening
};

/**
 * Circuit breaker for Apollo API requests.
 * Prevents cascading failures by opening circuit on repeated errors.
 *
 * Fallback returns empty results when circuit is open.
 *
 * Usage:
 * ```ts
 * const result = await apolloBreaker.fire(params);
 * ```
 */
export const apolloBreaker = new CircuitBreaker(apolloSearchRequest, options);

// Fallback: return empty results when circuit is open
apolloBreaker.fallback(async () => ({
  people: [],
  pagination: {
    page: 1,
    per_page: 50,
    total_entries: 0,
    total_pages: 0,
  },
}));

// Event logging for circuit breaker state changes
apolloBreaker.on("open", () => {
  console.error("[Circuit Breaker] OPEN - Apollo API circuit breaker opened due to repeated failures");
});

apolloBreaker.on("halfOpen", () => {
  console.warn("[Circuit Breaker] HALF-OPEN - Testing if Apollo API has recovered");
});

apolloBreaker.on("close", () => {
  console.info("[Circuit Breaker] CLOSED - Apollo API circuit breaker closed, normal operation resumed");
});
