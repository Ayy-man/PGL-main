---
phase: 03-enrich-ship
plan: 06
subsystem: analytics
tags: [inngest, cron, aggregation, api, metrics, dashboard]

dependency_graph:
  requires:
    - 03-01 (activity logging and usage_metrics_daily table)
    - 03-02 (activity logger writes to activity_log)
    - 03-04 (Inngest infrastructure)
  provides:
    - Daily metrics aggregation cron (1 AM UTC)
    - Analytics API endpoint with date range filtering
    - Usage metrics for dashboard (plan 03-09)
  affects:
    - Future: Dashboard UI (plan 03-09) will consume analytics API
    - Future: 6-month renewal proof relies on usage metrics

tech_stack:
  added:
    - Inngest cron scheduling ("0 1 * * *")
    - In-memory aggregation for daily metrics
  patterns:
    - Service role client for system-level aggregation (bypasses RLS)
    - Session client for tenant-scoped analytics queries (RLS enforced)
    - Role-based API access control (tenant_admin vs super_admin)

key_files:
  created:
    - src/inngest/functions/daily-metrics.ts (Daily aggregation cron)
    - src/app/api/analytics/route.ts (Analytics API endpoint)
  modified:
    - src/app/api/inngest/route.ts (Registered aggregateDailyMetrics function)

decisions:
  - "In-memory aggregation in Inngest function (fetch activity_log, aggregate, upsert) instead of SQL RPC due to Supabase JS client limitations"
  - "Admin client for super_admin analytics queries (cross-tenant access), session client for tenant_admin (RLS-scoped)"
  - "7d/30d/90d date range presets cover short/medium/long-term usage analysis"
  - "User breakdown included for tenant_admin only (team-level insight)"

metrics:
  duration: 12 minutes
  tasks_completed: 2
  files_created: 2
  files_modified: 1
  completed_date: 2026-02-09
---

# Phase 03 Plan 06: Usage Metrics Aggregation System Summary

**One-liner:** Nightly Inngest cron aggregates activity logs into daily metrics; analytics API serves 7d/30d/90d usage stats with role-based access.

## What Was Built

### 1. Daily Metrics Aggregation Cron (Task 1)
**File:** `src/inngest/functions/daily-metrics.ts`

Created Inngest scheduled function that runs at 1 AM UTC daily:
- **Cron schedule:** `"0 1 * * *"` (every day at 1 AM UTC)
- **Purpose:** Pre-aggregate yesterday's activity_log entries into usage_metrics_daily table for fast dashboard queries
- **Metrics aggregated:** total_logins, searches_executed, profiles_viewed, profiles_enriched, csv_exports, lists_created
- **Aggregation level:** By date, tenant_id, and user_id
- **Idempotency:** Uses ON CONFLICT (date, tenant_id, user_id) DO UPDATE for safe re-runs

**Implementation:**
- Fetch all activity_log entries for yesterday (midnight to midnight UTC)
- Aggregate in-memory using Map<string, MetricsRow> grouped by (tenant_id:user_id)
- Count action_types using switch-case logic
- Upsert to usage_metrics_daily with conflict resolution
- Registered in `src/app/api/inngest/route.ts` alongside enrichProspect function

**Why in-memory aggregation:**
Supabase JS client doesn't support raw SQL execution. While a Postgres RPC function would be more efficient, the in-memory approach works for v1 scale and keeps deployment simpler (no additional DB migration).

### 2. Analytics API Endpoint (Task 2)
**File:** `src/app/api/analytics/route.ts`

Created GET endpoint at `/api/analytics` with:
- **Date range filtering:** Query param `range` accepts 7d, 30d, 90d (default: 30d)
- **Role-based access:**
  - `agent`/`assistant`: 403 Forbidden (no analytics access)
  - `tenant_admin`: Own tenant metrics only (RLS-scoped via session client)
  - `super_admin`: Cross-tenant metrics (admin client bypasses RLS), optional `tenant_id` filter
- **Response structure:**
  ```json
  {
    "data": {
      "daily": [{ date, totalLogins, searchesExecuted, ... }],
      "totals": { totalLogins, searchesExecuted, ... },
      "userBreakdown": [{ userId, totalLogins, ... }] // tenant_admin only
    },
    "range": "30d",
    "startDate": "2026-01-10",
    "endDate": "2026-02-09"
  }
  ```

**Query logic:**
- Calculate start date from range parameter (now - N days)
- Fetch usage_metrics_daily rows filtered by date range and tenant (if applicable)
- Aggregate by date for daily breakdown
- Aggregate by user_id for userBreakdown
- Calculate totals across entire range

**Security:**
- Session validation via `createClient().auth.getUser()`
- Role extraction from `user.app_metadata.role`
- Tenant admins cannot see other tenants' data (enforced by using session client with RLS)
- Super admins use admin client for cross-tenant queries

