---
phase: 04-super-admin-health-dashboard-platform-pulse-tenant-heatmap-enrichment-pipeline-api-quota-tracking-funnel-analytics-error-feed
plan: 01
subsystem: api
tags: [redis, inngest, enrichment, quota-tracking, typescript]

# Dependency graph
requires:
  - phase: 03-enrich-ship
    provides: Inngest enrichment function (enrich-prospect.ts), API clients (contactout, exa, edgar, claude, apollo), Redis cache singleton

provides:
  - Structured enrichment error objects with { status, error?, at } shape stored in JSONB
  - trackApiUsage Redis INCR utility for daily per-provider quota tracking
  - All 5 API clients (apollo, contactout, exa, edgar, claude) instrumented with fire-and-forget usage tracking

affects:
  - 04-02 (API Quota Burn card reads api_usage:{provider}:{YYYY-MM-DD} counters)
  - 04-03 (Error Feed reads structured { status, error, at } objects from enrichment_source_status)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget Redis INCR pattern: trackApiUsage('provider').catch(() => {}) — never blocks, never throws"
    - "Structured JSONB status objects: { status, error?, at } for enrichment source tracking"
    - "Backward-compatible JSONB schema: old string values ('complete') remain valid alongside new objects"

key-files:
  created:
    - src/lib/enrichment/track-api-usage.ts
  modified:
    - src/inngest/functions/enrich-prospect.ts
    - src/lib/enrichment/contactout.ts
    - src/lib/enrichment/exa.ts
    - src/lib/enrichment/edgar.ts
    - src/lib/enrichment/claude.ts
    - src/lib/apollo/client.ts

key-decisions:
  - "Fire-and-forget pattern (.catch(() => {})) ensures quota tracking never blocks enrichment pipeline"
  - "90-day TTL on Redis quota counters provides historical data without unbounded growth"
  - "Key pattern api_usage:{provider}:{YYYY-MM-DD} enables per-day aggregation for the API Quota Burn card"
  - "Backward-compatible JSONB: string values in old rows remain valid, error feed API handles both shapes"
  - "SourceStatusPayload type defined at file level for reuse across all updateSourceStatus calls"

patterns-established:
  - "trackApiUsage: always call after confirmed successful API response, never in catch blocks"
  - "updateSourceStatus: always include at: new Date().toISOString() in every call"
  - "Error capture: error instanceof Error ? error.message : String(error) for type-safe error serialization"

requirements-completed:
  - "DESIGN.md Section: New Data Capture Required (enrichment error details + API quota usage)"
  - "DESIGN.md Section: Enrichment Pipeline stat card (rich error data)"
  - "DESIGN.md Section: API Quota Burn stat card (Redis counters)"

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 4 Plan 01: Enrichment Data Capture Summary

**Structured enrichment error objects and Redis daily API quota counters across all 5 enrichment providers**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-24T23:55:04Z
- **Completed:** 2026-02-24T23:57:50Z
- **Tasks:** 2
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments
- Upgraded `updateSourceStatus` to write `{ status, error?, at }` structured objects instead of plain strings, enabling the health dashboard Error Feed to display per-source failure details with timestamps
- Created `trackApiUsage` Redis INCR utility with 90-day TTL, key pattern `api_usage:{provider}:{YYYY-MM-DD}`, using pipeline for atomic increment+expire
- Instrumented all 5 API clients (apollo, contactout, exa, edgar, claude) with fire-and-forget quota tracking after successful responses only

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade updateSourceStatus to write structured error objects** - `420c609` (feat)
2. **Task 2: Create trackApiUsage utility and instrument all 5 API clients** - `bf63b64` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/enrichment/track-api-usage.ts` - Redis INCR utility, fire-and-forget, 90-day TTL, pipeline for atomic ops
- `src/inngest/functions/enrich-prospect.ts` - SourceStatusPayload type, all 23 status calls now use structured objects
- `src/lib/enrichment/contactout.ts` - trackApiUsage("contactout") after successful person data extraction
- `src/lib/enrichment/exa.ts` - trackApiUsage("exa") after successful search results returned
- `src/lib/enrichment/edgar.ts` - trackApiUsage("edgar") after Form 4 transactions collected
- `src/lib/enrichment/claude.ts` - trackApiUsage("claude") after text content confirmed
- `src/lib/apollo/client.ts` - trackApiUsage("apollo") after successful circuit breaker response cached

## Decisions Made
- Fire-and-forget pattern (.catch(() => {})) chosen to ensure quota tracking never blocks enrichment or throws to callers
- 90-day TTL on Redis keys provides 3 months of history for API Quota Burn card without unbounded growth
- Tracking placed AFTER confirmed success (not before or in catch) to accurately count successful API calls only
- SourceStatusPayload type defined at module level — single source of truth for all callers within enrich-prospect.ts

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness
- `api_usage:{provider}:{YYYY-MM-DD}` Redis keys are now being written on every successful enrichment API call — Plan 02 quota API can read these immediately
- `enrichment_source_status` JSONB now stores structured `{ status, error?, at }` objects — Plan 02/03 Error Feed API can parse per-source failure details with timestamps
- TypeScript compiles cleanly with zero errors

## Self-Check: PASSED

- All 7 key files verified present on disk
- Task commits 420c609 and bf63b64 verified in git log
- TypeScript compiles with zero errors

---
*Phase: 04-super-admin-health-dashboard-platform-pulse-tenant-heatmap-enrichment-pipeline-api-quota-tracking-funnel-analytics-error-feed*
*Completed: 2026-02-25*
