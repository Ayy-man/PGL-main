# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Real estate teams can quickly find and qualify wealthy prospects by searching structured lead databases, enriching profiles with personal contact info and wealth signals, and organizing prospects into actionable lists.

**Current focus:** Phase 4 - Super Admin Health Dashboard

## Current Position

Phase: 4 of 4 (Super Admin Health Dashboard)
Plan: 4 of 4 (at checkpoint:human-verify — admin page refactored, awaiting visual verification)
Status: In Progress — Plans 01, 02, 03, and 04 Task 1 complete
Last activity: 2026-02-25 — Plan 04-04 Task 1 complete: admin page refactored to Client Component with 60s polling, parallel Promise.all fetching, "Updated Xs ago" timestamp, and 4 composed sections

Progress: [██████████] 98% (77/79 requirements)

## Performance Metrics

**Velocity:**
- Total plans completed: 23
- Average duration: ~7 min
- Total execution time: ~2.9 hours (~175 min)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 1 | 7 | 40 min | 6 min |
| Phase 2 | 7 | 51 min | 7 min |
| Phase 3 | 9 | ~85 min | ~9 min |
| Phase 04 P01 | 3 | 2 tasks | 7 files |
| Phase 04 P02 | 3 | 2 tasks | 6 files |
| Phase 04 P03 | 3 | 2 tasks | 7 files |
| Phase 04 P04 | 5 | 1 tasks | 1 files |

### Phase 3 Plan Completion

| Plan | Name | Status |
|------|------|--------|
| 03-01 | Enrichment Pipeline | Complete |
| 03-02 | Background Jobs (Inngest) | Complete |
| 03-03 | Activity Logging | Complete |
| 03-04 | CSV Export | Complete |
| 03-05 | AI Lead Summaries | Complete |
| 03-06 | Usage Metrics Aggregation | Complete |
| 03-07 | Lookalike Discovery | Complete |
| 03-08 | Admin & Settings | Complete |
| 03-09 | Polish & Deploy | Complete |

## Infrastructure

- **Vercel:** Linked — https://pgl-main.vercel.app (env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- **Supabase:** Connected — gsociuxkotdiarrblwnf.supabase.co
- **GitHub:** git@github.com:Ayy-man/PGL-main.git
- **Still needed:** SUPABASE_SERVICE_ROLE_KEY, UPSTASH_REDIS_REST_URL/TOKEN, APOLLO_API_KEY, CONTACTOUT_API_KEY, EXA_API_KEY, ANTHROPIC_API_KEY

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Apollo.io as primary lead source (structured filters map to personas)
- Supabase RLS for tenant isolation (database-level enforcement)
- Claude Haiku for AI summaries (cost-efficient for high-volume)
- Lazy enrichment strategy (reduces API costs)
- Dark theme with gold accents (luxury brand positioning)
- Lookalike Discovery in v1 (Adrian loved it — AI persona generation from prospect profile)
- Usage Metrics Dashboard in v1 (critical for 6-month renewal proof)
- CRM integration OUT — CSV export only, teams import themselves
- Expanded activity logging to 11 action types

**From Phase 1 (Foundation):**
- OKLCH color space throughout (better perceptual uniformity)
- Lazy env validation for dev builds without all secrets
- @supabase/ssr for SSR clients, separate admin client with service role key
- getUser() not getSession() for JWT validation (security best practice)
- Role and tenant_id from app_metadata (immutable, server-side only)
- Force dark theme via className="dark" on html element
- Playfair Display for headings, Inter for body
- Next.js 15 async params pattern: params: Promise<{}>
- createAdminClient() bypasses RLS for admin operations

**From Phase 2 (Persona + Search + Lists):**
- Upstash Redis REST API for Edge compatibility
- buildCacheKey enforces tenant prefix on all cache keys
- 100 Apollo API calls per hour per tenant (sliding window)
- Circuit breaker at 50% failure rate, 30s reset
- Tenant ID always from session app_metadata, never URL params
- Starter personas are read-only (filter by is_starter = false)
- Vitest for testing (ESM-native, fast)
- 24-hour cache TTL on search results
- Debounced auto-save on notes (1s delay)
- nuqs for shareable/bookmarkable search URLs
- Reusable DataTable<TData, TValue> with manual pagination/sorting
- work_email as primary deduplication key, linkedin_url as fallback
- Promise.allSettled for idempotent multi-list adds
- All routes consolidated under src/app/[orgId]/ (no route groups)

