---
phase: 08-lead-search
plan: 01
subsystem: ui
tags: [nuqs, apollo, react, typescript, url-params]

# Dependency graph
requires:
  - phase: 07-layout-shell
    provides: Design system CSS variables (--gold-bg, --border-gold, --text-secondary-ds, etc.)
  - phase: 02-persona-search-lists
    provides: useSearch hook, Apollo search route, PersonaFilters schema

provides:
  - Extended useSearch hook with prospect + keywords URL params in single useQueryStates call
  - Apollo search API accepting optional filterOverrides body param
  - PersonaPills horizontal scrollable pill row component with gold active state

affects:
  - 08-02-search-layout
  - 08-03-results-table
  - 08-04-slide-over
  - 08-05-search-bar

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single useQueryStates call for all search URL params (no nuqs param collision)"
    - "filterOverrides spread pattern: { ...persona.filters, ...filterOverrides } for non-destructive merge"
    - "PersonaFilters defined before searchRequestSchema to avoid forward-reference issues"
    - "onMouseEnter/Leave for CSS variable hover states (Tailwind hover: cannot reference CSS custom properties)"

key-files:
  created:
    - src/app/[orgId]/search/components/persona-pills.tsx
  modified:
    - src/app/[orgId]/search/hooks/use-search.ts
    - src/lib/apollo/schemas.ts
    - src/app/api/search/apollo/route.ts

key-decisions:
  - "prospect and keywords added to EXISTING useQueryStates call — not a second call — avoids nuqs param collision (RESEARCH.md Pitfall 5)"
  - "filterOverrides uses spread merge so overrides replace persona fields selectively — other persona fields remain untouched"
  - "PersonaFilters reordered to precede searchRequestSchema in schemas.ts — Zod forward references not supported"
  - "getPersonaColor derives hue from char-code sum mod 360 for deterministic per-persona color without config"

patterns-established:
  - "PersonaPill hover state: onMouseEnter sets hovered=true → inline style reads CSS vars conditionally"
  - "Keywords change triggers page reset (same pattern as persona change) — page=1 implicit on any filter change"

requirements-completed: [SRCH-01, SRCH-04, SRCH-06]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 8 Plan 01: Search Hook Extension + PersonaPills Summary

**useSearch hook extended with prospect/keywords URL params, Apollo API extended with optional filterOverrides merge, and PersonaPills component with gold active state and CSS-variable hover transitions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T19:37:30Z
- **Completed:** 2026-02-28T19:39:31Z
- **Tasks:** 3 of 3
- **Files modified:** 4 (3 modified, 1 created)

## Accomplishments

- Extended useSearch hook with `prospect` and `keywords` in a single `useQueryStates` call, page-reset on keywords change, and `filterOverrides` in fetch body when keywords present
- Reordered schemas.ts to define PersonaFilters before searchRequestSchema, then added `filterOverrides: PersonaFilters.optional()` to the schema
- Updated Apollo route to destructure `filterOverrides` and merge with `persona.filters` via spread before calling `searchApollo`
- Created `PersonaPills` component with horizontal scrollable row, gold active state via CSS variables, onMouseEnter/Leave hover pattern, colored dots from ID hash, and dashed "New Persona" pill

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend useSearch hook** - `bfae3d6` (feat)
2. **Task 2: Extend Apollo API** - `276209f` (feat)
3. **Task 3: Create PersonaPills component** - `e1d899f` (feat)

## Files Created/Modified

- `src/app/[orgId]/search/hooks/use-search.ts` - Added prospect + keywords to useQueryStates, filterOverrides in fetch body, page-reset on keywords change
- `src/lib/apollo/schemas.ts` - Moved PersonaFilters before searchRequestSchema, added filterOverrides optional field
- `src/app/api/search/apollo/route.ts` - Destructures filterOverrides, merges with persona.filters before calling searchApollo
- `src/app/[orgId]/search/components/persona-pills.tsx` - New: horizontal pill row with gold active state, colored dots, CSS-variable hover, New Persona dashed pill

## Decisions Made

- `PersonaFilters` moved to precede `searchRequestSchema` in schemas.ts because Zod does not support forward references — the validator must be defined before it is referenced
- `filterOverrides` spread merge (`{ ...persona.filters, ...filterOverrides }`) replaces individual fields selectively — existing persona data unchanged where no override provided
- Single `useQueryStates` call for all URL params (prospect, keywords + existing) per RESEARCH.md Pitfall 5 to avoid nuqs param collision
- `getPersonaColor()` uses char-code sum mod 360 for deterministic per-persona colors without any configuration table

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Linter/formatter reverted an initial Write to schemas.ts (the tool caught the conflict). Re-read the file and confirmed the linter had actually applied the correct changes correctly before continuing.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `useSearch` hook is the canonical URL state manager — 08-02 (search layout) can wire PersonaPills directly using `searchState.persona` and `setSearchState`
- `filterOverrides` API extension is ready — 08-05 (search bar) can pass natural language keywords via this param
- `PersonaPills` component is ready to drop into search layout in 08-02
- No blockers for 08-02

---
*Phase: 08-lead-search*
*Completed: 2026-03-01*

## Self-Check: PASSED

- src/app/[orgId]/search/hooks/use-search.ts: FOUND
- src/lib/apollo/schemas.ts: FOUND
- src/app/api/search/apollo/route.ts: FOUND
- src/app/[orgId]/search/components/persona-pills.tsx: FOUND
- .planning/phases/08-lead-search/08-01-SUMMARY.md: FOUND
- commit bfae3d6 (Task 1): FOUND
- commit 276209f (Task 2): FOUND
- commit e1d899f (Task 3): FOUND
