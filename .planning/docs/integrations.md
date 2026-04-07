# PGL Integrations Reference

> Super-admin reference for all external service connections. This document maps to the `/admin` → System Config → Integrations nav item.

---

## Integration Matrix

| Integration | Type | Status | Auth | Rate Limit | Circuit Breaker | Health Tracked |
|---|---|---|---|---|---|---|
| Apollo.io | REST API | Live | API Key | 100/hr per tenant | Yes (15s timeout) | Yes |
| ContactOut | REST API | Live | API Key | 429 handled | Yes (10s timeout) | Yes |
| Exa.ai | REST API | Live | API Key | Per-call cost | Yes (15s timeout) | Yes |
| SEC EDGAR | REST API | Live | User-Agent header | 10/s global | Yes (15s, 60s reset) | Yes |
| Finnhub | REST API | Live | API Key | Free tier | No | No |
| Yahoo Finance | REST API | Live | None (free) | Free | No | No |
| OpenRouter (Claude AI) | REST API | Live | API Key | Token-based billing | No | Yes |
| Inngest | Event Queue | Live | Signing Key + Event Key | 5 concurrent enrichments | No | Via Supabase |
| Supabase | PostgreSQL + Auth + Storage | Live | Anon Key + Service Role Key | N/A | No | Implicit |
| Upstash Redis | Cache + Rate Limiter | Live | REST URL + Token | N/A | No | Implicit |

---

## Integrations Detail

### 1. Apollo.io — Prospect Search

**Purpose:** B2B prospect database. Search by company, title, seniority, location, industry, keyword filters.

**Environment Variables:**
- `APOLLO_API_KEY` — server-only

**Endpoints called:**
- `POST https://api.apollo.io/api/v1/mixed_people/api_search` — search (free, returns obfuscated previews)
- `POST https://api.apollo.io/api/v1/people/bulk_match` — bulk enrich (~1 credit per person revealed)

**Called from:**
- `src/lib/apollo/client.ts` → `searchApollo()`
- `src/app/api/search/apollo/route.ts`
- `src/app/api/apollo/bulk-enrich/route.ts` (explicit "Enrich Selection" only — never auto-triggered)

**Data written:** `prospects` table — `apollo_id`, name, title, company, location, `linkedin_url`, `photo_url`

**Rate limiting:** 100 calls/hour per tenant (Upstash Redis sliding window key: `ratelimit:apollo:tenant:{tenantId}`)

**Circuit breaker:** `src/lib/circuit-breaker/apollo-breaker.ts` — 15s timeout, 50% error threshold, 30s reset

**Test/mock mode:** Set `APOLLO_MOCK_ENRICHMENT=true` to generate fake enrichment data (no credits consumed)

**Health endpoint:** `/api/admin/enrichment/health` tracks daily success/failed counts per source

---

### 2. ContactOut — Personal Email & Phone

**Purpose:** Find personal email addresses and phone numbers from LinkedIn URL or name.

**Environment Variables:**
- `CONTACTOUT_API_KEY` — server-only

**Endpoint called:**
- `POST https://api.contactout.com/v1/people/enrich`

**Called from:**
- `src/lib/enrichment/contactout.ts` → `enrichContactOut()`
- Invoked by Inngest `enrichProspect` function (Step 1)

**Data written:** `prospects.contact_data` (JSONB) — personal email, phone numbers

**LinkedIn URL restriction:** Must be `/in/` or `/pub/` format. Sales Navigator and Recruiter URLs are rejected.

**Error codes:**
- `404` — not found (not counted as error)
- `429` — rate limited (triggers circuit breaker)
- `400` — bad credentials

**Circuit breaker:** 10s timeout, 50% error threshold, 30s reset

**Health endpoint:** `/api/admin/enrichment/health` — `contactout_success` / `contactout_failed` per day

---

### 3. Exa.ai — Web Search & Wealth Signals

**Purpose:** Search the web for person mentions, press coverage, and auto-extract wealth signals (funding, IPO, board membership, valuation).

