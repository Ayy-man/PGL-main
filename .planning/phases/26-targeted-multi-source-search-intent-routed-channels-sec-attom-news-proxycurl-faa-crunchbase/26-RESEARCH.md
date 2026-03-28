# Phase 26: Targeted Multi-Source Search — Intent-Routed Channels - Research

**Researched:** 2026-03-27
**Domain:** Intent classification, parallel API fan-out, multi-source search result merging
**Confidence:** HIGH (architecture patterns verified from codebase + official API docs)

---

## Summary

Phase 26 extends the Phase 25 Research Scrapbook by routing user queries to specialized data channels in parallel based on LLM-classified intent, then merging results into a unified ranked feed. The scrapbook's `POST /api/prospects/[prospectId]/research` route already handles the Exa-only pipeline — this phase adds an intent classifier step that fires additional channels before or alongside Exa, accumulating results into the same streaming result-card UI.

The architecture is: query in → fast LLM intent classification → `Promise.allSettled(activeChannels)` fan-out → per-channel TTL caching → merge + dedup → LLM-rank → stream result cards. Each channel is an isolated async function that returns a `ChannelResult[]` or fails gracefully. The existing circuit-breaker and Ratelimit patterns from `enrichEdgar`, `enrichExa`, and `apolloRateLimiter` are the canonical templates.

**Critical channel feasibility finding:** Proxycurl shut down in July 2025 after LinkedIn's federal lawsuit. It cannot be used. All other proposed channels remain viable with the caveats documented below.

**Primary recommendation:** Implement 5 channels (Exa already exists, add: EDGAR EFTS, GNews, SEC Submissions reuse, OpenCorporates, Crunchbase). Treat ATTOM and FAA as low-priority optional channels behind feature flags — ATTOM requires $95/mo commitment and FAA has no official REST API. Exclude Proxycurl entirely (shut down).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @upstash/redis | ^1.36.2 (already installed) | Per-channel TTL caching | Already in use; `setCachedData`/`getCachedData` helpers exist |
| @upstash/ratelimit | ^2.0.8 (already installed) | Per-channel rate limiters | Already powering `apolloRateLimiter` and `edgarRateLimiter` |
| opossum | ^9.0.0 (already installed) | Circuit breaker per channel | Already wrapping `enrichExa` and `enrichEdgar` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| openrouter (already configured) | — | Intent classification + merge-rank LLM calls | Two LLM calls: classify intent (fast, ~100 tokens) + merge-rank (optional) |
| zod | ^4.3.6 (already installed) | Validate external API responses | Type-safe channel output contracts |

### New Dependencies Needed
None. All required infrastructure (Redis, rate limiting, circuit breaker, LLM) is already installed.

**Version verification:** All packages verified from existing `package.json` — no new installs required.

---

## Architecture Patterns

### Recommended Project Structure
```
src/lib/search/
├── channels/
│   ├── index.ts              # Channel registry + ChannelResult type
│   ├── exa-channel.ts        # Wraps enrichExa — existing behavior
│   ├── edgar-efts-channel.ts # SEC EDGAR full-text search (EFTS)
│   ├── gnews-channel.ts      # GNews REST API
│   ├── opencorporates-channel.ts
│   └── crunchbase-channel.ts
├── intent-classifier.ts      # LLM intent → active channel set
├── channel-cache.ts          # Per-channel TTL helpers using existing redis/keys.ts
├── merge-results.ts          # Dedup + rank unified ChannelResult[]
└── execute-research.ts       # Orchestrator: classify → fan-out → merge
```

This extends the Phase 25 scrapbook's `POST /api/prospects/[prospectId]/research` route. The route calls `executeResearch(query, prospectData, sessionId)` — Phase 26 replaces (or wraps) the single Exa call with the multi-channel orchestrator.

### Pattern 1: Channel Contract

Every channel implements this interface. The orchestrator calls all active channels via `Promise.allSettled`.

