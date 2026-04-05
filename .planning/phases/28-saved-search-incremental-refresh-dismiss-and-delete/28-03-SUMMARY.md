---
phase: 28-saved-search-incremental-refresh-dismiss-and-delete
plan: "03"
subsystem: frontend
tags: [search-ui, saved-search, dismiss, refresh, new-badge]
dependency_graph:
  requires: [28-01, 28-02]
  provides: [saved-search-ui-flow, new-badge, dismissed-toggle, bulk-dismiss, refresh-button]
  affects: [search-content, prospect-results-table, bulk-actions-bar]
tech_stack:
  added: []
  patterns: [optimistic-ui-update, saved-search-mode-guard, apollo-person-conversion-helper]
key_files:
  created: []
  modified:
    - src/app/[orgId]/search/components/search-content.tsx
    - src/app/[orgId]/search/components/prospect-results-table.tsx
    - src/app/[orgId]/search/components/bulk-actions-bar.tsx
decisions:
  - "savedProspectToApolloPerson strips fields not in ApolloPerson interface (seniority, departments omitted) to satisfy TypeScript without modifying shared types"
  - "Render guard uses (results.length > 0 || (isSavedSearchMode && savedProspects.length > 0)) to prevent blank table on DB-load path where Apollo results array is empty"
  - "Dismiss optimistically removes row from local state then server-confirms; undo reloads from DB for accuracy"
  - "Persona selection effect has eslint-disable for deps (personas, loadSavedProspects, handleRefresh intentionally omitted to prevent re-fire on every render)"
metrics:
  duration: "~6 min"
  completed_date: "2026-04-05"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 28 Plan 03: UI Integration — Saved Search State Management Summary

Full saved search UI integration: load-from-DB flow, first-load Apollo+diff, NEW gold badges, dismissed toggle with Undo, last refreshed indicator, Refresh button, Bulk Dismiss Selected with confirmation dialog, stale prompt, 500-cap message, and filter change warning.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Wire saved search load/refresh flow into search-content.tsx | ebf0c54 | src/app/[orgId]/search/components/search-content.tsx |
| 2 | Update ProspectResultsTable and BulkActionsBar | 44a68ed | prospect-results-table.tsx, bulk-actions-bar.tsx |

## What Was Built

### Task 1: search-content.tsx

**New state variables** (9 total):
- `savedProspects: SavedSearchProspect[]` — DB-loaded prospect rows
- `dismissedCount: number` — for toggle label
- `lastRefreshedAt: string | null` — shown in toolbar
- `totalApolloResults: number | null` — triggers 500-cap message
- `showDismissed: boolean` — toggle for dismissed rows visibility
- `isRefreshing: boolean` — loading state for Refresh button
- `isSavedSearchMode: boolean` — mode guard for all saved-search UI
- `dismissDialogOpen / pendingDismissIds` — confirmation dialog state

**Helpers:**
- `formatRefreshedAgo()` — minute-level precision ("5m ago", "2h ago", "3d ago")
- `savedProspectToApolloPerson()` — maps `SavedSearchProspect` to `ApolloPerson` shape with `_savedSearchMeta` extension for NEW/dismissed/enriched metadata

**Flows:**
- Persona selection effect: if `last_refreshed_at` set → `loadSavedProspects()` (DB path); else → `handleRefresh()` (first load Apollo+diff path)
- Stale check: toast warning when `daysSinceRefresh > 7`
- `loadSavedProspects()` — fetches `/api/search/[id]/prospects?includeDismissed=...`
- `handleRefresh()` — POST `/api/search/[id]/refresh`, then reloads from DB
- `handleDismiss()` — POST `/api/search/[id]/dismiss`, optimistic local state removal
- `handleUndoDismiss()` — POST undo, then full reload from DB
- `handleBulkDismissClick()` — filters out enriched, opens confirmation dialog
- `showDismissed` toggle effect — reloads prospects when toggled

**UI additions:**
- Saved search toolbar row (last refreshed label, show/hide dismissed toggle, Refresh button with spinner)
- 500-cap message when `totalApolloResults > 500`
- Filter change warning toast when in saved search mode
- Dismiss confirmation dialog ("They won't appear in future refreshes of this search.")
- `onDismiss` + `showDismiss` wired to BulkActionsBar
- `savedSearchMode` + `onUndoDismiss` + `lastRefreshedAt` wired to ProspectResultsTable

**Render guard fix:** Changed `{results.length > 0 && ...}` to `{(results.length > 0 || (isSavedSearchMode && savedProspects.length > 0)) && ...}` so the table renders when loading from DB (Apollo `results` array is always empty in saved search mode).

