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
    console.error("[Apollo] APOLLO_API_KEY is not set!");
    throw new Error("APOLLO_API_KEY is not set in environment variables");
  }

  const url = "https://api.apollo.io/api/v1/mixed_people/api_search";
  console.info("[Apollo] ── HTTP POST ──", url);
  console.info("[Apollo] Request payload:", JSON.stringify(params, null, 2));
  const start = Date.now();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify(params),
  });

  const ms = Date.now() - start;

  if (response.status === 429) {
    console.error(`[Apollo] 429 Rate Limited (${ms}ms)`);
    throw new Error("APOLLO_RATE_LIMIT_HIT");
  }

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Apollo] HTTP ${response.status} (${ms}ms):`, text.slice(0, 500));
    throw new Error(`Apollo API error: ${response.status} — ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as ApolloSearchResponse;
  console.info(`[Apollo] ── Response OK (${ms}ms) ──`, {
    people: data.people?.length ?? 0,
    totalEntries: data.total_entries ?? data.pagination?.total_entries ?? "N/A",
  });
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

  const enrichUrl = "https://api.apollo.io/api/v1/people/bulk_match?reveal_personal_emails=true";
  console.info(`[Apollo] ── Bulk enrich ${apolloIds.length} people ──`, enrichUrl);
  const enrichStart = Date.now();

  const response = await fetch(enrichUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify({
      details: apolloIds.map((id) => ({ id })),
    }),
  });

  const enrichMs = Date.now() - enrichStart;

  if (response.status === 429) {
    console.error(`[Apollo] Bulk enrich 429 Rate Limited (${enrichMs}ms)`);
    throw new Error("APOLLO_RATE_LIMIT_HIT");
  }

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Apollo] Bulk enrich HTTP ${response.status} (${enrichMs}ms):`, text.slice(0, 500));
    throw new Error(`Apollo bulk enrich error: ${response.status} — ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as ApolloBulkMatchResponse;
  console.info(`[Apollo] ── Bulk enrich complete (${enrichMs}ms) ──`, {
    requested: apolloIds.length,
    enriched: data.unique_enriched_records ?? "?",
    credits: data.credits_consumed ?? "?",
    missing: data.missing_records ?? 0,
  });
  return (data.matches || []).map((p) => ({ ...p, _enriched: true as const }));
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
