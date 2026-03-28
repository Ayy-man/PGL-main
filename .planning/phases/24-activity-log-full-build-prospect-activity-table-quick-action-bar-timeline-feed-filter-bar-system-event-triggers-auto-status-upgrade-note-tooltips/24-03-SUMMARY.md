---
phase: 24-activity-log
plan: "03"
subsystem: activity-log-ui
tags: [react, components, activity-log, timeline, filter]
dependency_graph:
  requires: [24-02]
  provides: [QuickActionBar, ActivityFilter, TimelineFeed]
  affects: [prospect-profile-page]
tech_stack:
  added: []
  patterns: [inline-form-animation, cursor-pagination, client-side-filter, date-grouping, collapse-pattern]
key_files:
  created:
    - src/components/prospect/quick-action-bar.tsx
    - src/components/prospect/activity-filter.tsx
    - src/components/prospect/timeline-feed.tsx
  modified: []
decisions:
  - Used Array.from() instead of spread operator for Map/Set iteration for ES5 target compatibility
  - Used refreshTrigger number prop for TimelineFeed reload instead of forwardRef/imperative handle
  - Built custom checkbox UI instead of Radix Checkbox to support per-category color accents
  - Used max-height CSS transition for inline input slide animations (200ms ease-out)
metrics:
  duration: "4 min"
  completed_date: "2026-03-28"
  tasks: 2
  files: 3
---

# Phase 24 Plan 03: Activity Log UI Components Summary

Three client-side React components for the Activity Log experience: QuickActionBar (6 action buttons with inline forms), ActivityFilter (category dropdown with pills), and TimelineFeed (date-grouped, color-coded timeline with edit/delete).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build QuickActionBar component | 9c83e1a | src/components/prospect/quick-action-bar.tsx |
| 2 | Build ActivityFilter + TimelineFeed components | dd4fd68 | src/components/prospect/activity-filter.tsx, src/components/prospect/timeline-feed.tsx |

## What Was Built

### QuickActionBar (`src/components/prospect/quick-action-bar.tsx`)

- 6 action buttons in a horizontal flex row: Call, Email, Met, LinkedIn, Add Note, Custom Event
- Outreach buttons (Call/Email/Met/LinkedIn) toggle gold-highlighted active state and slide open a single-line note input with max-height transition animation
- Add Note button opens a 3-row textarea (Shift+Enter for newline, Enter to submit)
- Custom Event button (purple accent) opens inline form: title (required), datetime-local input defaulting to now (supports backdating), optional note textarea
- All actions POST to `/api/prospects/{prospectId}/activity` with correct category/eventType
- Loading spinner during submit, click-outside-to-cancel, Escape key cancels
- CSS variables throughout (`var(--gold-primary)`, `var(--purple)`, `var(--border-default)`)

### ActivityFilter (`src/components/prospect/activity-filter.tsx`)

- Filter dropdown button with funnel icon and ChevronDown
- Dropdown panel with 4 category checkboxes (Outreach, Data Updates, Team Activity, Custom), each with color-coded dot and custom checkbox using category's dot color
- Separator then "Show system events" toggle (system events = data category events with no user_id)
- Click-outside-to-close dropdown via mousedown event listener
- Active filter pills shown below when not all categories selected — each pill has colored dot, category label, X button to remove
- Event count badge on the right side
- All props are callbacks: onCategoriesChange, onShowSystemEventsChange

### TimelineFeed (`src/components/prospect/timeline-feed.tsx`)

- Accepts initialEvents + initialUsers from server, re-fetches on filter/refreshTrigger change
- Date grouping: Today, Yesterday, day name (within 7 days), formatted date (within 30 days), Earlier (collapsible bucket)
- OUTREACH events: gold dot, gold left accent bar (rgba(212,175,55,0.3)), bold user name + title, italic quoted note
- DATA events: blue dot, blue left accent bar, system title, metadata (source/fields) shown below
- TEAM events: hollow gray dot, no accent bar, dimmer muted text
- CUSTOM events: purple dot, purple left accent bar, bold title, backdated label when event_at differs from created_at by >1 min
- Collapses 3+ consecutive `profile_viewed` team events into "Viewed by N team members" with expand toggle
- Hover menu (three-dot) on each card: "Edit note" opens inline textarea with Enter/Escape, "Delete event" shows inline confirm
- PATCH `/api/prospects/{id}/activity/{eventId}` for note edits, DELETE for deletion
- Cursor-based load more (uses last event's event_at as cursor)
- Empty state with Activity icon
- Loading state with spinner

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript MapIterator / Set spread errors for ES target**
- **Found during:** Task 2 TypeScript check
- **Issue:** Three TS errors: `MapIterator` and `Set` not iterable via spread under `--target es2015` constraint; `unknown` type not assignable to `ReactNode`
- **Fix:** Used `Array.from()` for Map entries and Set; added explicit type cast for metadata source display
- **Files modified:** `src/components/prospect/timeline-feed.tsx`
- **Commit:** dd4fd68

## Known Stubs

None — all components wire to real API endpoints from Plan 02.

## Self-Check: PASSED

- `src/components/prospect/quick-action-bar.tsx` — FOUND
- `src/components/prospect/activity-filter.tsx` — FOUND
- `src/components/prospect/timeline-feed.tsx` — FOUND
- Commit `9c83e1a` — FOUND
- Commit `dd4fd68` — FOUND
- TypeScript: 0 errors
