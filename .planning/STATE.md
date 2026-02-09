# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Real estate teams can quickly find and qualify wealthy prospects by searching structured lead databases, enriching profiles with personal contact info and wealth signals, and organizing prospects into actionable lists.

**Current focus:** Phase 3 - Enrich + Ship

## Current Position

Phase: 3 of 3 (Enrich + Ship)
Plan: 6 of 9 (completed)
Status: In progress
Last activity: 2026-02-09 — Completed 03-06 (Usage Metrics Aggregation)

Progress: [████████░░] 75% (63/79 requirements)

## Performance Metrics

**Velocity:**
- Total plans completed: 18
- Average duration: 7 min
- Total execution time: 2.1 hours (130 min)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 1 | 7 | 40 min | 6 min |
| Phase 2 | 7 | 51 min | 7 min |
| Phase 3 | 4 | 39 min | 10 min |

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

**Build Verification Environment Issue:**
- pnpm node_modules corrupted (03-02 execution)
- Pre-existing inngest files from incomplete work caused symlink issues
- Multiple reinstall attempts failed
- Code itself is correct and committed
- Recommend fresh workspace or system-level pnpm repair for full build verification

## Session Continuity

Last session: 2026-02-09 (Phase 3 in progress)
Stopped at: Completed 03-06-PLAN.md (Usage Metrics Aggregation)
Resume file: None

---

*Next action: `/gsd:execute-plan 03-07` or `/gsd:execute-plan 03-09` to continue Phase 3 (Enrich + Ship)*