```typescript
// Source: derived from existing EnrichExa/EnrichEdgar patterns in codebase
export type ChannelResult = {
  channelId: string;            // e.g. "gnews", "edgar-efts", "crunchbase"
  headline: string;
  summary: string;
  source_url: string;
  source_name: string;
  event_date: string | null;
  category: SignalCategory | "news" | "corporate" | "property";
  relevance: "high" | "medium" | "low";
  raw_snippet: string;
  confidence_note?: string;
};

export type ChannelOutput = {
  channelId: string;
  results: ChannelResult[];
  cached: boolean;
  latencyMs: number;
  error?: string;
};

// Every channel function signature:
type ChannelFn = (params: ChannelParams) => Promise<ChannelOutput>;
```

### Pattern 2: Intent Classifier

A single fast LLM call (claude-3.5-haiku via OpenRouter, ~100 tokens output) that maps the user query + prospect context to a set of active channels. Channels not selected are skipped — no fan-out cost.

```typescript
// Source: follows chatCompletion() pattern from src/lib/ai/openrouter.ts
export type IntentClassification = {
  channels: Array<"exa" | "edgar-efts" | "gnews" | "opencorporates" | "crunchbase" | "attom" | "faa">;
  reformulatedQuery: string;   // Optimized query string for all channels
  entityType: "person" | "company" | "property" | "aircraft";
  reasoning: string;           // Short justification, for logging only
};

async function classifyIntent(
  query: string,
  prospect: { name: string; company: string; title?: string; publicly_traded_symbol?: string }
): Promise<IntentClassification>
```

**Intent routing rules (encoded in LLM system prompt):**
- "filed", "SEC", "10-K", "insider", "Form 4" → include `edgar-efts`
- "news", "recent", "announced", "press" → include `gnews`
- "company", "founded", "funding", "startup", "investors" → include `crunchbase`, `opencorporates`
- "property", "house", "real estate", "owns" → include `attom` (if key configured)
- "plane", "aircraft", "jet", "fly" → include `faa` (if key configured)
- Default: always include `exa`; add others based on signals above

### Pattern 3: Per-Channel Caching

Uses existing `buildCacheKey` / `setCachedData` / `getCachedData` from `src/lib/cache/keys.ts`. Each channel gets its own TTL appropriate to data freshness:

```typescript
// Cache key format (extends existing tenant:X:resource:Y pattern)
// tenant:{tenantId}:research-channel:{channelId}:{sha256(query+prospectId)}
// TTL strategy per channel:
const CHANNEL_TTLS: Record<string, number> = {
  "exa":            3600,    // 1 hour — web content changes
  "gnews":          3600,    // 1 hour — news is timely
  "edgar-efts":     86400,   // 24 hours — SEC filings rarely added same day
  "crunchbase":     86400,   // 24 hours — company data stable
  "opencorporates": 86400,   // 24 hours — registration data stable
  "attom":          604800,  // 7 days — property records very stable
  "faa":            604800,  // 7 days — aircraft registry changes rarely
};
```

### Pattern 4: Fan-out Orchestration

```typescript
// Source: follows Promise.allSettled pattern for resilient parallel calls
async function executeResearch(
  query: string,
  prospectData: ResearchProspectContext,
  tenantId: string
): Promise<ChannelResult[]> {
  // Step 1: Classify intent (fast LLM, ~200ms)
  const intent = await classifyIntent(query, prospectData);

  // Step 2: Fan out to active channels in parallel
  const channelFns = intent.channels.map(id => getChannel(id));
  const settled = await Promise.allSettled(
    channelFns.map(fn => fn({ query: intent.reformulatedQuery, prospect: prospectData, tenantId }))
  );

  // Step 3: Collect successful results — failed channels degrade gracefully
  const allResults: ChannelResult[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      allResults.push(...result.value.results);
    }
  }

  // Step 4: Dedup by URL, rank by relevance
  return mergeAndRank(allResults, query);
}
```

### Pattern 5: Graceful Degradation

Each channel checks its API key at construction time. If absent, returns `{ channelId, results: [], error: "API key not configured" }` immediately — never throws. This matches the `enrichExa` and `enrichEdgar` patterns exactly.

```typescript
// Pattern from src/lib/enrichment/exa.ts lines 93-101
if (!apiKey) {
  return { channelId: "gnews", results: [], cached: false, latencyMs: 0, error: "GNEWS_API_KEY not configured" };
}
```

