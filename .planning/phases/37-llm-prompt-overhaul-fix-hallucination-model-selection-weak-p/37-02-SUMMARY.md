---
phase: 37-llm-prompt-overhaul-fix-hallucination-model-selection-weak-p
plan: 02
subsystem: enrichment, ui
tags: [exa, llm-prompt, signal-categories, signal-timeline, typescript]

# Dependency graph
requires:
  - phase: 37-llm-prompt-overhaul-fix-hallucination-model-selection-weak-p
    plan: 01
    provides: GPT-4o-mini model swap and SEC resolver individual-company evaluation
provides:
  - Exa digest prompt with 7 defined categories and explicit descriptions
  - negative_signal category in SignalCategory type (exa-digest.ts and database.ts)
  - Signal Timeline UI renders negative_signal with AlertTriangle icon and red (#ef4444) styling
affects:
  - enrichment pipeline (Exa signals categorized with new negative_signal category)
  - signal-timeline.tsx (filter dropdown and color rendering)
  - any consumer of SignalCategory type

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Category definitions pattern: LLM prompt enumerates categories with explicit descriptions, not bare names"
    - "Type propagation pattern: exa-digest.ts local type subset of database.ts full SignalCategory union"

key-files:
  created: []
  modified:
    - src/lib/enrichment/exa-digest.ts
    - src/types/database.ts
    - src/components/prospect/signal-timeline.tsx

key-decisions:
  - "exa-digest.ts local SignalCategory excludes sec_filing and market_event (those come from SEC EDGAR and market data sources, not Exa LLM output)"
  - "negative_signal uses red color palette (#ef4444) to visually distinguish risk signals from positive wealth signals"

patterns-established:
  - "Category definitions in LLM prompt: always include explicit descriptions, not bare enum values"

requirements-completed: [D-03]

# Metrics
duration: 12min
completed: 2026-04-10
---

# Phase 37 Plan 02: Exa Digest Category Definitions and negative_signal Summary

**7 defined categories with explicit descriptions in Exa digest prompt, negative_signal propagated from LLM output through TypeScript types to red-styled Signal Timeline UI**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-10T21:49:00Z
- **Completed:** 2026-04-10T22:01:35Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Replaced bare category list in Exa digest prompt with 7 categories each with an explicit English definition, reducing LLM miscategorization
- Added negative_signal to exa-digest.ts local SignalCategory type (subset — intentionally excludes sec_filing/market_event)
- Added negative_signal to database.ts full SignalCategory union (alongside sec_filing, market_event from other sources)
- Signal Timeline UI: AlertTriangle icon, "Negative Signal" label, red color (#ef4444), and entry in ALL_CATEGORIES filter array
- Build passes with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Exa digest prompt with defined categories and negative_signal, update both SignalCategory types** - `f906f67` (feat)
2. **Task 2: Add negative_signal to Signal Timeline UI with red/orange styling** - `35cd2d3` (feat)

## Files Created/Modified
- `src/lib/enrichment/exa-digest.ts` - Added negative_signal to local type; replaced bare category line with 7 definitions including explicit descriptions
- `src/types/database.ts` - Added negative_signal to global SignalCategory union
- `src/components/prospect/signal-timeline.tsx` - AlertTriangle import, getCategoryIcon/Label/Color cases, ALL_CATEGORIES entry

## Decisions Made
- exa-digest.ts local type intentionally excludes sec_filing and market_event — those categories are written by SEC EDGAR and market data enrichers, not by Exa LLM. Adding them to the LLM prompt would invite hallucinated SEC/market categorizations.
- Red (#ef4444) chosen for negative_signal to create clear visual contrast against the gold/green/blue palette used for positive signals.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- negative_signal is fully wired: LLM can now output it, TypeScript accepts it, and the UI renders it correctly
- Ready for plan 03 which continues LLM prompt overhaul work

---
*Phase: 37-llm-prompt-overhaul-fix-hallucination-model-selection-weak-p*
*Completed: 2026-04-10*
