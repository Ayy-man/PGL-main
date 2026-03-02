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
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    throw new Error("APOLLO_API_KEY is not set in environment variables");
  }

  console.info("[Apollo] Searching with params:", JSON.stringify(params));

  const response = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": apiKey,
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

  const data = (await response.json()) as ApolloSearchResponse;
  console.info(`[Apollo] Search returned ${data.people?.length ?? 0} people (total_entries: ${data.total_entries ?? "N/A"})`);
  return data;
}

/**
 * Bulk enrich people by Apollo IDs (costs ~1 credit each).
 * Returns fully revealed contact data.
 */
export async function bulkEnrichPeople(
  apolloIds: string[]
): Promise<ApolloPerson[]> {
  if (apolloIds.length === 0) return [];

  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    throw new Error("APOLLO_API_KEY is not set in environment variables");
  }

  console.info(`[Apollo] Bulk enriching ${apolloIds.length} people...`);

  const url = new URL("https://api.apollo.io/api/v1/people/bulk_match");
  url.searchParams.set("reveal_personal_emails", "true");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
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
  console.info(`[Apollo] Bulk enriched ${data.unique_enriched_records ?? "?"} people, credits: ${data.credits_consumed ?? "?"}`);
  return data.matches || [];
}

/**
 * Circuit breaker options for Apollo search.
 * NO FALLBACK — errors must propagate so the API route returns proper error codes.
 */
const options = {
  timeout: 15000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
};

export const apolloBreaker = new CircuitBreaker(apolloSearchRequest, options);

// NO fallback — let errors propagate to client.ts catch block
// so the user sees real error messages instead of silent empty results.

apolloBreaker.on("open", () => {
  console.error("[Circuit Breaker] OPEN — Apollo API circuit breaker tripped. Will retry after 30s.");
});

apolloBreaker.on("halfOpen", () => {
  console.warn("[Circuit Breaker] HALF-OPEN — Testing if Apollo API has recovered...");
});

apolloBreaker.on("close", () => {
  console.info("[Circuit Breaker] CLOSED — Apollo API recovered, normal operation resumed.");
});
