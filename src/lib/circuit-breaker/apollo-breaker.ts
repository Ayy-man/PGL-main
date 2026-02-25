import CircuitBreaker from "opossum";
import type {
  ApolloSearchParams,
  ApolloSearchResponse,
  ApolloPerson,
  ApolloBulkMatchResponse,
} from "@/lib/apollo/types";

/**
 * Search Apollo for people (free, returns obfuscated previews).
 */
async function apolloSearchRequest(
  params: ApolloSearchParams
): Promise<ApolloSearchResponse> {
  const response = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": process.env.APOLLO_API_KEY!,
    },
    body: JSON.stringify(params),
  });

  if (response.status === 429) {
    throw new Error("APOLLO_RATE_LIMIT_HIT");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apollo API error: ${response.status} — ${text.slice(0, 200)}`);
  }

  return (await response.json()) as ApolloSearchResponse;
}

/**
 * Bulk enrich people by Apollo IDs (costs ~1 credit each).
 * Returns fully revealed contact data.
 */
export async function bulkEnrichPeople(
  apolloIds: string[]
): Promise<ApolloPerson[]> {
  if (apolloIds.length === 0) return [];

  const url = new URL("https://api.apollo.io/api/v1/people/bulk_match");
  url.searchParams.set("reveal_personal_emails", "true");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": process.env.APOLLO_API_KEY!,
    },
    body: JSON.stringify({
      details: apolloIds.map((id) => ({ id })),
    }),
  });

  if (response.status === 429) {
    throw new Error("APOLLO_RATE_LIMIT_HIT");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apollo bulk enrich error: ${response.status} — ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as ApolloBulkMatchResponse;
  console.info(`[Apollo] Bulk enriched ${data.unique_enriched_records ?? '?'} people, credits: ${data.credits_consumed ?? '?'}`);
  return data.matches || [];
}

/**
 * Circuit breaker options for Apollo search.
 */
const options = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
};

export const apolloBreaker = new CircuitBreaker(apolloSearchRequest, options);

apolloBreaker.fallback(async () => ({
  people: [],
  pagination: {
    page: 1,
    per_page: 10,
    total_entries: 0,
    total_pages: 0,
  },
}));

apolloBreaker.on("open", () => {
  console.error("[Circuit Breaker] OPEN - Apollo API circuit breaker opened due to repeated failures");
});

apolloBreaker.on("halfOpen", () => {
  console.warn("[Circuit Breaker] HALF-OPEN - Testing if Apollo API has recovered");
});

apolloBreaker.on("close", () => {
  console.info("[Circuit Breaker] CLOSED - Apollo API circuit breaker closed, normal operation resumed");
});
