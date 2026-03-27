---
phase: 21-depth-polish-visual-refinement-pass
plan: "02"
subsystem: ui
tags: [tailwind, shadcn, radix-ui, animation, depth, sheet, dropdown, table]

# Dependency graph
requires:
  - phase: 21-01
    provides: Surface-card dual shadows, noise overlay, card glow, press-effect, stagger row-enter CSS classes
provides:
  - Backdrop blur on SheetOverlay (all Sheet consumers: tenant drawer, mobile nav, prospect slide-over)
  - Backdrop blur on DropdownMenuContent (TopBar, action menus)
  - row-hover-lift + press-effect + row-enter stagger on admin automation runs table rows (desktop and mobile)
affects:
  - 21-03 (final polish pass — builds on depth foundation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "backdrop-blur-sm on elevated overlays: bg-black/60 + backdrop-blur-sm on Sheet/Dialog overlays for physical depth perception"
    - "CSS depth classes replace JS state: row-hover-lift handles hover background+transform via pure CSS, removing React hoveredRow state"

key-files:
  created: []
  modified:
    - src/components/ui/sheet.tsx
    - src/components/ui/dropdown-menu.tsx
    - src/components/admin/automation-runs-table.tsx

key-decisions:
  - "SheetOverlay opacity reduced bg-black/80 -> bg-black/60 so backdrop blur is perceptible (too dark = blur invisible)"
  - "backdrop-blur-sm NOT added to DropdownMenuSubContent — lower priority, higher implementation risk per research"
  - "hoveredRow React state removed from automation-runs-table — row-hover-lift CSS class handles hover background + translateY(-1px) via var(--bg-card-hover), eliminating JS state management overhead"
  - "Mobile automation cards get press-effect + row-enter (not row-hover-lift) — div elements don't benefit from table-row transform lift pattern"

patterns-established:
  - "Backdrop blur on overlays: bg-black/60 backdrop-blur-sm (reduced opacity from /80 so blur is visible)"
  - "Admin table depth: row-hover-lift press-effect row-enter + Math.min(index*30,300)ms stagger replaces JS hover state"

requirements-completed:
  - VR-05
  - VR-06

# Metrics
duration: 8min
completed: "2026-03-27"
---

# Phase 21 Plan 02: Backdrop Blur and Admin Table Depth Summary

**backdrop-blur-sm on Sheet overlay and DropdownMenu content; row-hover-lift + press-effect + staggered row-enter on admin automation runs table**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-27T17:19:00Z
- **Completed:** 2026-03-27T17:27:03Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- SheetOverlay gets `backdrop-blur-sm` + `bg-black/60` (reduced from /80) — blur now perceptible; all Sheet consumers (tenant drawer, mobile nav, prospect slide-over) benefit automatically
- DropdownMenuContent gets `backdrop-blur-sm` — depth perception on action menus and TopBar dropdown; SubContent intentionally unchanged per research recommendation
- AutomationRunsTable desktop rows: `row-hover-lift press-effect row-enter` with Math.min(index*30, 300)ms stagger — matches list-member-table.tsx pattern
- AutomationRunsTable mobile cards: `press-effect row-enter` with matching stagger
- Removed `hoveredRow` React state from AutomationRunsTable — CSS class handles hover completely

## Task Commits

Each task was committed atomically:

1. **Task 1: Add backdrop blur to Sheet overlay and DropdownMenu content** - `715e3f2` (feat)
2. **Task 2: Wire depth classes to admin automation runs table** - `5d2dbb9` (feat)

## Files Created/Modified

- `src/components/ui/sheet.tsx` - SheetOverlay: bg-black/80 -> bg-black/60 backdrop-blur-sm, cleaned double-space
- `src/components/ui/dropdown-menu.tsx` - DropdownMenuContent: added backdrop-blur-sm after shadow-md
- `src/components/admin/automation-runs-table.tsx` - Data rows: row-hover-lift press-effect row-enter with stagger; mobile cards: press-effect row-enter with stagger; removed hoveredRow state

## Decisions Made

- SheetOverlay opacity reduced from /80 to /60 so backdrop blur remains visible against the dark overlay
- backdrop-blur-sm not applied to DropdownMenuSubContent (lower priority, per research recommendation)
- hoveredRow React state eliminated — row-hover-lift CSS class (`var(--bg-card-hover)` + `translateY(-1px)`) provides equivalent or better hover UX via pure CSS
- Mobile cards receive `press-effect` + `row-enter` but not `row-hover-lift` (table-row transform lift doesn't apply to div card elements)
- tenant-heatmap.tsx left untouched (uses its own `row-hover` admin hover system per plan scope boundary)

## Deviations from Plan

None - plan executed exactly as written.

The stale `.next` cache `ENOENT pages-manifest.json` error on first build attempt is a known recurring artifact (per Phase 14.1-05 and Phase 14.1 decisions). Cleared `.next/` and re-ran build; passed cleanly on second attempt.

## Issues Encountered

- First `pnpm build --no-lint` call hit stale `.next` cache error (`ENOENT: pages-manifest.json`) — resolved by clearing `.next/` and rebuilding. This is a known recurring issue in this project; build passed clean on second attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Sheet/Dialog/Dropdown elevated surface blur treatment complete — Plan 21-03 can build on this depth foundation for any remaining polish items
- Admin automation table now matches tenant-facing table depth treatment

---
*Phase: 21-depth-polish-visual-refinement-pass*
*Completed: 2026-03-27*