### Anti-Patterns to Avoid
- **Sequential channel execution:** Do NOT `await` each channel in series. Total latency should be `max(channel latencies)`, not `sum(channel latencies)`.
- **Throwing from channels:** Channels must catch all errors and return `ChannelOutput` with `error` field. `Promise.allSettled` handles partial failure.
- **Bypassing per-channel caching:** Every external API call must check cache first. Skipping this burns rate limits and costs money on every research query.
- **Skipping intent classification:** Without it, all channels fire on every query — this costs money (GNews credits, Crunchbase credits) even when irrelevant.
- **Hard coupling to Phase 25 route internals:** The multi-channel orchestrator must be a pure function in `src/lib/search/` — the API route delegates to it, does not contain fan-out logic.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP circuit breaking | Custom retry/timeout logic per channel | `withCircuitBreaker()` from `src/lib/circuit-breaker.ts` | Already proven, `opossum` handles half-open state, timeouts, threshold |
| Rate limiting | Custom token bucket per channel | `new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(...) })` from `src/lib/rate-limit/limiters.ts` | Already backed by Upstash Redis, survives Vercel cold starts |
| Cache key generation | Custom SHA256 hash per channel | `buildCacheKey({ tenantId, resource, identifier })` from `src/lib/cache/keys.ts` | Handles object hashing, enforces tenant prefix security |
| LLM calls | Direct `fetch` to OpenRouter | `chatCompletion()` from `src/lib/ai/openrouter.ts` | Error handling, auth header, HTTP-Referer already wired |
| URL dedup | Custom Set-based dedup | Simple `Map<url, ChannelResult>` pass-through | No library needed — keep it trivial |
| API key validation | Zod schema at app startup | Check `process.env.KEY` per channel at call time | Fail gracefully per-channel, not at startup |

**Key insight:** This phase is almost entirely glue code — the infrastructure (Redis, circuit breaker, rate limiting, LLM) is 100% already in place. The work is writing channel adapters and the orchestrator.

---

## External API Reference

### 1. Exa (ALREADY EXISTS — baseline)
- **File:** `src/lib/enrichment/exa.ts` + `src/lib/enrichment/exa-digest.ts`
- **Pattern:** POST `https://api.exa.ai/search` with `x-api-key` header
- **Key:** `EXA_API_KEY` — confirmed in `.env.local`
- **Cost:** ~$0.007/search (neural mode, 10 results)
- **Adaptation needed:** Extract the raw Exa call into `exa-channel.ts` that returns `ChannelResult[]`
- **Confidence:** HIGH

### 2. SEC EDGAR — Two Sub-Channels

**2a. EDGAR Submissions (EXISTING — for Form 4 insider trades)**
- **File:** `src/lib/enrichment/edgar.ts`
- **Pattern:** `enrichEdgar({ cik, name })` — fetches `CIK{padded}.json` submissions
- **Key:** `SEC_EDGAR_USER_AGENT` — confirmed in `.env.local` (free, no API key)
- **Use case in Phase 26:** Query by `prospect.company_cik` when present. Returns structured transaction data.
- **Adaptation needed:** Wrap as `edgar-submissions-channel.ts`, return `ChannelResult[]` from `EdgarResult.transactions`
- **Confidence:** HIGH (existing working implementation)

**2b. EDGAR EFTS Full-Text Search (NEW)**
- **Endpoint:** `https://efts.sec.gov/LATEST/search-index?q={query}&dateRange=custom&startdt={date}&forms={formType}`
- **Key:** None required. `SEC_EDGAR_USER_AGENT` header same as existing EDGAR usage
- **Use case:** Search filings by person name or company name when no CIK is available
- **Response format:** `{ hits: { hits: [{ _source: { file_date, period_of_report, entity_name, file_num, form_type, ... } }], total: { value: N } } }`
- **Rate limit:** 10 req/sec (same as existing EDGAR; reuse `edgarRateLimiter`)
- **Confidence:** MEDIUM — EFTS is official SEC infrastructure, but the exact response schema was not directly verified due to 403 blocks from researcher IP; schema is well-documented in community sources