### Task 2: bulk-actions-bar.tsx + prospect-results-table.tsx

**BulkActionsBar:**
- Added `onDismiss?: () => void` and `showDismiss?: boolean` to interface
- "Dismiss Selected" button: `Trash2` icon, `text-red-400 hover:text-red-300 hover:bg-red-500/10` — shown only when `showDismiss && onDismiss`

**ProspectResultsTable:**
- New props: `savedSearchMode`, `onUndoDismiss`, `lastRefreshedAt`
- NEW gold badge: `rgba(212, 175, 55, 0.15)` background, `var(--gold-text, #f4d47f)` color, shown for `is_new` rows
- Dismissed row: `opacity: 0.4` via inline style on `<tr>`
- Undo button for dismissed rows: gold accent, `e.stopPropagation()`
- Enriched indicator: replaces checkbox with "Enriched" label for `status === 'enriched'` rows
- "Not in latest results" indicator: shown when `last_seen_at < lastRefreshedAt`
- Mobile card list updated with same NEW badge, dismissed opacity, and Undo button

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `seniority` and `departments` fields not in ApolloPerson interface**
- **Found during:** Task 1 TypeScript check
- **Issue:** The plan's `savedProspectToApolloPerson` snippet included `seniority` and `departments` fields, but these don't exist in the `ApolloPerson` interface in `src/lib/apollo/types.ts`
- **Fix:** Removed both fields from the conversion function. They are not rendered anywhere in `ProspectResultsTable` so no display impact.
- **Files modified:** src/app/[orgId]/search/components/search-content.tsx
- **Commit:** ebf0c54 (same task commit, fixed before committing)

## Known Stubs

None — all data flows are wired to real API calls (`/api/search/[searchId]/prospects`, `/refresh`, `/dismiss`).

## Threat Flags

- **T-28-08** (Tampering — dismiss flow): All dismiss/undo calls go through server API which validates tenant ownership. Client state is optimistically updated but server is source of truth. Mitigated as designed.
- **T-28-09** (Information Disclosure — savedProspectToApolloPerson): apollo_data contains only free-tier Apollo preview data; no PII beyond what's already displayed. Accepted as designed.

## Self-Check: PASSED

Files verified:
- FOUND: src/app/[orgId]/search/components/search-content.tsx (modified)
- FOUND: src/app/[orgId]/search/components/prospect-results-table.tsx (modified)
- FOUND: src/app/[orgId]/search/components/bulk-actions-bar.tsx (modified)

Commits verified:
- FOUND: ebf0c54 (feat(28-03): wire saved search load/refresh/dismiss flow into search-content)
- FOUND: 44a68ed (feat(28-03): update ProspectResultsTable and BulkActionsBar for saved search)

TypeScript: `npx tsc --noEmit` — zero new errors introduced. Pre-existing errors in `apollo/client.ts` and `execute-research.test.ts` are unrelated to this plan.

Acceptance criteria verification:
- [x] search-content.tsx imports SavedSearchProspect from @/lib/personas/types
- [x] search-content.tsx contains fetch calls to `/api/search/${...}/prospects`, `/refresh`, `/dismiss`
- [x] search-content.tsx contains `isSavedSearchMode` state variable
- [x] search-content.tsx contains `showDismissed` state variable
- [x] search-content.tsx contains dismiss confirmation Dialog with "They won't appear in future refreshes"
- [x] search-content.tsx contains `formatRefreshedAgo` function with minute-level precision
- [x] search-content.tsx contains stale check: `daysSinceRefresh > 7`
- [x] search-content.tsx contains "Showing first 500" message when totalApolloResults > 500
- [x] search-content.tsx passes onDismiss to BulkActionsBar
- [x] Table render condition is `(results.length > 0 || (isSavedSearchMode && savedProspects.length > 0))`
- [x] bulk-actions-bar.tsx has `onDismiss?: () => void` and `showDismiss?: boolean`
- [x] bulk-actions-bar.tsx renders Dismiss Selected button with Trash2 icon and `text-red-400`
- [x] bulk-actions-bar.tsx imports Trash2 from lucide-react
- [x] prospect-results-table.tsx has `savedSearchMode`, `onUndoDismiss`, `lastRefreshedAt` props
- [x] prospect-results-table.tsx contains NEW badge with `rgba(212, 175, 55, 0.15)` background
- [x] prospect-results-table.tsx contains `opacity: ... 0.4` for dismissed rows
- [x] prospect-results-table.tsx contains Undo button for dismissed rows
- [x] prospect-results-table.tsx contains "Enriched" indicator for enriched rows
- [x] prospect-results-table.tsx contains "Not in latest results" indicator
