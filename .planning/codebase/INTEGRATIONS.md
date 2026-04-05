# External Integrations

**Analysis Date:** 2026-04-05

## APIs & External Services

**Prospect Search & Enrichment:**
- **Apollo.io** - B2B sales intelligence platform (search + bulk enrichment)
  - SDK/Client: Custom HTTP client in `src/lib/apollo/client.ts`
  - Auth: `APOLLO_API_KEY` (server-only)
  - Rate Limiting: Via Upstash Redis, rate limiter in `src/lib/rate-limit/limiters.ts`
  - Circuit Breaker: `opossum` in `src/lib/circuit-breaker/apollo-breaker.ts`
  - Cache: Upstash Redis with key version `apollo:search:v3` (SHA256 hashed)
  - Cost Model: Search is FREE (obfuscated previews), bulk enrichment costs credits (5k/month)
  - Mock Mode: `APOLLO_MOCK_ENRICHMENT=true` disables credit consumption for testing
  - Two-step flow: Search (free) → Bulk Enrich (credits via `/api/apollo/bulk-enrich`)

**Contact Data Enrichment:**
- **ContactOut** - Contact discovery and enrichment
  - SDK/Client: Custom HTTP client in `src/lib/enrichment/contactout.ts`
  - Auth: `CONTACTOUT_API_KEY` (server-only, sandbox only)
  - Circuit Breaker: Wrapped with circuit breaker in `src/lib/enrichment/contactout.ts`
  - Endpoint: `https://api.contactout.com/v1/people/enrich`
  - Input: Email or LinkedIn URL (`/in/` or `/pub/` format only - Sales Navigator not supported)
  - Output: Personal email, work email, phone number
  - Status: Sandbox API only (fake "Example Person" data) - requires sales contact for production

**Web Intelligence & Mentions:**
- **Exa.ai** - Web search with AI understanding
  - SDK/Client: Custom HTTP client in `src/lib/enrichment/exa.ts`
  - Auth: `EXA_API_KEY` (server-only)
  - Circuit Breaker: 15s timeout + circuit breaker in `src/lib/enrichment/exa.ts`
  - Endpoint: `https://api.exa.ai/search`
  - Input: Person name + company (quoted for exact match)
  - Output: News mentions, wealth signals (funding, IPO, board membership, etc)
  - Wealth Keywords: Tracks 10+ keywords (funding, acquisition, IPO, exit, billion, million, net worth, board, investor, raised)

**SEC Insider Transactions:**
- **SEC EDGAR** - SEC filings and insider transaction data
  - SDK/Client: Custom HTTP client in `src/lib/enrichment/edgar.ts`
  - Auth: `SEC_EDGAR_USER_AGENT` (server-only, format: "Company contact@email.com")
  - Rate Limiting: 10 requests/second via Upstash Redis (`sec-edgar:global`)
  - Circuit Breaker: 15s timeout, 60s reset
  - Endpoints:
    - Company tickers lookup: `https://www.sec.gov/files/company_tickers.json`
    - Submissions: `https://data.sec.gov/submissions/CIK{paddedCik}.json`
    - Form 4 documents: `https://www.sec.gov/Archives/edgar/data/{cik}/{accessionNo}/{primaryDoc}`
  - Data: Form 4 insider transactions (purchases, sales, awards)
  - Parsing: Regex-based XML extraction from Form 4 filings

**Market Data & Stock Prices:**
- **Finnhub** - Stock quotes and market data
  - SDK/Client: Custom HTTP client in `src/lib/enrichment/market-data.ts`
  - Auth: `FINNHUB_API_KEY` (server-only)
  - Endpoint: `https://finnhub.io/api/v1/quote`
  - Output: Current price, daily change, high/low, open/close
- **Yahoo Finance** - Historical stock data (free, no key required)
  - Endpoint: `https://query1.finance.yahoo.com/v8/finance/chart/{ticker}`
  - Range: 1 year daily closes (free, no API key)
  - Output: 251+ trading day closes for performance metrics

**AI & LLM Services:**
- **OpenRouter** - AI API aggregator (replaces direct Anthropic SDK)
  - SDK/Client: `@openrouter/ai-sdk-provider` 2.3.3 + AI SDK 6.0.141
  - Auth: `OPENROUTER_API_KEY` (server-only)
  - Endpoint: `https://openrouter.ai/api/v1/chat/completions`
  - Default Model: `anthropic/claude-3.5-haiku` (cost-efficient for high-volume)
  - Use Cases:
    - NL search parsing (Plan 05): `/api/search/parse-query`
    - Prospect summary generation (Plan 23): Intelligence dossier
    - Lookalike discovery analysis: `/api/search/lookalike`
  - Response: Text completion with token usage metadata

## Data Storage