**From Phase 3 (Enrich + Ship):**
- Activity logger uses service role client for writes (bypasses RLS, called from validated server actions)
- Activity query API uses session client for reads (automatic RLS tenant scoping)
- Activity logging never throws - fire-and-forget pattern returns null on failure
- Admin API endpoints check role via user.app_metadata.role
- opossum for circuit breaker implementation (Node.js standard, battle-tested)
- 50% error threshold, 30s reset for general APIs; 15s timeout for slow endpoints
- Regex-based Form 4 XML parsing (avoids heavy XML parser dependencies)
- SEC EDGAR rate limiting at 150ms between requests (under 10/sec limit)
- Simplified wealth signal extraction via keyword matching
- Batch size 100 for CSV exports balances memory usage and query efficiency
- UTF-8 BOM required for Excel to correctly interpret international characters
- ReadableStream for streaming large CSV exports without loading entire dataset into memory
- Claude prompt engineering for structured JSON output (SDK compatibility over strict schema)
- Apollo /v1/mixed_people/search for lookalike discovery (self-contained, different from persona search)
- is_generated flag distinguishes AI-generated personas from manual ones
- [Phase 03]: In-memory aggregation in Inngest function instead of SQL RPC due to Supabase JS client limitations
- [Phase 03]: Admin client for super_admin analytics queries (cross-tenant access), session client for tenant_admin (RLS-scoped)
- [Phase 04]: Fire-and-forget quota tracking (.catch(() => {})) ensures enrichment pipeline never blocked by Redis failures
- [Phase 04]: 90-day TTL on api_usage Redis keys; key pattern api_usage:{provider}:{YYYY-MM-DD} for per-day aggregation
- [Phase 04]: Backward-compatible JSONB: enrichment_source_status stores { status, error?, at } objects; old string values remain valid
- [Phase 04]: Inline super_admin auth check in Route Handlers (not requireSuperAdmin) to avoid redirect() 500 in Route Handler context
- [Phase 04]: In-memory aggregation for admin analytics queries due to Supabase JS GROUP BY limitation
- [Phase 04]: Backward-compat enrichment_source_status: handle both string and object entries in all admin API routes
- [Phase 04]: getHeatmapClass uses relative-to-peers ranking (sorted non-zero array percentile) — no hardcoded activity thresholds
- [Phase 04]: New tenant detection in heatmap: all 7d metrics zero = "New" badge (text-muted-foreground), not red warning
- [Phase 04]: FunnelChart memoizes both data array and Cell elements separately — prevents Recharts color reconciliation bug on re-renders
- [Phase 04]: OKLCH gold-adjacent palette for enrichment chart: graduated lightness 0.84→0.63 for success, warm red 0.52→0.35 for failures
- [Phase 04]: useRef(errorPage) pattern captures pagination state in fetchAll closure without stale closure bugs

### Roadmap Evolution

- Phase 4 added: Super admin health dashboard — platform pulse, tenant heatmap, enrichment pipeline health, API quota tracking, funnel analytics, error feed

### Pending Todos

- Supabase Dashboard: Register Auth Hook function (deferred — user hasn't set up Supabase yet)
- Supabase Dashboard: Enable Connection Pooling in transaction mode (deferred — same reason)
- Upstash Redis: Create database and add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env.local
- Apollo.io: Add APOLLO_API_KEY to .env.local for search functionality
- ContactOut: Add CONTACTOUT_API_KEY to .env.local for personal contact enrichment
- Exa.ai: Add EXA_API_KEY to .env.local for web presence and wealth signal enrichment
- SEC EDGAR: Add SEC_EDGAR_USER_AGENT to .env.local (format: "AppName admin@email.com")

### Blockers/Concerns

**External Services Not Configured:**
- Supabase project not set up (required for all database operations)
- Upstash Redis not set up (required for caching and rate limiting)
- Apollo.io API key not configured (required for search)
- These don't block code development but are needed for E2E testing and production

**Build Verification Environment Issue (RESOLVED):**
- pnpm node_modules corruption resolved during code review (2026-02-25)
- Build compiles clean, all tests pass
- No remaining build issues

### Comprehensive Code Review (2026-02-25)

A full-codebase code review was conducted on 2026-02-25 with 4 parallel verification agents. Results:

**18 issues identified and fixed:**
- 5 Critical: RLS policy alignment (tenant_id column naming mismatch), enrichment trigger authentication (missing service role client), middleware slug resolution (orgId param routing), persona creation (column name migration to match schema), security headers (missing CSP and security response headers)
- 8 Important: API route fixes, type safety improvements, missing error handling, middleware enhancements
- 5 Suggestions: Code cleanup, consistency improvements, minor optimizations

**Verification:** All fixes verified by 4 parallel verification agents. Build compiles clean (`next build` succeeds), all tests pass (`vitest run` green), no TypeScript errors.

**Key fixes:**
- RLS policy alignment — ensured all policies reference correct `tenant_id` column names
- Enrichment trigger auth — switched to service role client for background enrichment writes
- Middleware slug resolution — fixed orgId parameter routing through Next.js middleware
- Persona creation — migrated column names to match current database schema
- Column name migration — aligned all queries with actual Supabase table definitions
- Security headers — added CSP, X-Frame-Options, and other security response headers

## Remaining Work

All 3 phases and 23 plans are complete. The following items remain before production launch:

- **E2E testing with real API keys** — Apollo, ContactOut, Exa, SEC EDGAR, and Anthropic API keys needed for integration testing
- **Tenant theming wiring** — CSS custom properties are defined but not yet connected to per-tenant theme configuration
- **Test coverage expansion** — Only 1 test file exists (vitest setup is in place); unit and integration tests needed across modules
- **Property data integration** — ATTOM API for property/wealth signals deferred to v2

## Session Continuity

Last session: 2026-02-25 (Phase 4, Plan 04 execution)
Stopped at: 04-04-PLAN.md Task 1 complete — checkpoint:human-verify at Task 2 (visual dashboard verification at http://localhost:3000/admin)

---

*Phase 4 at final checkpoint. After visual verification: Phase 4 complete — all 4 plans done.*
