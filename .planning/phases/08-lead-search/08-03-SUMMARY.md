---
phase: 08-lead-search
plan: 03
subsystem: ui
tags: [react, typescript, bulk-selection, design-system, lucide]

# Dependency graph
requires:
  - phase: 06-ui-redesign-foundation
    provides: "Shared WealthTierBadge component at @/components/ui/wealth-tier-badge"
  - phase: 08-lead-search
    provides: "ApolloPerson types, List types, AddToListDialog, existing ProspectResultCard"
provides:
  - "BulkActionsBar: select-all checkbox + count label + Add to List / Export CSV / Enrich Selection buttons"
  - "ProspectResultCard updated with optional checkbox selection and gold selected state"
  - "ProspectResultCard now uses shared WealthTierBadge (eliminates local duplicate)"
affects:
  - "08-04-PLAN: SearchContent wiring — will import BulkActionsBar and pass onSelect/selected to ProspectResultCard"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional checkbox rendering via optional onSelect prop — no checkbox renders unless bulk mode active"
    - "stopPropagation on checkbox change/click prevents card slide-over from triggering during bulk select"
    - "Gold selected state using CSS variable tokens (--gold-bg, --border-gold) matching design system pattern"

key-files:
  created:
    - "src/app/[orgId]/search/components/bulk-actions-bar.tsx"
  modified:
    - "src/app/[orgId]/search/components/prospect-result-card.tsx"

key-decisions:
  - "BulkActionsBar action buttons use ghost/gold button variants from design system (no raw Tailwind color classes)"
  - "Checkbox conditional: onSelect prop presence controls rendering, selected prop controls checked state"
  - "ProspectResultCard WealthTierBadge import migrated from local ./wealth-tier-badge to @/components/ui/wealth-tier-badge (Phase 6 canonical)"

patterns-established:
  - "Bulk selection UX: BulkActionsBar always visible, action buttons appear only when selectedCount > 0"
  - "Card selected state: three-way ternary — selected > hovered > default (matches shared ProspectCard pattern)"

requirements-completed: [SRCH-03, PROF-01, PROF-09, LIST-03]

# Metrics
duration: 8min
completed: 2026-03-01
---

# Phase 8 Plan 03: Bulk Actions Bar + ProspectResultCard Checkbox Summary

**BulkActionsBar component with select-all, count label, and three action buttons; ProspectResultCard updated with optional checkbox selection, gold selected state, and canonical shared WealthTierBadge import**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-01T00:00:00Z
- **Completed:** 2026-03-01T00:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created BulkActionsBar with select-all checkbox, count display, and three context-aware action buttons (Add to List, Export CSV, Enrich Selection) that only appear when items are selected
- Updated ProspectResultCard to optionally render a checkbox for bulk selection mode with proper stopPropagation to preserve card click behavior
- Eliminated local WealthTierBadge duplicate by migrating ProspectResultCard import to the canonical shared component

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BulkActionsBar component** - `2901f68` (feat)
2. **Task 2: Update ProspectResultCard — checkbox, shared import, selected state** - `bf2e673` (feat)

## Files Created/Modified
- `src/app/[orgId]/search/components/bulk-actions-bar.tsx` - New component: select-all checkbox, count label, three action buttons (ghost: Add to List, Export CSV; gold: Enrich Selection)
- `src/app/[orgId]/search/components/prospect-result-card.tsx` - Added selected/onSelect props, conditional checkbox rendering, gold selected state, migrated WealthTierBadge import

## Decisions Made
- BulkActionsBar uses `variant="ghost"` for Add to List and Export CSV, `variant="gold"` for Enrich Selection — consistent with design system button hierarchy (gold = primary action)
- Action buttons in BulkActionsBar only render when `selectedCount > 0` — keeps toolbar clean in zero-selection state while checkbox remains always visible for "Select All" affordance
- Checkbox `onChange` and `onClick` both call `stopPropagation()` — onChange fires `onSelect()`, onClick prevents card's `onClick` from triggering slide-over

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- First `git add` + `git commit` for Task 2 failed with "nothing to commit" due to concurrent commits from parallel phase executions (phases 09, 11 were executing simultaneously). Re-staged and committed successfully on second attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- BulkActionsBar ready to be imported in Plan 04 (SearchContent wiring)
- ProspectResultCard ready to receive `selected` and `onSelect` props from SearchContent
- Both components standalone and type-safe — no further changes expected before wiring
