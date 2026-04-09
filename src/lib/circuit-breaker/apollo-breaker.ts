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
 * Apollo's `/people/bulk_match` endpoint caps each request at 10 records.
 * Exceeding this returns a 400 with `RECORD_LIMIT_EXCEEDED`. Callers pass
 * arbitrary batch sizes, so we chunk internally and aggregate results.
 */
const APOLLO_BULK_MATCH_MAX_PER_REQUEST = 10;

/**
 * Enrich a single batch of ≤10 Apollo IDs against /people/bulk_match.
 * Throws on non-2xx; caller handles retry/error classification.
 */
async function bulkEnrichBatch(
  apolloIds: string[],
  apiKey: string
): Promise<ApolloBulkMatchResponse> {
  const enrichUrl = "https://api.apollo.io/api/v1/people/bulk_match?reveal_personal_emails=true";
  const batchStart = Date.now();

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

  const batchMs = Date.now() - batchStart;

  if (response.status === 429) {
    console.error(`[Apollo] Bulk enrich batch 429 Rate Limited (${batchMs}ms)`);
    throw new Error("APOLLO_RATE_LIMIT_HIT");
  }

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Apollo] Bulk enrich batch HTTP ${response.status} (${batchMs}ms):`, text.slice(0, 500));
    throw new Error(`Apollo bulk enrich error: ${response.status} — ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as ApolloBulkMatchResponse;
  console.info(`[Apollo] Bulk enrich batch OK (${batchMs}ms)`, {
    requested: apolloIds.length,
    enriched: data.unique_enriched_records ?? "?",
    credits: data.credits_consumed ?? "?",
    missing: data.missing_records ?? 0,
  });
  return data;
}

/**
 * Bulk enrich people by Apollo IDs (costs ~1 credit each).
 * Returns fully revealed contact data.
 *
 * Chunks into batches of ≤10 to respect Apollo's `/people/bulk_match`
 * per-request record limit (`RECORD_LIMIT_EXCEEDED` otherwise). Batches
 * run sequentially to stay within the single circuit-breaker timeout
 * budget and avoid hammering Apollo in parallel.
 */
async function bulkEnrichPeopleImpl(
  apolloIds: string[]
): Promise<ApolloPerson[]> {
  if (apolloIds.length === 0) return [];

  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    throw new Error("APOLLO_API_KEY is not set in environment variables");
  }

  console.info(
    `[Apollo] ── Bulk enrich ${apolloIds.length} people (chunked in batches of ${APOLLO_BULK_MATCH_MAX_PER_REQUEST}) ──`
  );
  const totalStart = Date.now();

  const batches: string[][] = [];
  for (let i = 0; i < apolloIds.length; i += APOLLO_BULK_MATCH_MAX_PER_REQUEST) {
    batches.push(apolloIds.slice(i, i + APOLLO_BULK_MATCH_MAX_PER_REQUEST));
  }

  const allMatches: ApolloPerson[] = [];
  let totalEnriched = 0;
  let totalCredits = 0;
  let totalMissing = 0;

  for (const batch of batches) {
    const data = await bulkEnrichBatch(batch, apiKey);
    if (data.matches?.length) allMatches.push(...data.matches);
    totalEnriched += data.unique_enriched_records ?? 0;
    totalCredits += data.credits_consumed ?? 0;
    totalMissing += data.missing_records ?? 0;
  }

  const totalMs = Date.now() - totalStart;
  console.info(`[Apollo] ── Bulk enrich complete (${totalMs}ms, ${batches.length} batch${batches.length !== 1 ? "es" : ""}) ──`, {
    requested: apolloIds.length,
    enriched: totalEnriched,
    credits: totalCredits,
    missing: totalMissing,
  });

  return allMatches.map((p) => ({ ...p, _enriched: true as const }));
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

/**
 * Circuit breaker for Apollo bulk enrichment.
 *
 * Uses a longer timeout than `apolloBreaker` because bulk enrichment now
 * chunks into sequential batches of 10 (Apollo's per-request cap). A full
 * 25-record enrich is 3 sequential Apollo calls; allow headroom for each
 * to take several seconds without tripping the breaker.
 *
 * NO fallback — errors propagate so callers can return proper HTTP status codes.
 */
const bulkEnrichOptions = {
  timeout: 45000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
};

const apolloBulkEnrichBreaker = new CircuitBreaker(bulkEnrichPeopleImpl, bulkEnrichOptions);

apolloBulkEnrichBreaker.on("open", () => {
  console.error("[Bulk Enrich Circuit Breaker] OPEN — Apollo bulk enrich tripped. Will retry after 30s.");
});

apolloBulkEnrichBreaker.on("halfOpen", () => {
  console.warn("[Bulk Enrich Circuit Breaker] HALF-OPEN — Testing if Apollo bulk enrich has recovered...");
});

apolloBulkEnrichBreaker.on("close", () => {
  console.info("[Bulk Enrich Circuit Breaker] CLOSED — Apollo bulk enrich recovered, normal operation resumed.");
});

/**
 * Public bulkEnrichPeople — wraps the implementation in a dedicated circuit breaker.
 * Signature unchanged from before: (apolloIds: string[]) => Promise<ApolloPerson[]>.
 */
export async function bulkEnrichPeople(
  apolloIds: string[]
): Promise<ApolloPerson[]> {
  return apolloBulkEnrichBreaker.fire(apolloIds);
}