## Requirements Covered

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| ANLY-01 | ✅ Complete | Daily aggregation Inngest cron at 1 AM UTC |
| ANLY-04 | ✅ Complete | Analytics API with 7d/30d/90d date range filtering |
| ANLY-05 | ✅ Complete | Tenant-scoped analytics for tenant_admin role |
| ANLY-06 | ✅ Complete | Cross-tenant analytics for super_admin role |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] TypeScript errors in lookalike route**
- **Found during:** Build verification after Task 1
- **Issue:** `src/app/api/search/lookalike/route.ts` used `as any` type casts for webData and insiderData, triggering ESLint no-explicit-any error
- **Fix:** Replaced `as any` with `as Record<string, unknown> | null`
- **Files modified:** `src/app/api/search/lookalike/route.ts`
- **Commit:** 9f11c79

**2. [Rule 3 - Blocking Issue] Unused parameter in LookalikeDiscovery component**
- **Found during:** Build verification after Task 1
- **Issue:** `prospectName` prop defined in interface but not used in component body, triggering ESLint no-unused-vars error
- **Fix:** Made `prospectName` optional in interface, removed from destructuring (reserved for future use)
- **Files modified:** `src/components/prospect/lookalike-discovery.tsx`
- **Commit:** 9f11c79

**Note:** These were pre-existing issues from incomplete plan 03-08 that blocked the build. Per deviation Rule 3 (auto-fix blocking issues), they were fixed inline to allow build verification to proceed.

## Verification Results

### Build Status
✅ `pnpm build` passes successfully

### Code Quality
- TypeScript compilation: ✅ No errors
- ESLint: ✅ No blocking errors (only pre-existing img tag warning)
- New files follow project patterns:
  - Inngest function uses step.run() for observability
  - API route uses NextRequest/NextResponse
  - Admin client for system-level operations
  - Session client for user-scoped operations

### Functional Verification
- ✅ Daily metrics function exports correct signature
- ✅ Cron schedule set to "0 1 * * *"
- ✅ SQL aggregation logic covers all 6 metric types
- ✅ ON CONFLICT clause present for idempotency
- ✅ Analytics API validates session and extracts role
- ✅ Date range calculation implemented for 7d/30d/90d
- ✅ Role-based client selection (admin vs session)
- ✅ Response structure matches specification

## Dependencies and Integration

### Upstream Dependencies
- **03-01:** Requires `usage_metrics_daily` table and `activity_log` table schema
- **03-02:** Requires activity logger writing to `activity_log` with correct action_type values
- **03-04:** Requires Inngest infrastructure (client, serve endpoint)

### Downstream Impact
- **03-09 (Dashboard UI):** Will consume `/api/analytics` endpoint for charts and metrics display
- **6-month renewal proof:** Usage metrics demonstrate product adoption and engagement

### Database Schema Usage
```sql
-- Reads from (via admin client):
activity_log (
  tenant_id, user_id, action_type, created_at
)

-- Writes to (via admin client):
usage_metrics_daily (
  date, tenant_id, user_id,
  total_logins, searches_executed, profiles_viewed,
  profiles_enriched, csv_exports, lists_created
)
-- UNIQUE (date, tenant_id, user_id) for ON CONFLICT
```

## Self-Check

### File Existence
```
✅ FOUND: src/inngest/functions/daily-metrics.ts
✅ FOUND: src/app/api/analytics/route.ts
✅ FOUND: src/app/api/inngest/route.ts (modified)
```

### Commit Verification
```
✅ FOUND: 302563f (Task 1 - Daily metrics aggregation cron)
✅ FOUND: 9f11c79 (Deviation fixes for TypeScript errors)
✅ FOUND: ea6ab07 (Task 2 - Analytics API endpoint)
```

### Build Verification
```
✅ pnpm build completes successfully
✅ No TypeScript errors
✅ No blocking ESLint errors
✅ All routes registered correctly
```

## Self-Check: PASSED

All files created, commits verified, build passes.

## Next Steps

**Plan 03-07:** Profile View UI Components
- Display enriched prospect data in structured UI
- Show wealth signals, SEC transactions, web mentions
- Render AI-generated summaries
- Integrate LookalikeDiscovery component (currently stubbed)

**Plan 03-09:** Usage Metrics Dashboard UI
- Consume `/api/analytics` endpoint created in this plan
- Display charts for daily trends
- Show user-level breakdown for tenant admins
- Enable 7d/30d/90d date range selection

## Notes

- **Supabase RPC vs in-memory:** For production scale, consider migrating aggregation logic to a Postgres stored procedure for better performance. Current approach works for v1 (thousands of activity logs per day).
- **Timezone handling:** All aggregation uses UTC. Future enhancement could support tenant-specific timezone display.
- **Missing metrics:** Current plan covers 6 core metrics. Future: persona_created, lookalike_search are logged but not yet aggregated.
- **User names in breakdown:** Current API returns user_id only. Future: JOIN with users table to include full_name in userBreakdown response.