**Environment Variables:**
- `EXA_API_KEY` — server-only

**Endpoint called:**
- `POST https://api.exa.ai/search`

**Called from:**
- `src/lib/enrichment/exa.ts` → `enrichExa()`
- Invoked by Inngest `enrichProspect` function (Step 2)

**Data written:**
- `prospect_signals` table — headline, summary, source_url, event_date, category
- `prospects` — raw signal data in JSONB columns

**Search query format:** `"${firstName} ${lastName}" "${companyName}"` (quoted for precision)

**Wealth keywords tracked:** funding, acquisition, IPO, exit, billion, million, net worth, board, investor, raised

**Circuit breaker:** 15s timeout (API is slower), 50% error threshold, 30s reset

**Health endpoint:** `/api/admin/enrichment/health` — `exa_success` / `exa_failed` per day

---

### 4. SEC EDGAR — Insider Trading Data

**Purpose:** Fetch Form 4 (insider trading) filings for public company executives to estimate equity holdings.

**Environment Variables:**
- `SEC_EDGAR_USER_AGENT` — server-only. **Required format:** `"AppName contact@email.com"` (SEC policy)

**Endpoints called:**
- `https://www.sec.gov/files/company_tickers.json` — company CIK registry (cached 24h in Redis)
- `https://data.sec.gov/submissions/CIK{paddedCik}.json` — Form 4 filing index
- `https://www.sec.gov/Archives/edgar/data/{cik}/{accession}/` — Form 4 documents
- `https://efts.sec.gov/LATEST/search-index` — EFTS name-based fallback search

**Called from:**
- `src/lib/enrichment/edgar.ts` → `enrichEdgar(cik, name)` (primary)
- `src/lib/enrichment/edgar.ts` → `enrichEdgarByName(name)` (EFTS fallback when no CIK)
- Invoked by Inngest `enrichProspect` function (Step 3)

**Data written:** `prospects` — insider transaction array (date, type, shares, price, security title)

**Rate limiting:** 10 requests/second global (Upstash Redis key: `ratelimit:edgar:sec-edgar:global`)

**Company alias resolution:**
1. Hardcoded alias table (e.g. Google → Alphabet Inc, Facebook → Meta Platforms Inc)
2. LLM canonicalization fallback via OpenRouter (Gemini 2.0 Flash Lite, 60 token budget)

**Circuit breaker:** 15s timeout, 50% error threshold, 60s reset (more conservative — multi-step lookups)

**Health endpoint:** `/api/admin/enrichment/health` — `edgar_success` / `edgar_failed` per day

---

### 5. Finnhub — Current Stock Quotes

**Purpose:** Real-time stock price, daily high/low/open/close for equity value estimation.

**Environment Variables:**
- `FINNHUB_API_KEY` — server-only

**Endpoint called:**
- `GET https://finnhub.io/api/v1/quote?symbol={ticker}&token={apiKey}`

**Called from:**
- `src/lib/enrichment/market-data.ts` → `fetchMarketSnapshot(ticker, insiderData)`
- Invoked by Inngest `enrichProspect` function (Step 4, if company has a ticker)
- Runs in `Promise.all()` with Yahoo Finance for performance

**Data written:** `prospects` — `stock_snapshot` JSONB (currentPrice, high, low, open, previousClose, performance metrics)

**No circuit breaker.** Errors logged in Inngest enrichment workflow.

---

### 6. Yahoo Finance — Historical Price Data

**Purpose:** 1-year daily closing prices for performance calculations (7d, 30d, 90d, 1y % change) and sparkline charts.

**Environment Variables:** None (free, no auth)

**Endpoint called:**
- `GET https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=1y&interval=1d`

**Called from:**
- `src/lib/enrichment/market-data.ts` — parallel with Finnhub call
- Generic `User-Agent` header added to avoid blocks

**Data written:** `prospects.stock_snapshot` — sparkline array (up to 251 trading day closes)

**Fallback:** If Yahoo fails, enrichment continues with Finnhub data only (empty sparkline).

---

### 7. OpenRouter — Claude AI (LLM)

