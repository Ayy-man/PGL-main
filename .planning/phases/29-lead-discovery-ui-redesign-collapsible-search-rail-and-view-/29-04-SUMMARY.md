---
phase: 29
plan: "04"
subsystem: search-ui
tags: [refactor, tab-layout, wiring, search-content, integration]
dependency_graph:
  requires:
    - 29-01
    - 29-02
    - 29-03
  provides:
    - Two-tab search layout (Discover + Saved Searches) in search-content.tsx
  affects:
    - src/app/[orgId]/search/components/search-content.tsx
    - src/app/[orgId]/personas/components/persona-form-dialog.tsx
tech_stack:
  added: []
  patterns:
    - "Controlled PersonaFormDialog (open/onOpenChange without trigger)"
    - "Inline renderSavedSearchResults() helper to slot results into SavedSearchesTab children prop"
    - "Tab bar via CSS border-bottom underline with gold CSS variable (no Radix Tabs)"
key_files:
  created: []
  modified:
    - src/app/[orgId]/search/components/search-content.tsx
    - src/app/[orgId]/personas/components/persona-form-dialog.tsx
decisions:
  - "renderSavedSearchResults extracted as inline function — keeps table/pagination/bulk-actions JSX co-located with their state in search-content.tsx while passing into SavedSearchesTab children slot"
  - "PersonaFormDialog: conditionally render DialogTrigger only when trigger != null — enables controlled-open mode without a DOM trigger element"
  - "Tab state kept in SearchContent (not URL) per D-03 — nuqs-owned URL state (persona/keywords) continues to drive data loading independently"
metrics:
  duration: "~20 min"
  completed: "2026-04-07"
  tasks_completed: 2
  files_created: 0
  files_modified: 2
---

# Phase 29 Plan 04: search-content.tsx Integration (Tab Controller Wiring) Summary

Refactored `search-content.tsx` from a single-column stacked layout into a two-tab controller composing DiscoverTab (Plan 02) + SavedSearchesTab (Plan 03). All Phase 28 handlers preserved byte-for-byte in behavior. pnpm build exits 0.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add tab state, import new components, remove inline formatRefreshedAgo | 5d2b06f | search-content.tsx |
| 2 | Replace render block with tab bar + DiscoverTab + SavedSearchesTab wiring | 2ef9cd5 | search-content.tsx, persona-form-dialog.tsx |

## Decisions Made

1. **renderSavedSearchResults as inline helper**: Extracted the entire results block (BulkActionsBar, skeleton, empty state, ProspectResultsTable, pagination, totalApolloResults hint) into a local `renderSavedSearchResults()` function defined inside `SearchContent`, then passed it as `{children}` to `SavedSearchesTab`. This keeps all state references local while satisfying the composition boundary.

2. **Controlled PersonaFormDialog**: The plan required `trigger={null}` for controlled-open mode. Radix `DialogTrigger asChild` with a null child would throw at runtime (Rule 2 auto-fix). Modified `PersonaFormDialog` to skip rendering `DialogTrigger` entirely when `trigger` is null — minimal one-line guard, no behavior change for existing usages.

3. **Tab underline via CSS border-bottom**: Used inline `borderBottom: "2px solid var(--gold-primary)"` on the active tab button (margin-bottom: -1px to overlap the container border) instead of Radix Tabs — consistent with plan spec and avoids adding a dependency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] PersonaFormDialog null-trigger guard**
- **Found during:** Task 2
- **Issue:** The plan specified `trigger={null}` for the controlled-open PersonaFormDialog. The existing component wrapped `trigger` in `<DialogTrigger asChild>{trigger}</DialogTrigger>` unconditionally — Radix throws when `asChild` receives null as its child.
- **Fix:** Added `{trigger != null && (<DialogTrigger asChild>{trigger}</DialogTrigger>)}` guard in `persona-form-dialog.tsx`. All existing call sites pass a real ReactNode trigger and are unaffected.
- **Files modified:** `src/app/[orgId]/personas/components/persona-form-dialog.tsx`
- **Commit:** 2ef9cd5

## Known Stubs

None. All data props flow from real state (`personas`, `savedProspects`, `searchState`, etc.) derived from existing hooks and server-loaded data. No hardcoded empty values flow to visible UI.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-29-11 | All handler functions verified present: loadSavedProspects, handleRefresh, handleDismiss, handleUndoDismiss, handleBulkAddToList, handleBulkExport, handleBulkEnrich, handleBulkListSubmit, handleApplyFilters, handleProspectClick, handleSlideOverClose — each appears ≥2x (declaration + invocation) |
| T-29-12 | Tab state is pure useState; URL state still owned by useSearch/nuqs — no desync |
| T-29-13 | PersonaFormDialog + createPersonaAction server action unchanged; no new auth surface |
| T-29-15 | API calls to /api/search/[id]/dismiss, refresh, prospects unchanged — all activity logging preserved |

## Self-Check: PASSED

- `src/app/[orgId]/search/components/search-content.tsx` — FOUND, 1128 lines
- `src/app/[orgId]/personas/components/persona-form-dialog.tsx` — FOUND (null-trigger guard added)
- Commit 5d2b06f (Task 1) — FOUND
- Commit 2ef9cd5 (Task 2) — FOUND
- `pnpm build` — exits 0 (✓ Compiled successfully)
- `grep -c "PersonaPills" search-content.tsx` — 0 (removed)
- `grep -c ">Lead Discovery<" search-content.tsx` — 0 (removed)
- `grep -c "<DiscoverTab" search-content.tsx` — 1
- `grep -c "<SavedSearchesTab" search-content.tsx` — 1
- `grep -c "renderSavedSearchResults" search-content.tsx` — 2 (declaration + call)
- `grep -c "<ProspectSlideOver" search-content.tsx` — 1 (preserved)
- All Phase 28 bulk handlers — ≥2 occurrences each (declaration + usage)
