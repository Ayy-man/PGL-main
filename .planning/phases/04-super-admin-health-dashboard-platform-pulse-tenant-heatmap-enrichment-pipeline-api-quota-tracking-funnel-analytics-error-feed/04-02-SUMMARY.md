---
phase: 04-super-admin-health-dashboard-platform-pulse-tenant-heatmap-enrichment-pipeline-api-quota-tracking-funnel-analytics-error-feed
plan: "02"
subsystem: api
tags: [nextjs, supabase, route-handlers, super-admin, dashboard, analytics]

# Dependency graph
requires:
  - phase: 03-enrich-ship
    provides: enrichment_source_status JSONB schema, activity_log action types, usage_metrics_daily table
  - phase: 04-super-admin-health-dashboard
    provides: 04-01 Redis INCR instrumentation design (quota endpoint shell)
provides:
  - "GET /api/admin/dashboard — platform pulse stats (prospect counts, enrichment coverage, active users)"
  - "GET /api/admin/tenants/activity — tenant heatmap with 7d aggregates and inline per-user breakdown"
  - "GET /api/admin/quota — Coming Soon shell for Redis-backed API quota tracking"
  - "GET /api/admin/enrichment/health — per-source daily success/fail breakdown for 4 enrichment providers"
  - "GET /api/admin/funnel — 4-stage search-to-export funnel counts from activity_log"
  - "GET /api/admin/errors — paginated failed enrichments with per-source details and user/tenant joins"
affects:
  - "04-03 — UI components will consume all 6 of these endpoints"
  - "04-04 — final dashboard page wires UI to these routes"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline super_admin auth check in Route Handlers (not requireSuperAdmin, which calls redirect)"
    - "createAdminClient() for all cross-tenant reads (bypasses RLS)"
    - "force-dynamic on all admin API routes"
    - "In-memory aggregation for GROUP BY operations (Supabase JS limitation)"
    - "Array.from(new Set()) for deduplication (TypeScript ES target compat)"
    - "Backward-compat enrichment_source_status handling: string | object"

key-files:
  created:
    - src/app/api/admin/dashboard/route.ts
    - src/app/api/admin/tenants/activity/route.ts
    - src/app/api/admin/quota/route.ts
    - src/app/api/admin/enrichment/health/route.ts
    - src/app/api/admin/funnel/route.ts
    - src/app/api/admin/errors/route.ts
  modified: []

key-decisions:
  - "Inline super_admin auth check (not requireSuperAdmin) because requireSuperAdmin calls redirect() which can 500 in Route Handlers"
  - "In-memory aggregation for tenant metrics and funnel — Supabase JS client does not support GROUP BY + COUNT natively"
  - "Array.from(new Set()) instead of [...new Set()] for TypeScript compatibility with current tsconfig target"
  - "Backward-compat enrichment_source_status: handle both string entries ('complete'/'failed') and object entries ({status, error, at})"
  - "Quota endpoint returns Coming Soon shell — Redis INCR instrumentation not yet deployed"
  - "Errors endpoint is view-only (no POST/PUT for re-trigger per DESIGN.md locked decision)"
  - "Funnel capped at 10,000 rows per query to prevent memory issues"
  - "Last-active query limited to 90-day window to limit partition scan on activity_log"

patterns-established:
  - "Admin API auth pattern: createClient() + getUser() + app_metadata.role check + 403 response"
  - "All 6 admin routes follow identical auth + force-dynamic + createAdminClient() structure"

requirements-completed:
  - "DESIGN.md Section: API Endpoints Needed (all 6 new routes)"
  - "DESIGN.md Section: Platform Pulse (data source queries)"
  - "DESIGN.md Section: Tenant Activity Heatmap (aggregated data)"
  - "DESIGN.md Section: Enrichment Pipeline Health graph (per-source breakdown)"
  - "DESIGN.md Section: Search-to-Export Funnel graph (activity_log aggregation)"
  - "DESIGN.md Section: Error/Failure Feed (failed enrichment query)"
  - "DESIGN.md Section: Coming Soon Cards (API Quota shell)"

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 4 Plan 02: Admin Health Dashboard API Routes Summary

