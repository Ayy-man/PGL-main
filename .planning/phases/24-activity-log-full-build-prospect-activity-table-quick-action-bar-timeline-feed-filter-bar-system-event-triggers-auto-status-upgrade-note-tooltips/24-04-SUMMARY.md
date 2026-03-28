---
phase: 24-activity-log
plan: 04
subsystem: ui, api
tags: [activity-log, prospect-activity, auto-status-upgrade, enrichment, react, nextjs, supabase]

# Dependency graph
requires:
  - phase: 24-01
    provides: prospect_activity table + logProspectActivity + isDuplicateActivity utilities
  - phase: 24-02
    provides: GET + POST activity API routes at /api/prospects/[prospectId]/activity
  - phase: 24-03
    provides: QuickActionBar, ActivityFilter, TimelineFeed components

provides:
  - Profile page wired with QuickActionBar + ActivityFilter + TimelineFeed (old ActivityTimeline removed)
  - Auto-status upgrade logic in POST activity route (new->contacted, contacted->responded)
  - Enrichment pipeline logs 8 event types to prospect_activity (enrichment_started through enrichment_failed)
  - All existing API routes log to prospect_activity alongside legacy activity_log
  - profile_viewed deduplicated at 1 per user per prospect per hour

affects: [prospect-profile, enrichment-pipeline, activity-log]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget logProspectActivity alongside existing logActivity for backward compatibility"
    - "Auto-status upgrade: outreach events trigger prospect status upgrade server-side"
    - "isDuplicateActivity dedup check before logging profile_viewed"

key-files:
  created: []
  modified:
    - src/components/prospect/profile-view.tsx
    - src/app/[orgId]/prospects/[prospectId]/page.tsx
    - src/app/api/prospects/[prospectId]/activity/route.ts
    - src/inngest/functions/enrich-prospect.ts
    - src/app/api/prospects/[prospectId]/tags/route.ts
    - src/app/api/prospects/[prospectId]/profile/route.ts
    - src/app/api/prospects/[prospectId]/notes/route.ts
    - src/app/api/prospects/[prospectId]/photo/route.ts
    - src/app/api/export/csv/route.ts

key-decisions:
  - "Auto-status upgrade is fire-and-forget async (IIFE) in POST handler so it doesn't block the response"
  - "Per-source enrichment events use userId: null (system events, no human actor)"
  - "CSV export logs to first prospect only with totalProspects metadata (avoids per-prospect spam)"
  - "profile_viewed logged to both legacy activity_log AND new prospect_activity during migration period"

patterns-established:
  - "Dual logging pattern: logActivity (legacy) + logProspectActivity (new) fire-and-forget for all events"
  - "Auto-status upgrade triggers secondary status_changed event with auto:true metadata and triggered_by reference"

requirements-completed: [ACT-07, ACT-08, ACT-10]

# Metrics
duration: 15min
completed: 2026-03-27
---

# Phase 24 Plan 04: Integration — Activity Log Full System Wiring Summary

**Profile page fully rewired with QuickActionBar + ActivityFilter + TimelineFeed, enrichment pipeline logs 8 per-source events, and all 6 API flows trigger prospect_activity with auto-status upgrade on outreach**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-27T00:00:00Z
- **Completed:** 2026-03-27T00:15:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Replaced old ActivityTimeline in profile-view.tsx with QuickActionBar + ActivityFilter + TimelineFeed
- Added auto-status upgrade in POST activity route: new->contacted on any outreach, contacted->responded on met
- Wired enrichment pipeline to log 8 event types: enrichment_started, contactout_updated, exa_updated, sec_updated, market_data_updated, ai_summary_updated, enrichment_complete, enrichment_failed
- Added logProspectActivity to tags, profile, notes, photo, and CSV export routes
- profile_viewed deduplicated per user per prospect per hour using isDuplicateActivity

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire components into profile page + auto-status upgrade** - `b923821` (feat)
2. **Task 2: Wire system event triggers into existing flows** - `2014a7f` (feat)

## Files Created/Modified

- `src/components/prospect/profile-view.tsx` - Replaced ActivityTimeline with QuickActionBar + ActivityFilter + TimelineFeed; added activity state (activeCategories, showSystemEvents, refreshTrigger); updated ProfileViewProps to accept ProspectActivity[]
- `src/app/[orgId]/prospects/[prospectId]/page.tsx` - Queries prospect_activity table (was activity_logs); builds activityUsers map; uses isDuplicateActivity before logging profile_viewed; passes activityUsers prop
- `src/app/api/prospects/[prospectId]/activity/route.ts` - Added auto-status upgrade logic: outreach events check prospect status, upgrade new->contacted or contacted->responded (on met), log status_changed with auto:true metadata
- `src/inngest/functions/enrich-prospect.ts` - Added logProspectActivity imports and calls for all 8 enrichment event types
- `src/app/api/prospects/[prospectId]/tags/route.ts` - Added logProspectActivity for tag_added and tag_removed
- `src/app/api/prospects/[prospectId]/profile/route.ts` - Added logProspectActivity for profile_edited
- `src/app/api/prospects/[prospectId]/notes/route.ts` - Added logProspectActivity for note_added
- `src/app/api/prospects/[prospectId]/photo/route.ts` - Added logProspectActivity for photo_uploaded
- `src/app/api/export/csv/route.ts` - Added logProspectActivity for exported_csv (first prospect only with count metadata)

## Decisions Made

- Auto-status upgrade is an async IIFE in the POST handler (fire-and-forget) — doesn't block API response
- Per-source enrichment events use `userId: null` because they're system-initiated (no human actor)
- CSV export logs to first prospect only with totalProspects metadata to avoid spamming the activity log
- Dual logging maintained during migration: both legacy `logActivity` and new `logProspectActivity` called

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Merged main into worktree to get Plan 03 components**
- **Found during:** Task 1 setup
- **Issue:** QuickActionBar, ActivityFilter, TimelineFeed components from Plan 03 were in main branch but not in this worktree branch (worktrees are parallel)
- **Fix:** `git merge main` to fast-forward to 6ec3604 which includes all prior plan commits
- **Files modified:** 13 files from prior plans (merge only)
- **Verification:** `ls src/components/prospect/` showed all 3 components present
- **Committed in:** Fast-forward merge (not new commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing dependency resolved by merge)
**Impact on plan:** Essential to proceed. No scope creep.

## Issues Encountered

None beyond the worktree merge needed to pull in Plan 03 dependencies.

## Known Stubs

None — all activity logging is wired to real prospect_activity table. ActivityFilter, QuickActionBar, and TimelineFeed all receive live data.

## Next Phase Readiness

- Full Activity Log system is now live: data layer (24-01) + API (24-02) + components (24-03) + integration (24-04) complete
- Enrichment pipeline now produces a rich audit trail of per-source events
- Auto-status upgrade enables automated lead progression tracking
- Ready for 24-05 (note tooltips or final polish plan)

---
*Phase: 24-activity-log*
*Completed: 2026-03-27*
