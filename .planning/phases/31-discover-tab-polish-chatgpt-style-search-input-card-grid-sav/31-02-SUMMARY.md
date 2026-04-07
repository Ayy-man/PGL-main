---
phase: 31-discover-tab-polish-chatgpt-style-search-input-card-grid-sav
plan: 02
subsystem: ui
tags: [react, tailwind, nextjs, search, discover-tab]

# Dependency graph
requires:
  - phase: 31-discover-tab-polish-chatgpt-style-search-input-card-grid-sav
    provides: NLSearchBar component with initialValue prop (Plan 01)
provides:
  - SavedSearchShortcutList as 3-column card grid with hover-lift effect
  - SuggestionCard empty state with 3 preset persona templates
  - onPrefillSearch callback wired through discover-tab via key remount strategy
affects:
  - 31-03 (discover tab plan 3 — may build on card grid)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "key remount pattern for seeding uncontrolled textarea from parent"
    - "sub-component pattern (SearchCard, SuggestionCard) inside same file for locality"

key-files:
  created: []
  modified:
    - src/app/[orgId]/search/components/saved-search-shortcut-list.tsx
    - src/app/[orgId]/search/components/discover-tab.tsx

key-decisions:
  - "Used key={prefillValue} remount strategy to seed NLSearchBar textarea without converting it to a fully controlled input"
  - "SuggestionCard and SearchCard defined as local sub-components in the same file for cohesion"
  - "maxItems default changed from 5 to 6 to fill 2-row grid at 3 cols"

patterns-established:
  - "Hover lift pattern: translateY(-1px) + var(--border-gold) + var(--gold-bg) on mouse enter/leave via useState"
  - "Section heading: text-[13px] uppercase tracking-wider font-medium + var(--text-tertiary)"
  - "Card shell: rounded-[14px] p-4 w-full text-left, border transition via inline style"

requirements-completed:
  - DISC-POLISH-C
  - DISC-POLISH-D

# Metrics
duration: 8min
completed: 2026-04-07
---

# Phase 31 Plan 02: SavedSearchShortcutList Card Grid + Suggestion Empty State Summary

**SavedSearchShortcutList rewritten as a responsive 3-column card grid with hover-lift effect and a suggested-personas empty state that pre-fills the NLSearchBar without submitting**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-07T17:30:00Z
- **Completed:** 2026-04-07T17:38:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced flat `<ul>` list with `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` card layout
- Added SearchCard and SuggestionCard sub-components with useState hover-lift (translateY(-1px) + gold border + gold background)
- Empty state renders 3 SUGGESTED_PERSONAS template cards (Finance Elite, Tech Founders, Real Estate Principals)
- Wired `onPrefillSearch` through discover-tab using `key={prefillValue}` remount strategy to seed NLSearchBar textarea

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite SavedSearchShortcutList as card grid** - `2a90abe` (feat)
2. **Task 2: Wire onPrefillSearch in discover-tab** - `09301aa` (feat)

## Files Created/Modified

- `src/app/[orgId]/search/components/saved-search-shortcut-list.tsx` - Complete rewrite: card grid, SearchCard, SuggestionCard, SUGGESTED_PERSONAS, onPrefillSearch prop
- `src/app/[orgId]/search/components/discover-tab.tsx` - Added useState import, prefillValue state, handlePrefill handler, key={prefillValue} on NLSearchBar, onPrefillSearch on SavedSearchShortcutList

## Decisions Made

- **Key remount strategy:** Used `key={prefillValue}` on NLSearchBar to re-seed its internal `useState(initialValue)` when a suggestion is clicked, avoiding the need to convert NLSearchBar to a fully controlled input.
- **Sub-components in same file:** SearchCard and SuggestionCard are local function components in saved-search-shortcut-list.tsx — keeps the grid logic cohesive and avoids unnecessary file proliferation.
- **maxItems default 6:** Changed from 5 to fit a clean 2-row layout in the 3-column grid.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `src/lib/search/__tests__/execute-research.test.ts` (unrelated to this plan's files). Out of scope per deviation rules — logged but not fixed.

## Known Stubs

None - all wiring is complete. Suggestion cards call `onPrefillSearch(query)` which sets the NLSearchBar textarea value. Real search cards call `onSelectSavedSearch(persona.id)` as before.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Card grid and empty state are complete and TypeScript-clean
- onPrefillSearch wired end-to-end: suggestion card click -> handlePrefill -> prefillValue state -> NLSearchBar remount with new initialValue
- Plan 03 can build on this foundation

---
*Phase: 31-discover-tab-polish-chatgpt-style-search-input-card-grid-sav*
*Completed: 2026-04-07*
