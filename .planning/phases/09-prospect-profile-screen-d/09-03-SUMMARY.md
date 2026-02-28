---
phase: 09-prospect-profile-screen-d
plan: "03"
subsystem: ui
tags: [react, nextjs, supabase, profile, tabs, layout]

# Dependency graph
requires:
  - phase: 09-01
    provides: ProfileHeader, ProfileTabs, ActivityTimeline components
  - phase: 09-02
    provides: SECFilingsTable, EnrichmentTab, NotesTab, ListsTab components

provides:
  - Fully refactored ProfileView with two-column layout and tab switching
  - page.tsx now queries activity_logs and passes orgId + activityEntries to ProfileView
  - Breadcrumbs bar at top with Search Results back-link

affects:
  - 09-04 (WealthSignals refactor — now decoupled from ProfileView)
  - Any future prospect profile feature work

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Two-column layout pattern: fixed 340px left sidebar (ActivityTimeline) + flex-1 right tab content
    - Tab content switching via useState(activeTab) — conditional rendering per tab name
    - LookalikeDiscovery toggle pattern: showLookalikes state controlled by ProfileHeader callback
    - surface-card used exclusively for all card containers (no bg-card + inline gradient)

key-files:
  created: []
  modified:
    - src/app/[orgId]/prospects/[prospectId]/page.tsx
    - src/components/prospect/profile-view.tsx

key-decisions:
  - "ProfileView notes tab passes empty array for notes — feature phase will query notes table"
  - "Lists tab onAddToList is a console.log stub — AddToListDialog wiring is a feature phase task"
  - "Activity tab shows user_id sliced to 8 chars with ellipsis — full user resolution is out of scope for profile phase"
  - "AI Insight gold-border block uses inline style(background: var(--bg-card-gradient)) — not surface-card, per established Phase 05-06 pattern for gold left-border treatment"

patterns-established:
  - "Profile page two-column: left w-[340px] ActivityTimeline, right flex-1 tab content with activeTab state"
  - "Breadcrumbs always wrapped in px-14 pt-6 before ProfileHeader on profile pages"

requirements-completed: [PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07, PROF-08, PROF-09, PROF-10]

# Metrics
duration: 4min
completed: 2026-03-01
---

# Phase 9 Plan 03: Refactor Full Profile Page (ProfileView + page.tsx) Summary

**ProfileView rebuilt as two-column layout with Breadcrumbs + ProfileHeader + sticky ProfileTabs, composing all 09-01/09-02 sub-components; page.tsx now queries activity_logs and passes orgId + activityEntries**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-01T03:42:57Z
- **Completed:** 2026-03-01T03:47:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- page.tsx extracts `orgId` from params and queries `activity_logs` filtered by prospect, passed to ProfileView as `activityEntries`
- ProfileView rebuilt with Breadcrumbs > ProfileHeader > sticky ProfileTabs above a two-column layout (340px ActivityTimeline left + flex-1 tab content right)
- Overview tab: 2x3 info grid, gold-border AI Insight block, recent SEC transactions (top 5), contact section — all using `surface-card` utility
- Activity, SEC Filings, Enrichment, Notes, and Lists tabs wired to their respective sub-components
- LookalikeDiscovery toggled via `showLookalikes` state, revealed below tabs on "Find Lookalikes" click
- Removed all old code: mock `availableLists`, `handleExport` placeholder, `WealthSignals` inline import, `EnrichmentStatus` inline import, old `bg-card` class usage

## Task Commits

1. **Task T1: Add activity query + pass orgId/activityEntries** — `65d7fe8` (feat)
2. **Task T2: Rewrite ProfileView two-column layout + tabs** — `f6bc5a2` (feat)

## Files Created/Modified

- `src/app/[orgId]/prospects/[prospectId]/page.tsx` — Added orgId extraction, activity_logs query, new props passed to ProfileView
- `src/components/prospect/profile-view.tsx` — Complete structural rewrite: Breadcrumbs + ProfileHeader + ProfileTabs + two-column layout with ActivityTimeline left and tabbed content right

## Decisions Made

- Notes tab passes `notes={[]}` — notes querying is a future feature phase task; stub avoids premature DB schema dependency
- Lists tab `onAddToList` is a console.log stub — AddToListDialog integration deferred to feature phase
- AI Insight block retains inline `style={{ background: "var(--bg-card-gradient)" }}` per established Phase 05-06 gold left-border pattern (not surface-card — this is intentional for the distinct gold-border treatment)
- User ID in Activity tab truncated to 8 chars — full user display name resolution is out of scope for this phase

## Deviations from Plan

None — plan executed exactly as written. TypeScript passed clean on first compile.

## Issues Encountered

- File modification conflict: `page.tsx` had been updated between initial read and first edit attempt (added `publicly_traded_symbol`, `company_cik` columns to the select query). Read again and used Write to perform a clean full rewrite instead of partial edits. No functional impact.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- ProfileView is now the full composition layer — all sub-components from Plans 09-01 and 09-02 are wired in
- Plan 09-04 can now refactor WealthSignals in isolation (it was removed from ProfileView in this plan)
- All 10 PROF requirements are fulfilled by the complete profile layout

---
*Phase: 09-prospect-profile-screen-d*
*Completed: 2026-03-01*
