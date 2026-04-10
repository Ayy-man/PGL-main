---
phase: 36-fix-nlp-search-flow-issues
plan: "03"
subsystem: search-ui
tags: [nl-search, discover-tab, loading-state, ux-polish]
dependency_graph:
  requires: [36-02]
  provides: [polished-discover-tab-interaction]
  affects: [search-content.tsx, discover-tab.tsx, nl-search-bar.tsx]
tech_stack:
  added: []
  patterns: [conditional-rendering, useEffect-sync, loading-guard]
key_files:
  created: []
  modified:
    - src/app/[orgId]/search/components/nl-search-bar.tsx
    - src/app/[orgId]/search/components/discover-tab.tsx
    - src/app/[orgId]/search/components/search-content.tsx
decisions:
  - "onClearSearch wired in search-content.tsx as setSearchState({ keywords: '', persona: '' }) to fully reset search on X click"
  - "suggested-personas-section.tsx required no changes — M7 auto-submit fix lives entirely in DiscoverTab.handlePrefill"
metrics:
  duration: "~2 min"
  completed: "2026-04-10"
  tasks_completed: 2
  files_changed: 3
---

# Phase 36 Plan 03: Discover Tab + NLSearchBar Interaction Fixes Summary

**One-liner:** NLSearchBar loading guard, spinner, clear button, and DiscoverTab auto-submit prefill, 960px width, hasResults gating, and prefill sync — 7 interaction bugs fixed across 3 files.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix NLSearchBar — loading guard on Enter, spinner, clear button, onChange | 0471dbf | nl-search-bar.tsx |
| 2 | Fix DiscoverTab — auto-submit on prefill, hide discovery sections, width, prefill sync, clear wiring | 466522f | discover-tab.tsx, search-content.tsx |

## What Was Built

### Task 1 — NLSearchBar (M6, L1, M9 part 1)

- **M6 fixed:** `handleKeyDown` now checks `!isLoading` before calling `onSearch`, preventing duplicate requests when Enter is pressed during in-flight searches
- **L1 fixed:** Send button imports `Loader2` from lucide-react and renders `<Loader2 className="h-4 w-4 animate-spin" />` when `isLoading` is true; button opacity reduced to 0.7 during loading
- **M9 part 1:** Added optional `onClear` and `onChange` props to the interface. `handleChange` calls `onChange?.(newValue)` on every keystroke and calls `onClear()` when the textarea is cleared. An X button appears when text is present and `onClear` is provided.

### Task 2 — DiscoverTab + search-content.tsx call site (M4, M5, M7, M9 part 2, L3)

- **M4 fixed:** `SavedSearchShortcutList` and `SuggestedPersonasSection` wrapped in `{!hasResults && (...)}` — discovery sections hide when results are displaying
- **M5 fixed:** Container class changed from `max-w-[680px]` to `max-w-[960px]` — consistent width with results view
- **M7 fixed:** `handlePrefill` now calls `onNLSearch(query)` and `onSubmitSearch()` after `setPrefillValue(query)` — clicking a suggested persona fills the bar AND auto-submits
- **L3 fixed:** `useEffect(() => { setPrefillValue(keywords); }, [keywords])` syncs `prefillValue` when the `keywords` prop changes externally
- **M9 part 2:** `onClearSearch` prop accepted by DiscoverTab and passed as `onClear` to NLSearchBar; call site in `search-content.tsx` wires it as `() => setSearchState({ keywords: "", persona: "" })`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] search-content.tsx call site missing new required props**

- **Found during:** Task 2
- **Issue:** `DiscoverTab` interface gained required `hasResults: boolean` and optional `onClearSearch?: () => void`. The existing call site in `search-content.tsx` did not pass either prop — TypeScript would have failed compilation.
- **Fix:** Added `hasResults={results.length > 0}` and `onClearSearch={() => setSearchState({ keywords: "", persona: "" })}` to the `<DiscoverTab>` invocation in `search-content.tsx`
- **Files modified:** `src/app/[orgId]/search/components/search-content.tsx`
- **Commit:** 466522f

## Known Stubs

None — all data flows are real; no placeholder text or hardcoded empty values introduced.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. The `isLoading` guard on Enter (T-36-08) is implemented as specified.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| nl-search-bar.tsx exists | FOUND |
| discover-tab.tsx exists | FOUND |
| search-content.tsx exists | FOUND |
| Commit 0471dbf exists | FOUND |
| Commit 466522f exists | FOUND |
