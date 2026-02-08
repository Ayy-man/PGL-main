# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Real estate teams can quickly find and qualify wealthy prospects by searching structured lead databases, enriching profiles with personal contact info and wealth signals, and organizing prospects into actionable lists.

**Current focus:** Phase 2 - Persona + Search + Lists (all existing plans executed)

## Current Position

Phase: 2 of 3 (Persona + Search + Lists)
Plan: 6 of 7 executed (02-07 remaining)
Status: In progress
Last activity: 2026-02-08 — Completed 02-06-PLAN.md (Search-to-Lists Integration)

Progress: [██████░░░░] 60% (48/79 requirements)

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 6 min
- Total execution time: 1.35 hours (81 min)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 1 | 7 | 40 min | 6 min |
| Phase 2 | 6 | 41 min | 7 min |
| Phase 3 | 0 | — | — |

**Recent Trend:**
- Last 5 plans: 02-02 (5min), 02-03 (3min), 02-04 (7min), 02-05 (4min), 02-06 (16min)
- Trend: Slight slowdown on 02-06 due to integration complexity, still strong velocity

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

**From 01-01 (Types and Color System):**
- Use OKLCH color space throughout (no hsl() wrappers) for better perceptual uniformity
- Lazy env validation to allow dev builds without all secrets present
- Role hierarchy with numeric comparison for privilege checks

**From 01-02 (Data Access Foundation):**
- Use @supabase/ssr for all non-admin clients (official Next.js SSR pattern)
- Separate admin client using service role key (bypasses RLS, server-only)
- Mandatory tenant prefix on all cache keys via getTenantCacheKey helper
- Redis singleton pattern for connection reuse across requests

**From 01-04 (Authentication System):**
- Use getUser() not getSession() for JWT validation (security best practice)
- Extract role and tenant_id from app_metadata not user_metadata
- All session utilities are server-side async functions for RSC
- Role-based redirect after login (super_admin → /admin, tenant → /{tenantId})
- Plain HTML inputs with Tailwind classes (no shadcn components yet)

**From 01-05 (Multi-tenant Middleware):**
- Use getUser() not getSession() for session refresh (security best practice)
- Extract tenant ID from URL path and inject as x-tenant-id header
- Super admin can access all tenant routes, regular users only their tenant
- Public routes bypass auth but still refresh session
- Zod schemas export both schema and inferred type with email normalization

**From 01-06 (UI Shell):**
- Force dark theme via className="dark" on html element (no flash of light)
- Playfair Display for headings (font-serif), Inter for body (font-sans)
- Tenant lookup by slug not UUID (URL readability)
- Next.js 15 async params pattern: params: Promise<{}>
- Tenant branding colors injected via CSS custom properties
- 5 core navigation items: Search, Lists, Personas, Activity, Analytics

**From 01-07 (Super Admin Panel):**
- Use createAdminClient() (service role) for all admin operations to bypass RLS
- Set role and tenant_id in app_metadata during user creation (immutable, server-side only)
- Generate temp password for new users instead of email invite flow
- Rollback auth user creation if profile insert fails
- Admin panel uses isolated layout (no tenant sidebar)
- Server Actions pattern: guard → validate → admin client → mutate → revalidate

**From 02-01 (Infrastructure Layer):**
- Use Upstash Redis REST API for serverless Edge compatibility
- Enforce tenant prefix on all cache keys via buildCacheKey with CacheKeyParams interface
- 100 Apollo API calls per hour per tenant with sliding window rate limiting
- Circuit breaker opens at 50% failure rate, resets after 30 seconds
- Apollo API uses X-Api-Key header (not Authorization Bearer)
- Redis singleton pattern prevents connection leaks

**From 02-02 (Persona Builder):**
- Tenant ID always extracted from session app_metadata, never from URL params
- Starter personas are read-only (UI hides edit/delete buttons, queries filter by is_starter = false)
- Form uses comma-separated inputs for array fields instead of multi-select
- Filter summary truncates to 3 items with "+ N more" for compact display
- Defense-in-depth tenant scoping: RLS at database + explicit tenant_id filters in queries

**From 02-03 (Apollo Search API):**
- Vitest for test framework (ESM-native, fast startup, Next.js compatible)
- Pagination capped at 500 pages (Apollo API hard limit)
- Search results cached for 24 hours (balance freshness vs API cost reduction)
- Fire-and-forget updatePersonaLastUsed (don't block search response)
- Empty arrays and empty strings excluded from Apollo API params (cleaner requests)
- Custom error classes for domain-specific errors (RateLimitError, ApolloApiError)
- TDD workflow: RED (failing tests) → GREEN (passing implementation) → REFACTOR (cleanup)

**From 02-04 (List Management System):**
- Debounced auto-save on notes field (1-second delay to reduce server load)
- Status badge color progression: New (blue) → Contacted (yellow) → Responded (green) / Not Interested (red)
- Member count cached on lists table (updated via triggers, faster than COUNT(*) queries)
- Supabase JOIN relations return arrays not objects (extract first element after fetch)
- Supabase doesn't support column aliasing (map response after fetch to match interfaces)
- Type Supabase responses with local types before mapping (avoid `any` for type safety)

**From 02-05 (Search Results UI):**
- Server component fetches data, client wrapper manages URL state and rendering
- nuqs useQueryStates for shareable/bookmarkable search URLs (persona, page, sortBy, sortOrder)
- Page param 1-indexed in URL, 0-indexed internally for TanStack Table
- AbortController cancels previous in-flight requests on new search
- 100ms debounce on search execution prevents double-fires from URL state updates
- Reusable DataTable<TData, TValue> component with manualPagination and manualSorting

**From 02-06 (Search-to-Lists Integration):**
- work_email as primary deduplication key, linkedin_url as fallback (aligns with database schema)
- Prospect upsert with smart onConflict selection based on available fields
- Promise.allSettled for multi-list adds with "already in list" treated as success (idempotent)
- Column definition as function createColumns(lists, orgId) for closures in TanStack Table
- Apollo field mapping centralized in upsertProspectFromApollo (location concatenation, phone extraction)
- Database uses work_email/personal_email split for enrichment tracking (not single email field)
- Toast notifications via shadcn toast system with global Toaster in root layout

### Pending Todos

- Supabase Dashboard: Register Auth Hook function (deferred — user hasn't set up Supabase yet)
- Supabase Dashboard: Enable Connection Pooling in transaction mode (deferred — same reason)
- Upstash Redis: Create database and add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env.local
- Apollo.io: Add APOLLO_API_KEY to .env.local for search functionality

### Blockers/Concerns

**Deferred from Phase 1:**
- Auth Hook registration requires Supabase project setup (manual Dashboard task)
- Connection Pooling configuration requires Supabase project setup (manual Dashboard task)
- These don't block Phase 2 development but are needed before production deployment

## Session Continuity

Last session: 2026-02-08 (Phase 2, plan 06 completed)
Stopped at: Completed 02-06-PLAN.md (Search-to-Lists Integration)
Resume file: None

**Phase 2 Status:**
- Plans 02-01 through 02-06: Complete
- Plan 02-07: E2E verification checkpoint (pending)
- Core functionality: LIST-03 requirement now fulfilled (Add to List from search results)

---

*Next action: Execute plan 02-07 (E2E verification) or proceed to Phase 3*