**Purpose:** Generate prospect summaries and structured intelligence dossiers from enriched data.

**Environment Variables:**
- `OPENROUTER_API_KEY` — server-only

**Endpoint called:**
- `POST https://openrouter.ai/api/v1/chat/completions` (OpenAI-compatible format)

**Models used:**
- `anthropic/claude-3.5-haiku` — prospect summaries and dossier generation
- `google/gemini-2.0-flash-lite` — SEC company name canonicalization (60 token budget)

**Called from:**
- `src/lib/ai/summary.ts` → `generateProspectSummary()` (Inngest Step 5)
- `src/lib/ai/dossier.ts` → `generateIntelligenceDossier()` (Inngest Step 5.5)
- `src/lib/enrichment/edgar.ts` — Gemini fallback for company name resolution

**Data written:**
- `prospects.profile_summary` — 2–3 sentence UHNWI summary
- `prospects.intelligence_dossier` — structured JSONB with wealth signals, insights, hooks
- `prospects.dossier_generated_at`, `prospects.dossier_model`

**HTTP headers sent:** `HTTP-Referer`, `X-Title` (OpenRouter analytics)

**Health endpoint:** `/api/admin/enrichment/health` — tracked as `claude_success` / `claude_failed` per day

---

### 8. Inngest — Background Job Orchestration

**Purpose:** Durable, multi-step background job queue. Manages the enrichment pipeline with retries, concurrency limits, and failure handling.

**Environment Variables:**
- `INNGEST_SIGNING_KEY` — server-only (webhook verification in production)
- `INNGEST_EVENT_KEY` — server-only (for sending events)

**Webhook endpoint:** `src/app/api/inngest/route.ts` — Inngest SDK `serve()` handles function discovery and invocation

**Registered functions:**

**`enrichProspect`** (event-driven)
- Trigger: `"prospect/enrich.requested"` event
- Steps: duplicate guard → ContactOut → Exa → SEC EDGAR → market data → Claude summary → Claude dossier → finalize
- Concurrency: max 5 simultaneous enrichments
- Retries: 3 per step
- On failure: marks `enrichment_status = "failed"`, logs activity

**`aggregateDailyMetrics`** (scheduled cron)
- Trigger: `0 1 * * *` (1 AM UTC daily)
- Aggregates previous day's `activity_log` into `usage_metrics_daily`
- Idempotent via `ON CONFLICT (date, tenant_id, user_id)`

**Monitoring:** `/admin/automations` page shows run history, per-source health, recent failures

**Sync URL (production):** `https://pgl-main.vercel.app/api/inngest`

---

### 9. Supabase — Database, Auth, Storage

