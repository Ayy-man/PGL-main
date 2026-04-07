---
phase: 31
plan: 01
subsystem: search-ui
tags: [search, ui, discover-tab, pill-input, chatgpt-style]
dependency_graph:
  requires: []
  provides: [nl-search-bar-pill, discover-tab-hero-upgrade]
  affects: [search-page]
tech_stack:
  added: []
  patterns: [pill-container, bottom-toolbar, radial-glow, ghost-link]
key_files:
  created: []
  modified:
    - src/app/[orgId]/search/components/nl-search-bar.tsx
    - src/app/[orgId]/search/components/discover-tab.tsx
decisions:
  - "Filters chip state (filtersOpen) lives in discover-tab, passed down as prop to NLSearchBar — keeps pill component stateless re: filter visibility"
  - "onSearch in pill calls both onNLSearch and onSubmitSearch to replace the removed Search button"
metrics:
  duration: ~8min
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_modified: 2
---

# Phase 31 Plan 01: ChatGPT-Style Search Pill + Discover Tab Hero Summary

**One-liner:** Pill-container NLSearchBar with gold toolbar (Filters chip + Mic + ArrowUp send) replacing flat input, plus 44/56px serif hero and radial glow in discover-tab.

## What Was Built

### NLSearchBar rewrite (nl-search-bar.tsx)
- Pill container: `rounded-[24px]` with `rgba(212,175,55,0.15)` border resting, `rgba(212,175,55,0.3)` focused + `0 0 0 3px rgba(212,175,55,0.06)` shadow
- Textarea sits at top of pill with no inner chrome (no left icon, no padding offsets)
- Bottom toolbar row: Filters chip (left) + Mic disabled + ArrowUp send (right)
- Filters chip switches between elevated/subtle resting and gold-bg/gold-border active states
- ArrowUp send button fills gold (`var(--gold-primary)`) when text present, muted when empty
- New props: `onToggleFilters`, `filtersOpen` — wired to Filters chip
- Old props preserved: `initialValue`, `onSearch`, `isLoading`
- Removed `Button` component and `Search` icon imports

### discover-tab.tsx upgrade
- Container: `max-w-[680px]` (from `max-w-2xl`)
- Hero heading: `text-[44px] sm:text-[56px] font-serif` (from `text-[32px] sm:text-[38px]`)
- Hero subtext gap: `mt-3` (from `mt-1`), size `text-[13px]` (from `text-[14px]`)
- Radial gold glow: `pointer-events-none absolute inset-0` inside `relative` wrapper
- `filtersOpen` state added; passed as prop to NLSearchBar; AdvancedFiltersPanel renders below pill when true
- Ghost "Save this search →" link appears only when `keywords.trim()` is truthy, calls `onSaveAsNewSearch`
- Old "Search" + "Save as new search" detached buttons removed
- All existing props (`onSubmitSearch`, `onSaveAsNewSearch`, `onNLSearch`, etc.) still wired

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 — NLSearchBar pill | 13a1b92 | feat(31-01): rewrite NLSearchBar as ChatGPT-style pill |
| Task 2 — discover-tab upgrade | 3a8952b | feat(31-01): upgrade discover-tab hero and wire pill search |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

No new security surface introduced. Changes are purely presentational (CSS, layout, event wiring). onSearch still passes `value.trim()` to parent; parent sanitizes before Apollo API call as before.

## Self-Check: PASSED

- `src/app/[orgId]/search/components/nl-search-bar.tsx` — exists, contains `rounded-[24px]`, `ArrowUp`, `onToggleFilters`, 2x `rgba(212,175,55`, no `Button` import
- `src/app/[orgId]/search/components/discover-tab.tsx` — exists, contains `max-w-[680px]`, `text-[44px]`, `radial-gradient`, 3x `filtersOpen`, `Save this search`, no `flex gap-3 mt-4`
- Commits 13a1b92 and 3a8952b exist in git log
- TypeScript: zero errors on nl-search-bar or discover-tab (pre-existing errors in unrelated test file execute-research.test.ts are out of scope)
