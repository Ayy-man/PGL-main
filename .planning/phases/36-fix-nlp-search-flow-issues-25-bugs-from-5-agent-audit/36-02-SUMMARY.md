---
phase: 36-fix-nlp-search-flow-issues
plan: "02"
subsystem: search
tags: [hooks, filters, performance, cache, pagination]
dependency_graph:
  requires: []
  provides: [parseCacheRef, PAGE_SIZE, currentFilters-prop, net_worth_range-clear]
  affects: [search-content.tsx, discover-tab.tsx]
tech_stack:
  added: []
  patterns: [useRef-cache, useEffect-sync, exported-constant]
key_files:
  created: []
  modified:
    - src/app/[orgId]/search/hooks/use-search.ts
    - src/app/[orgId]/search/components/advanced-filters-panel.tsx
    - src/app/[orgId]/search/components/filter-pills-row.tsx
decisions:
  - "parseCacheRef keyed by trimmed keyword string — simple and correct for same-tab session"
  - "PAGE_SIZE exported so search-content.tsx can import it (plan 04 will wire it for display)"
  - "currentFilters prop is optional so existing callers (DiscoverTab) need no changes"
metrics:
  duration: "8 min"
  completed: "2026-04-10"
  tasks_completed: 2
  files_modified: 3
---

# Phase 36 Plan 02: useSearch Hook + Filter Component Fixes Summary

**One-liner:** In-memory NL parse cache (parseCacheRef), stale filterOverrides clearing on keyword change, PAGE_SIZE=25 constant across all pageSize references, net_worth_range in AdvancedFiltersPanel clear, and optional currentFilters prop on both filter components.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix useSearch hook — single-fire, parse cache, filter clearing, pageSize | 2f77224 | use-search.ts |
| 2 | Fix AdvancedFiltersPanel clear + add currentFilters prop to both filter components | db0a359 | advanced-filters-panel.tsx, filter-pills-row.tsx |

## What Was Built

### Task 1 — useSearch hook fixes (use-search.ts)

**Bug M1 — NL parse re-runs on every page change:**
Added `parseCacheRef = useRef<Map<string, Partial<PersonaFiltersType>>>(new Map())`. Before calling `/api/search/parse-query`, the hook checks `parseCacheRef.current.get(cacheKey)` (key = trimmed keyword string). On cache hit, skips the LLM fetch entirely and logs a cache-hit message. On miss, calls the API and stores the result with `parseCacheRef.current.set(cacheKey, nlFilters)`. Page navigation now reuses the cached parse result.

**Bug M2 — Stale filterOverrides persist when keywords cleared:**
In `handleSetSearchState`, added `if (keywordsChanged) { setFilterOverrides({}); }` after resetting page to 1. Keywords clearing or changing now wipes any NLP-parsed filter overrides accumulated from the previous query.

**Bug M13 — pageSize mismatch (request=25, display=10, fallback=50):**
Exported `PAGE_SIZE = 25` constant at module level. Replaced all four hardcoded pageSize values (initial state `10`, reset path `10`, fetch body `25` already correct, setPagination fallback `50`) with `PAGE_SIZE`. All four locations now use the same constant.

### Task 2 — Filter component fixes

**Bug H6 — net_worth_range not cleared by "Clear" button:**
Added `net_worth_range: undefined` to the `onApplyFilters` call inside `handleClear` in `AdvancedFiltersPanel`. The Advanced Filters Clear button now resets all five filter fields.

**Prep L4 — currentFilters prop on both filter components:**
- `AdvancedFiltersPanel`: Added `currentFilters?: Partial<PersonaFilters>` to props interface + component signature. Added `useEffect` that syncs all four internal states from `currentFilters` when it changes. Added `useEffect` to imports.
- `FilterPillsRow`: Added `currentFilters?: Partial<PersonaFilters>` to props interface + component signature. Added `useEffect` that syncs industries, titles, locations, and netWorth from `currentFilters`. (`useEffect` was already imported.)

Both props are optional — existing callers (DiscoverTab) are unaffected. Plan 04 will wire the `currentFilters` prop from `search-content.tsx`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The `currentFilters` prop is intentionally not wired yet — plan 04 will wire it. The prop itself is complete and ready.

## Threat Flags

None. Parse cache is in-memory useRef scoped to a single browser tab, cleared on unmount — no cross-tenant risk (T-36-07 accepted per threat model).

## Self-Check: PASSED

- `src/app/[orgId]/search/hooks/use-search.ts` — confirmed modified, parseCacheRef count=3, PAGE_SIZE count=5
- `src/app/[orgId]/search/components/advanced-filters-panel.tsx` — confirmed modified, net_worth_range: undefined present, currentFilters count=9
- `src/app/[orgId]/search/components/filter-pills-row.tsx` — confirmed modified, currentFilters count=9
- Commit 2f77224 — confirmed in git log
- Commit db0a359 — confirmed in git log
- `pnpm build` — passed with no errors