**6 super-admin-only Route Handlers returning platform pulse stats, tenant heatmap, enrichment source health, funnel analytics, error feed, and quota shell via createAdminClient() cross-tenant queries**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-24T23:55:10Z
- **Completed:** 2026-02-24T23:58:00Z
- **Tasks:** 2
- **Files modified:** 6 (all created)

## Accomplishments

- Created all 6 admin API routes listed in DESIGN.md with consistent auth pattern (inline super_admin check, 403 on fail, force-dynamic, createAdminClient)
- Dashboard route aggregates prospects, activity_log, and usage_metrics_daily into 5 platform pulse metrics
- Tenant activity route performs 5-query in-memory join to produce tenant heatmap with per-user breakdown sorted by 7d searches
- Enrichment health route handles both legacy string and new object enrichment_source_status entries for backward compatibility
- Error feed route joins users and tenants tables in-memory for user/tenant name resolution with pagination

## Task Commits

Each task was committed atomically:

1. **Task 1: Create dashboard, tenants/activity, and quota API routes** - `00a434d` (feat)
2. **Task 2: Create enrichment/health, funnel, and errors API routes** - `44473ca` (feat)

## Files Created/Modified

- `src/app/api/admin/dashboard/route.ts` — Platform pulse stats: total prospects, enrichment coverage %, failed count, active users today, 7d avg
- `src/app/api/admin/tenants/activity/route.ts` — Tenant heatmap: 7d searches/enrichments/exports per tenant + per-user breakdown
- `src/app/api/admin/quota/route.ts` — Coming Soon shell for Redis-backed API quota tracking
- `src/app/api/admin/enrichment/health/route.ts` — Per-source daily success/fail breakdown for contactout, exa, edgar, claude
- `src/app/api/admin/funnel/route.ts` — 4-stage funnel: Searches → Profile Views → Enrichments → Exports from activity_log
- `src/app/api/admin/errors/route.ts` — Paginated failed enrichments with per-source details, userName, tenantName via in-memory joins

## Decisions Made

- Inline super_admin auth check instead of `requireSuperAdmin()` — the helper calls `redirect()` which can 500 in Route Handler context
- In-memory aggregation for all GROUP BY operations — Supabase JS client does not expose GROUP BY / COUNT natively
- `Array.from(new Set())` for deduplication — `[...new Set()]` spread fails with current TypeScript tsconfig target (auto-fixed)
- Backward-compatible `enrichment_source_status` parsing: handle both `"complete"/"failed"` string entries and `{ status, error, at }` object entries
- Quota route is a view-only Coming Soon shell — no POST/PUT; Redis instrumentation is a future step
- Errors route is view-only per DESIGN.md locked decision (no re-trigger button)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Array.from(new Set()) instead of spread syntax**
- **Found during:** Task 2 (errors route TypeScript compilation)
- **Issue:** `[...new Set()]` spread of Set<string> fails with TypeScript error TS2802 when downlevelIteration is not enabled
- **Fix:** Replaced both Set spreads in errors/route.ts with `Array.from(new Set(...))`
- **Files modified:** src/app/api/admin/errors/route.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 44473ca (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Minor TypeScript compatibility fix, no scope creep, no behavior change.

## Issues Encountered

None — all 6 routes compiled cleanly after the TypeScript Set spread fix.

## User Setup Required

None - no external service configuration required for these API routes. All queries use existing Supabase tables.

Note: API quota route (`/api/admin/quota`) returns Coming Soon until Redis INCR instrumentation is deployed (separate task per DESIGN.md).

## Next Phase Readiness

- All 6 admin API endpoints are available for UI consumption in Plans 03 and 04
- Response shapes are stable and documented in this summary
- TypeScript compiles clean with zero errors
- No blockers for dashboard UI implementation

---
*Phase: 04-super-admin-health-dashboard*
*Completed: 2026-02-25*
