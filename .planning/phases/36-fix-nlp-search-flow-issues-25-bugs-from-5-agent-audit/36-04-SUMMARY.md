---
phase: 36-fix-nlp-search-flow-issues
plan: "04"
subsystem: search-orchestration
tags: [search, nlp, bug-fix, ux, pagination, filters]
dependency_graph:
  requires: [36-02, 36-03]
  provides: [search-content-orchestration, persona-form-prefill, filter-threading]
  affects: [search-content.tsx, discover-tab.tsx, persona-form-dialog.tsx]
tech_stack:
  added: []
  patterns: [useRef-auto-scroll, opacity-transition-feedback, guard-at-top-of-function]
key_files:
  created: []
  modified:
    - src/app/[orgId]/search/components/search-content.tsx
    - src/app/[orgId]/search/components/discover-tab.tsx
    - src/app/[orgId]/personas/components/persona-form-dialog.tsx
decisions:
  - "onSubmitSearch is a no-op — search fires via useEffect on keyword state change, not explicit executeSearch call"
  - "renderSavedSearchResults returns null early when not in saved-search mode and no persona selected"
  - "slideOverProspectId uses null in discover mode to block invalid enrich API calls"
  - "isSavedSearchMode set synchronously before loadSavedProspects to prevent stale flash"
metrics:
  duration: "~12 min"
  completed: "2026-04-10"
  tasks_completed: 2
  files_modified: 3
---

# Phase 36 Plan 04: Search Orchestration Bug Fixes Summary

**One-liner:** Fixed 11 bugs in search-content.tsx — eliminated double API call, pre-filled PersonaFormDialog from NLP parse, guarded saved-tab leakage, blocked invalid re-enrich in discover mode, added auto-scroll, opacity feedback, PAGE_SIZE pagination, and threaded currentFilters through DiscoverTab.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix PersonaFormDialog (H3), search-content orchestration (H1/H2, M8, M10, L2, L5, M13, M9) | 1748157 | search-content.tsx, persona-form-dialog.tsx |
| 2 | Thread currentFilters through DiscoverTab + auto-scroll + build verify | 1748157 | discover-tab.tsx, search-content.tsx |

## What Was Built

All 11 bugs fixed across 3 files:

**H1/H2 — Double executeSearch eliminated:**
`onSubmitSearch` in the DiscoverTab invocation is now a no-op comment. Search fires via the `useEffect` in `use-search.ts` that watches `searchState.keywords`. Previously `executeSearch()` was called both by that effect and explicitly here, causing two simultaneous Apollo API calls.

**H3 — PersonaFormDialog pre-filled from NLP parse:**
Added `initialKeywords?: string` and `initialFilterOverrides?: Record<string, unknown>` props to `PersonaFormDialog`. Two `useEffect` hooks: one applies filter overrides when the dialog opens in create mode; another syncs keywords if `initialKeywords` changes. `search-content.tsx` passes `initialKeywords={searchState.keywords}` and `initialFilterOverrides={filterOverrides}`.

**M3 — Auto-scroll to results:**
Added `resultsRef = useRef<HTMLDivElement>(null)` attached to the `renderSavedSearchResults` wrapper div. A `useEffect` watching `results.length` and `savedProspects.length` fires a 150ms-delayed `scrollIntoView({ behavior: "smooth", block: "nearest" })`.

**M8 — Saved tab guards against keyword-only results:**
`renderSavedSearchResults` returns `null` immediately when `!isSavedSearchMode && !searchState.persona`. Both the `BulkActionsBar` and `ProspectResultsTable` render conditions updated to require either saved-search mode or a persona in discover mode.

**M9 — Clear search resets state:**
`handleNLSearch` now calls `setSavedProspects([])` and `setIsSavedSearchMode(false)` to clear stale saved search data before loading keyword results. `onClearSearch` on DiscoverTab resets keywords and persona in `searchState`.

**M10 — Re-Enrich blocked in Discover mode:**
`slideOverProspectId` now uses `(isSavedSearchMode ? searchState.prospect : null)` so it returns `null` in discover mode, preventing an Apollo person ID from reaching the enrich endpoint that expects a Supabase UUID.

**M13 — Pagination uses PAGE_SIZE:**
Imported `PAGE_SIZE` from `use-search`. Both pagination display expressions updated from hardcoded `10` to `PAGE_SIZE` (currently 25).

**L2 — Opacity feedback during re-fetch:**
`ProspectResultsTable` wrapped in `<div style={{ opacity: isLoading && !isRefreshing ? 0.5 : 1, transition: "opacity 0.2s ease" }}>`.

**L4 — currentFilters threaded:**
`DiscoverTab` interface extended with `currentFilters?: Partial<PersonaFilters>`. Prop passed through to `FilterPillsRow` and `AdvancedFiltersPanel`. `search-content.tsx` passes `currentFilters={filterOverrides}`.

**L5 — Stale flash prevented:**
`setIsSavedSearchMode(true)` called synchronously before `loadSavedProspects()` in the persona change effect so the component renders in the correct mode immediately.

## Deviations from Plan

None — plan executed exactly as written. All 11 fixes implemented in the two tasks as specified.

## Build Verification

`pnpm build` completed with exit code 0. No TypeScript errors. All routes compiled successfully.

## Known Stubs

None.

## Threat Flags

None beyond what was addressed:
- T-36-10 (M10): `slideOverProspectId` returns null in Discover mode — mitigated as planned.

## Self-Check

### Files exist:
- src/app/[orgId]/search/components/search-content.tsx — MODIFIED
- src/app/[orgId]/search/components/discover-tab.tsx — MODIFIED
- src/app/[orgId]/personas/components/persona-form-dialog.tsx — MODIFIED

### Commits exist:
- 1748157 — fix(36-04): search orchestration — H1/H2/H3/M3/M8/M9/M10/M13/L2/L4/L5

## Self-Check: PASSED