### 3. GNews
- **Endpoint:** `GET https://gnews.io/api/v4/search?q={query}&lang=en&max=5&apikey={key}`
- **Auth:** `apikey` query parameter
- **Key needed:** `GNEWS_API_KEY` — NOT in `.env.local` (new key required)
- **Free tier:** 100 req/day. Development only, not commercial. No full article body.
- **Response:** `{ articles: [{ title, description, url, publishedAt, source: { name } }] }`
- **TTL:** 1 hour cache
- **Recommendation:** Use GNews over NewsAPI.org. NewsAPI.org's free tier blocks non-localhost origins in production; GNews free tier works in production (100 req/day limit is acceptable for scrapbook usage).
- **Confidence:** HIGH (official docs fetched)

### 4. OpenCorporates
- **Endpoint:** `GET https://api.opencorporates.com/v0.4/companies/search?q={company}&api_token={key}`
- **Auth:** `api_token` query parameter OR `X-API-TOKEN` header
- **Key needed:** `OPENCORPORATES_API_TOKEN` — NOT in `.env.local` (new key required; free tier available)
- **Use case:** Company registration data, jurisdiction, incorporation date, directors
- **Response:** `{ results: { companies: [{ company: { name, company_number, jurisdiction_code, registered_address, ... } }] } }`
- **Free tier:** Generous rate limits for basic company search; paid plans for bulk access
- **Confidence:** HIGH (official docs + 2025 knowledge base article verified)

### 5. Crunchbase
- **Endpoint:** `GET https://api.crunchbase.com/api/v4/entities/organizations/{permalink}?user_key={key}&field_ids=short_description,funding_total,...`
- **Search:** `POST https://api.crunchbase.com/api/v4/searches/organizations` with JSON body
- **Auth:** `user_key` query parameter OR `X-cb-user-key` header
- **Key needed:** `CRUNCHBASE_API_KEY` — NOT in `.env.local` (new key required; Basic free tier available)
- **Use case:** Company funding rounds, founders, investors, valuation signals
- **Free tier:** Basic plan with limited fields; 200 req/min rate limit
- **Cost for paid:** $29-99/mo depending on tier
- **Confidence:** HIGH (official docs verified via web search)

### 6. ATTOM Property Data (OPTIONAL — gated)
- **Endpoint:** `GET https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/address?address1={addr}&address2={city,state}`
- **Auth:** `apikey` header
- **Key needed:** `ATTOM_API_KEY` — NOT in `.env.local`
- **Cost:** No free tier; 30-day trial only; $95/mo minimum after trial
- **Use case:** Property ownership records when user queries about real estate
- **Recommendation:** Implement as optional channel behind `process.env.ATTOM_API_KEY` check. Document as "premium channel." Do not block MVP on it.
- **Confidence:** HIGH (official docs verified)

### 7. FAA Aircraft Registry (OPTIONAL — gated)
- **Official REST API:** None. The FAA has no official JSON REST API for N-number lookups.
- **Available options:**
  1. CSV download: FAA releases monthly registry CSV (ReleasableAircraft.zip)
  2. HTML scrape: `https://registry.faa.gov/AircraftInquiry/Search/NNumberResult?nNumberTxt={nnum}` — returns HTML, not JSON
  3. Third-party API: community APIs built on top of the CSV data exist but are unofficial
- **Recommendation:** Skip FAA as a live API channel. The absence of a REST API makes it fragile. If needed in future, ingest the monthly CSV into a Supabase table and query locally.
- **Confidence:** HIGH (definitively confirmed: no official REST API exists)

### 8. Proxycurl — DEAD
- **Status:** Shut down July 2025 after LinkedIn federal lawsuit (confirmed via official Proxycurl blog "goodbye" post)
- **Action:** Remove from Phase 26 scope entirely. Do not implement. ContactOut already serves LinkedIn enrichment in the existing pipeline.
- **Confidence:** HIGH

---

## Common Pitfalls

### Pitfall 1: Sequential Channel Execution
**What goes wrong:** Implementing channels with `await channel1()` then `await channel2()` adds latency of all channels together (easily 10+ seconds).
**Why it happens:** Incremental refactoring of a single-channel flow.
**How to avoid:** Use `Promise.allSettled([ch1, ch2, ch3])` from day one.
**Warning signs:** Total research latency growing proportionally to channel count.