**Databases:**
- **Supabase PostgreSQL** - Primary relational database
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only)
  - Client: `@supabase/supabase-js` 2.95.3 + `@supabase/ssr` 0.8.0
  - Auth: Supabase Auth (JWT tokens in session cookies)
  - Schema: Multi-tenant database with RLS (Row-Level Security) configured in dashboard
  - Key Tables:
    - `tenants` - Organization data
    - `users` - User accounts + role-based access
    - `personas` - Search filters + personas
    - `prospects` - Prospect records with enrichment status
    - `lists` - List collections
    - `list_members` - Prospect list membership
  - Enrichment Fields (JSONB):
    - `contact_data` - Email, phone (ContactOut)
    - `web_data` - Mentions, wealth signals (Exa)
    - `insider_data` - Form 4 transactions (SEC EDGAR)
    - `stock_snapshot` - Market data snapshot (Finnhub + Yahoo)
    - `intelligence_dossier` - Claude AI summary

**Caching:**
- **Upstash Redis** - Serverless Redis for caching + rate limiting
  - Connection: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - Client: `@upstash/redis` 1.36.2 (REST-based, no WebSocket)
  - Use Cases:
    - Cache: Apollo search results (v3, 24h TTL)
    - Rate Limiting: Apollo (tenant-based), SEC EDGAR (global 10 req/s)
  - Key Format: SHA256 hash of request parameters (see `src/lib/cache/keys.ts`)

## Authentication & Identity

**Auth Provider:**
- **Supabase Auth** - OAuth + email/password authentication
  - Implementation: JWT-based session cookies via `@supabase/ssr`
  - Middleware: `src/middleware.ts` protects routes, refreshes session
  - Token Storage: Secure HTTP-only cookies (browser can't access)
  - Public Routes: `/login`, `/signup`, `/auth/callback`
  - Redirect: Unauthenticated → `/login` with tenant slug in query params
  - RBAC: Role in `user.app_metadata.role` (super_admin, tenant_admin, user)
  - Multi-tenant: `user.app_metadata.tenant_id` for tenant isolation

## Monitoring & Observability

**Error Tracking:**
- Custom error logger in `src/lib/error-logger.ts` (logs to console + Supabase if configured)
- No external error service integrated (e.g., Sentry, Datadog)

**Logs:**
- Console logging throughout codebase (info, warn, error levels)
- Structured logs in API routes + Inngest functions
- Request IDs and correlation tracking in error context
- Activity logging via `src/lib/activity-logger.ts` (logs user actions to Supabase)

## CI/CD & Deployment

**Hosting:**
- Vercel - Auto-deploys on push to `main` branch
- Domain: `pgl-main.vercel.app` (preview domains for branches)

**CI Pipeline:**
- GitHub Actions - Pre-commit hooks enforced
- No explicit CI config file found (Vercel handles deployment)
- Inngest webhook verification via `INNGEST_SIGNING_KEY` on production

## Environment Configuration

**Required Environment Variables:**

**Client-Accessible:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (safe for client)
- `NEXT_PUBLIC_APP_URL` - App URL for internal API calls (default: http://localhost:3000)

**Server-Only (Never client-side):**
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (RLS bypass)
- `UPSTASH_REDIS_REST_URL` - Redis connection URL
- `UPSTASH_REDIS_REST_TOKEN` - Redis auth token
- `APOLLO_API_KEY` - Apollo.io API key
- `APOLLO_MOCK_ENRICHMENT` - Optional: "true" to mock enrichment (no credits)
- `OPENROUTER_API_KEY` - OpenRouter AI API key
- `CONTACTOUT_API_KEY` - ContactOut API key
- `EXA_API_KEY` - Exa.ai API key
- `SEC_EDGAR_USER_AGENT` - SEC User-Agent header (format: "Company contact@email.com")
- `FINNHUB_API_KEY` - Finnhub API key
- `INNGEST_SIGNING_KEY` - Webhook signature verification
- `INNGEST_EVENT_KEY` - Event API access token

**Secrets Location:**
- Development: `.env.local` (git-ignored, never committed)
- Production: Vercel Environment Variables (encrypted at rest)
- Template: `.env.example` (checked in for reference)

## Webhooks & Callbacks

**Incoming:**
- **Inngest Webhook** - Event ingestion for background jobs
  - Endpoint: `/api/inngest`
  - Verification: `INNGEST_SIGNING_KEY` validates webhook signature
  - Functions: `enrichProspect`, `aggregateDailyMetrics`

**Outgoing:**
- None configured (no outbound webhooks to external services)

## API Route Integration Points

**Search & Apollo:**
- `POST /api/search/apollo` - Search Apollo.io with persona or filters
- `POST /api/apollo/bulk-enrich` - Trigger enrichment for selected prospects
- `POST /api/search/parse-query` - Parse natural language query using OpenRouter

**Prospects:**
- `POST /api/prospects/upsert` - Create/update prospect records
- `POST /api/prospects/add-to-list` - Add prospect to list
- `POST /api/prospects/[prospectId]/enrich` - Manual re-enrich prospect
- `GET /api/prospects/[prospectId]/market-data` - Fetch stock data (Finnhub)

**Research & Intelligence:**
- `POST /api/prospects/[prospectId]/research` - Fetch Exa web intelligence
- `POST /api/prospects/[prospectId]/research/multi-source` - Multi-step enrichment (ContactOut + Exa + SEC)
- `POST /api/prospects/[prospectId]/research/suggestions` - AI-powered research suggestions

**Analytics:**
- `POST /api/admin/research` - Research endpoint for admin analysis (likely AI-powered)

---

*Integration audit: 2026-04-05*