**Purpose:** Primary PostgreSQL database, JWT-based auth, and file storage.

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` — client-safe
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client-safe (RLS enforced)
- `SUPABASE_SERVICE_ROLE_KEY` — server-only (bypasses RLS, admin operations only)

**Project:** `gsociuxkotdiarrblwnf.supabase.co`

**Client types:**
- `createClient()` — user-scoped, RLS enforced (used in tenant routes)
- `createAdminClient()` — service role, bypasses RLS (used in admin routes and Inngest)

**Key tables:**

| Table | Purpose |
|---|---|
| `tenants` | Organization records |
| `users` | User profiles (FK to `auth.users`) |
| `prospects` | Core prospect records + enrichment data |
| `prospect_signals` | Exa web mentions and wealth signals |
| `prospect_activity` | Per-prospect event timeline |
| `prospect_tags` | Custom labels per prospect |
| `personas` | Saved search definitions (filters) |
| `saved_search_prospects` | Apollo result tracking per saved search |
| `lists` | Prospect organization lists |
| `list_members` | Prospect–list join with outreach status |
| `research_sessions` | AI research chat sessions |
| `research_messages` | Chat history |
| `research_pins` | Saved research findings |
| `activity_log` | Platform-wide audit trail |
| `usage_metrics_daily` | Pre-aggregated daily usage stats |

**Storage buckets:** Tenant logos, prospect photos

**RLS:** Configured in Supabase dashboard (not in migration files). Tenant isolation enforced at row level via `tenant_id`.

---

### 10. Upstash Redis — Cache & Rate Limiting

**Purpose:** Serverless Redis for search result caching, rate limiting, and first-seen timestamp tracking.

**Environment Variables:**
- `UPSTASH_REDIS_REST_URL` — server-only
- `UPSTASH_REDIS_REST_TOKEN` — server-only

**Instance:** `able-mayfly-18175.upstash.io`

**Client:** `src/lib/redis/client.ts` — `Redis.fromEnv()` singleton

**Cache keys:**

| Key Pattern | TTL | Purpose |
|---|---|---|
| `tenant:{tenantId}:apollo:search:v3:{hash}` | 24h | Apollo search result cache |
| `tenant:{tenantId}:apollo:first-seen` | 365d | Apollo person first-seen timestamps (hash) |
| `edgar:tickers:v1` | 24h | SEC company tickers registry (10MB, cached to avoid repeated fetches) |

**Rate limiters:**

| Limiter | Window | Limit | Key |
|---|---|---|---|
| Apollo per tenant | 1 hour sliding | 100 calls | `ratelimit:apollo:tenant:{tenantId}` |
| SEC EDGAR global | 1 second sliding | 10 calls | `ratelimit:edgar:sec-edgar:global` |

**Degraded mode:** If Redis is unavailable, Apollo caching degrades gracefully (cache misses). SEC EDGAR falls back to live fetch with delay.

---

## Environment Variables Reference

| Variable | Required | Scope | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client + Server | Safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client + Server | Safe to expose, RLS enforced |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only | Bypasses RLS — never expose client-side |
| `UPSTASH_REDIS_REST_URL` | Yes | Server only | |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Server only | |
| `APOLLO_API_KEY` | Yes | Server only | |
| `APOLLO_MOCK_ENRICHMENT` | No | Server only | Set `true` to skip real enrichment (testing) |
| `CONTACTOUT_API_KEY` | Yes | Server only | Sandbox key returns fake data |
| `EXA_API_KEY` | Yes | Server only | |
| `SEC_EDGAR_USER_AGENT` | Yes | Server only | Format: `"AppName contact@email.com"` |
| `FINNHUB_API_KEY` | Yes | Server only | |
| `OPENROUTER_API_KEY` | Yes | Server only | Routes to Claude + Gemini models |
| `INNGEST_SIGNING_KEY` | Yes (prod) | Server only | Webhook verification |
| `INNGEST_EVENT_KEY` | Yes (prod) | Server only | Event sending |

---

## Integration Health Monitoring

The `/api/admin/enrichment/health?days=N` endpoint returns daily success/failed counts per source:

```json
{
  "data": [
    {
      "date": "2026-04-07",
      "contactout_success": 45,
      "contactout_failed": 2,
      "exa_success": 48,
      "exa_failed": 1,
      "edgar_success": 40,
      "edgar_failed": 5,
      "claude_success": 47,
      "claude_failed": 3
    }
  ]
}
```

This powers the **Enrichment Health Chart** on the admin Command Center dashboard.

**Note:** Finnhub and Yahoo Finance are not tracked in the health endpoint — errors appear only in Inngest run logs.

---

## Known Limitations

- **ContactOut** API key is sandbox-only — returns fake "Example Person" data. Needs sales contact for production access.
- **Apollo** search returns obfuscated previews at no cost; bulk enrichment consumes credits (~1 per person). Mock mode (`APOLLO_MOCK_ENRICHMENT=true`) available for testing.
- **Yahoo Finance** uses an unofficial v8 API endpoint — no SLA guarantee.
- **SEC EDGAR** lookups are multi-step (ticker registry → CIK → filings) and can take 3–5 seconds; circuit breaker reset is conservative (60s).
- **OpenRouter** model selection: `claude-3.5-haiku` is cost-optimized; upgrade to Sonnet/Opus in `src/lib/ai/` if quality needs improving.