### Pitfall 2: Intent Classifier Adds Too Much Latency
**What goes wrong:** If the classifier LLM call takes 1-2 seconds before any channel fires, it adds unacceptable delay to the streaming UX.
**Why it happens:** Classification is sequential with fan-out.
**How to avoid:** Run the classifier with `max_tokens: 150` (output is just a JSON array of channel IDs). Start the Exa channel immediately in parallel with classification; cancel other channels if classifier excludes them. Alternatively: always start Exa immediately (it's the default channel), run classifier in background, fire additional channels when classification completes.
**Warning signs:** P50 latency increasing by classifier median latency.

### Pitfall 3: Missing Tenant Prefix on Cache Keys
**What goes wrong:** Cross-tenant data leakage if cache keys are not scoped. E.g., two tenants querying the same company name share results.
**Why it happens:** Building channel caching from scratch without reading the existing `buildCacheKey` function.
**How to avoid:** Always use `buildCacheKey({ tenantId, resource: 'research-channel', identifier: { channelId, query, prospectId } })`.
**Warning signs:** Security review would catch missing `tenant:` prefix.

### Pitfall 4: EDGAR EFTS Rate Limit Not Respected
**What goes wrong:** EDGAR EFTS and EDGAR submissions share the same `sec-edgar:global` rate limit key (10 req/sec). If EFTS and submissions channels both fire simultaneously, you can hit the limit.
**Why it happens:** The new EFTS channel doesn't know about the existing submissions limiter.
**How to avoid:** Both sub-channels must use the same `edgarRateLimiter` instance from `src/lib/rate-limit/limiters.ts`.
**Warning signs:** 429 responses from `data.sec.gov` or `efts.sec.gov`.

### Pitfall 5: GNews and NewsAPI.org Production Blocking
**What goes wrong:** NewsAPI.org's Developer (free) plan only works on localhost. Deploying to Vercel returns 426/403 errors.
**Why it happens:** NewsAPI.org explicitly restricts free tier to localhost origin.
**How to avoid:** Use GNews instead of NewsAPI.org. GNews free tier (100 req/day) works in production.
**Warning signs:** 403 errors in Vercel logs on the news channel.

### Pitfall 6: Proxycurl Integration Attempted
**What goes wrong:** Implementing Proxycurl causes immediate failure — the service is completely offline as of July 2025.
**Why it happens:** Stale API documentation or spec references.
**How to avoid:** Do not implement. The spec's Proxycurl inclusion is now obsolete.
**Warning signs:** Any Proxycurl API key or `nubela.co` URL in the codebase.

### Pitfall 7: Result Dedup By Content Instead of URL
**What goes wrong:** Multiple channels may return the same news article or SEC filing. Deduplication by headline text is fuzzy and error-prone.
**Why it happens:** Building dedup logic from scratch.
**How to avoid:** Dedup by normalized `source_url` (trim trailing slash, lowercase). URL is the canonical identity for a document.
**Warning signs:** Duplicate cards appearing in result feed for same article from two channels.

### Pitfall 8: Crunchbase Basic Plan Field Restrictions
**What goes wrong:** Crunchbase Basic (free) plan only returns a subset of fields. Trying to access `funding_rounds`, `founders`, or `investors` returns empty or 403.
**Why it happens:** Assuming all fields are available on free tier.
**How to avoid:** Limit Crunchbase Basic queries to `short_description`, `company_type`, `founded_on`, `homepage_url`, `primary_role`. Document that richer data requires paid plan.
**Warning signs:** Empty `funding_total` on obviously-funded companies.

---

## Code Examples

### Intent Classifier Call (verified pattern from openrouter.ts)
```typescript
// Source: follows src/lib/ai/openrouter.ts chatCompletion() signature
const CLASSIFY_SYSTEM = `You are a research intent classifier. Given a query about a person and their context,
return a JSON object selecting relevant data channels. Always include "exa".
Other channels: "edgar-efts" (SEC filings), "gnews" (news), "opencorporates" (company registration),
"crunchbase" (startup/funding), "attom" (property), "faa" (aircraft).
Return ONLY valid JSON: { "channels": [...], "reformulatedQuery": "...", "entityType": "person|company|property|aircraft" }`;

const result = await chatCompletion(CLASSIFY_SYSTEM, userPrompt, 150);
const classification = JSON.parse(result.text) as IntentClassification;
```

### Rate Limiter for New Channel (verified from src/lib/rate-limit/limiters.ts)
```typescript
// New channel rate limiters follow the same pattern as apolloRateLimiter
export const gNewsRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 s"), // GNews free tier: ~100/day, throttle locally
  analytics: true,
  prefix: "ratelimit:gnews",
});
```

### Channel With Circuit Breaker (verified from src/lib/enrichment/exa.ts)
```typescript
// Source: src/lib/enrichment/exa.ts — withCircuitBreaker wrapper pattern
export const gNewsChannel = withCircuitBreaker(
  gNewsChannelInternal,
  { name: "gnews", timeout: 8000, resetTimeout: 60000 }
);
```

### Cache Check in Channel (verified from src/lib/cache/keys.ts)
```typescript
// Per-channel caching using existing buildCacheKey + getCachedData + setCachedData
const cacheKey = {
  tenantId,
  resource: "research-channel:gnews",
  identifier: { query: params.reformulatedQuery, prospectId: params.prospect.id }
};
const cached = await getCachedData<ChannelOutput>(cacheKey);
if (cached) return { ...cached, cached: true };
// ... fetch from API ...
await setCachedData(cacheKey, output, CHANNEL_TTLS["gnews"]);
```

### GNews API Call
```typescript
// Source: official GNews docs — https://docs.gnews.io/
const url = new URL("https://gnews.io/api/v4/search");
url.searchParams.set("q", params.reformulatedQuery);
url.searchParams.set("lang", "en");
url.searchParams.set("max", "5");
url.searchParams.set("apikey", process.env.GNEWS_API_KEY!);

const res = await fetch(url.toString());
const data = await res.json() as { articles: GNewsArticle[] };
```

### Crunchbase Search API Call
```typescript
// Source: https://data.crunchbase.com/docs/using-the-api
// Authentication: user_key query param or X-cb-user-key header
const res = await fetch(
  `https://api.crunchbase.com/api/v4/searches/organizations?user_key=${process.env.CRUNCHBASE_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      field_ids: ["short_description", "company_type", "founded_on", "homepage_url"],
      predicate: {
        field_id: "facet_ids",
        operator_id: "includes",
        values: ["company"]
      },
      query: [{ type: "predicate", field_id: "name", operator_id: "contains", values: [companyName] }],
      limit: 3
    })
  }
);
```

### EDGAR EFTS Full-Text Search
```typescript
// Source: EDGAR EFTS API — efts.sec.gov/LATEST/search-index
// Reuses SEC_EDGAR_USER_AGENT env var + edgarRateLimiter from existing code
await edgarRateLimiter.limit("sec-edgar:global");
const res = await fetch(
  `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(`"${personName}" "${companyName}"`)}&forms=4,13F,8-K&dateRange=custom&startdt=${oneYearAgo}&_source=period_of_report,file_date,entity_name,form_type`,
  { headers: { "User-Agent": process.env.SEC_EDGAR_USER_AGENT! } }
);
```

### OpenCorporates Company Search
```typescript
// Source: https://api.opencorporates.com/documentation/API-Reference
const url = new URL("https://api.opencorporates.com/v0.4/companies/search");
url.searchParams.set("q", companyName);
url.searchParams.set("api_token", process.env.OPENCORPORATES_API_TOKEN!);
url.searchParams.set("jurisdiction_code", "us");

const res = await fetch(url.toString(), {
  headers: { "Accept": "application/json" }
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single Exa search | Intent-routed multi-channel fan-out | Phase 26 | Richer, more targeted results |
| Proxycurl LinkedIn enrichment | ContactOut (existing) or Bright Data | July 2025 | Proxycurl shut down; ContactOut already in pipeline |
| NewsAPI.org (free tier) | GNews (free tier, production-safe) | 2023 | NewsAPI.org free tier blocks production origins; GNews does not |
| Manual FAA CSV lookup | No REST API — CSV download only | Always | No official FAA aircraft registry API exists; skip |

**Deprecated/outdated:**
- Proxycurl: completely shut down July 2025 — do not reference or implement
- NewsAPI.org free tier: blocked in production (non-localhost) — use GNews instead

---

## Open Questions

1. **Should intent classification be parallel with Exa or sequential?**
   - What we know: Sequential classification adds ~200-400ms to P50 latency before any channel fires
   - What's unclear: Whether Phase 25's streaming UX shows a "classifying..." state that can absorb this
   - Recommendation: Always start Exa immediately (it's always included), run classifier in parallel, fire additional channels as classifier resolves

2. **How does the Phase 26 API route interact with Phase 25's existing research route?**
   - What we know: Phase 25 builds `POST /api/prospects/[prospectId]/research`; Phase 26 extends it
   - What's unclear: Whether Phase 25 will be complete before Phase 26 executes (ROADMAP shows Phase 26 depends on Phase 25)
   - Recommendation: Phase 26 should modify the existing route by replacing the direct Exa call with `executeResearch()` orchestrator — this is additive, not a rewrite

3. **Which new API keys need to be provisioned before this phase executes?**
   - Confirmed needed: `GNEWS_API_KEY` (free signup at gnews.io), `OPENCORPORATES_API_TOKEN` (free signup), `CRUNCHBASE_API_KEY` (free Basic tier signup)
   - Optional/paid: `ATTOM_API_KEY` ($95/mo, 30-day trial available)
   - Not needed: Proxycurl (shut down), FAA (no REST API)

4. **How to handle merge-ranking without an LLM call per query?**
   - What we know: A second LLM call to rank merged results adds latency and cost
   - What's unclear: Whether simple heuristic ranking (direct answer > tangential > background, then by channel priority: exa > edgar > gnews > crunchbase > opencorporates) is sufficient
   - Recommendation: Use heuristic ranking for MVP; add optional LLM re-rank as a Phase 26.1 enhancement

5. **Does the Phase 25 result card schema (`ResultCard` type) need extension for multi-channel results?**
   - What we know: Phase 25 CONTEXT.md defines `channelId` is not in the existing `ResultCard` fields
   - What's unclear: Whether the UI needs per-channel attribution badges or just source URL attribution
   - Recommendation: Add `channelId` and `source_name` fields to `ResultCard` — these can be displayed as the source provider name (e.g., "GNews", "SEC EDGAR") in the source footer

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| EXA_API_KEY | Exa channel | Yes | — | N/A — core channel |
| SEC_EDGAR_USER_AGENT | EDGAR channels | Yes | — | Return empty results |
| OPENROUTER_API_KEY | Intent classifier | Yes | — | Default to all channels (expensive fallback) |
| UPSTASH_REDIS_REST_URL | Channel caching + rate limiting | Yes | — | N/A — required |
| GNEWS_API_KEY | GNews channel | No (needs provisioning) | — | Skip channel |
| OPENCORPORATES_API_TOKEN | OpenCorporates channel | No (needs provisioning) | — | Skip channel |
| CRUNCHBASE_API_KEY | Crunchbase channel | No (needs provisioning) | — | Skip channel |
| ATTOM_API_KEY | ATTOM property channel | No (paid, optional) | — | Skip channel |
| FAA API | FAA aircraft channel | N/A — no REST API exists | — | Skip entirely |

**Missing dependencies with no fallback:**
- None — all missing keys degrade gracefully per the channel contract pattern

**Missing dependencies with fallback (skip-channel):**
- `GNEWS_API_KEY` — channel returns empty if missing
- `OPENCORPORATES_API_TOKEN` — channel returns empty if missing
- `CRUNCHBASE_API_KEY` — channel returns empty if missing
- `ATTOM_API_KEY` — channel returns empty if missing (optional premium channel)

---

## Validation Architecture

> nyquist_validation not explicitly set to false in config.json — validation section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | vitest.config.ts (if exists) or inline |
| Quick run command | `pnpm vitest run src/lib/search/` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements → Test Map
| Area | Behavior | Test Type | Automated Command |
|------|----------|-----------|-------------------|
| Intent classifier | Returns valid `IntentClassification` JSON for known queries | unit | `pnpm vitest run src/lib/search/intent-classifier.test.ts` |
| Channel contract | Each channel returns `ChannelOutput` shape, never throws | unit | `pnpm vitest run src/lib/search/channels/` |
| Graceful degradation | Channel returns `{ results: [] }` when API key missing | unit | Per-channel test |
| Cache | Channel cache hit returns `cached: true` | unit | `pnpm vitest run src/lib/search/channel-cache.test.ts` |
| Dedup | Duplicate URLs produce one result in merge | unit | `pnpm vitest run src/lib/search/merge-results.test.ts` |
| Fan-out orchestrator | `Promise.allSettled` failure in one channel doesn't break others | unit | `pnpm vitest run src/lib/search/execute-research.test.ts` |

### Wave 0 Gaps
- [ ] `src/lib/search/channels/index.test.ts` — channel contract shape validation
- [ ] `src/lib/search/intent-classifier.test.ts` — mock OpenRouter, test routing logic
- [ ] `src/lib/search/merge-results.test.ts` — URL dedup, relevance sort
- [ ] `src/lib/search/execute-research.test.ts` — orchestrator with mocked channels

*(All are new test files; no existing test infrastructure covers search channels)*

---

## Prospect Fields Available for Channel Queries

From `src/types/database.ts` — the following `Prospect` fields are relevant to channel query construction:

| Field | Type | Channel Use |
|-------|------|-------------|
| `full_name` | string | All channels — person name query |
| `company` | string | EDGAR, GNews, Crunchbase, OpenCorporates |
| `title` | string | Context for intent classification |
| `publicly_traded_symbol` | string \| null | EDGAR submissions, market context |
| `company_cik` | string \| null | EDGAR submissions channel (direct CIK lookup) |
| `linkedin_url` | string \| null | Was Proxycurl target — no longer applicable |
| `location` | string \| null | ATTOM property channel (if enabled) |

The research route already receives the prospect ID. The orchestrator must fetch these fields from the DB (or receive them from Phase 25's route context).

---

## Sources

### Primary (HIGH confidence)
- `src/lib/enrichment/exa.ts` — Exa channel baseline pattern (POST to exa.ai/search, x-api-key header)
- `src/lib/enrichment/edgar.ts` — EDGAR submissions pattern (CIK-based, SEC_EDGAR_USER_AGENT)
- `src/lib/enrichment/exa-digest.ts` — LLM digest pattern (chatCompletion, JSON array output)
- `src/lib/ai/openrouter.ts` — LLM call pattern (chatCompletion function signature)
- `src/lib/cache/keys.ts` — Cache key pattern (buildCacheKey, setCachedData, getCachedData)
- `src/lib/rate-limit/limiters.ts` — Rate limiter pattern (Ratelimit.slidingWindow)
- `src/lib/circuit-breaker.ts` — Circuit breaker pattern (withCircuitBreaker HOF)
- `src/types/database.ts` — Prospect fields available for channel queries
- `https://docs.gnews.io/` — GNews endpoint, auth, response format
- `https://data.crunchbase.com/docs/using-the-api` — Crunchbase auth, user_key pattern
- `https://api.opencorporates.com/documentation/API-Reference` — OpenCorporates auth, search endpoint
- `https://api.developer.attomdata.com/docs` — ATTOM apikey header, REST format

### Secondary (MEDIUM confidence)
- EDGAR EFTS endpoint (`efts.sec.gov/LATEST/search-index`) — confirmed free, User-Agent required, JSON response structure documented via community sources; 403s prevented direct verification
- GNews free tier production safety — confirmed via newsdata.io comparison article (2026)
- Crunchbase Basic plan field restrictions — confirmed via nubela.co guide and official knowledge base

### Tertiary (LOW confidence — flag for validation before coding)
- ATTOM $95/mo pricing — sourced from web, verify against current ATTOM pricing page before committing
- OpenCorporates free tier rate limits — described as "generous" but exact limits not confirmed; test before production

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all infrastructure already in codebase, no new dependencies
- Architecture patterns: HIGH — derived directly from existing enrichment patterns in repo
- Pitfalls: HIGH — pitfalls verified from official sources (Proxycurl shutdown official blog post, NewsAPI.org free tier restriction)
- External API feasibility: MEDIUM-HIGH — most APIs verified via official docs; EFTS response schema blocked from direct testing

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (30 days for stable APIs; re-verify ATTOM pricing and OpenCorporates rate limits before commitment)
