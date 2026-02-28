---
phase: 14-polish-verification
plan: 01
subsystem: ui
tags: [accessibility, design-system, loading-states, error-boundaries, wcag, tailwind, css-variables]

# Dependency graph
requires:
  - phase: 06-ui-redesign-foundation
    provides: design system tokens (destructive, success-muted, gold CSS variables)
  - phase: 07-layout-shell-navigation
    provides: globals.css page-enter animation, surface-card utilities
provides:
  - prefers-reduced-motion media query guard for .page-enter animation
  - Design-system-compliant error boundary buttons (gold pattern) across all 3 error boundaries
  - 5 loading.tsx skeleton files for exports, lists, list detail, activity, analytics routes
  - Zero raw Tailwind color classes in src/ (excluding shadcn toast internals)
affects: [14-02, any future phase modifying error boundaries or adding route segments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "@media (prefers-reduced-motion: reduce) placed immediately after .page-enter rule in globals.css"
    - "Error boundary gold button: inline style with bg gradient rgba(212,175,55,0.15→0.08), border-gold, gold-primary color"
    - "Loading skeletons use Skeleton component with rounded-[14px] for cards per MASTER.md border radius spec"

key-files:
  created:
    - src/app/[orgId]/exports/loading.tsx
    - src/app/[orgId]/lists/loading.tsx
    - src/app/[orgId]/lists/[listId]/loading.tsx
    - src/app/[orgId]/dashboard/activity/loading.tsx
    - src/app/[orgId]/dashboard/analytics/loading.tsx
  modified:
    - src/app/globals.css
    - src/components/prospect/lookalike-discovery.tsx
    - src/app/global-error.tsx
    - src/app/[orgId]/error.tsx
    - src/app/admin/error.tsx

key-decisions:
  - "prefers-reduced-motion: reduce guard adds animation: none override only — does not modify existing .page-enter rule (additive approach)"
  - "Error boundaries use inline style for gold gradient button — consistent with Phase 05 pattern where Tailwind v3 cannot apply CSS variable gradients via bg- classes"
  - "Loading skeleton files use rounded-[14px] for card-shaped skeletons per MASTER.md border radius spec; rounded-lg for row-shaped skeletons"

patterns-established:
  - "Accessibility: All page animations must have a prefers-reduced-motion override in globals.css"
  - "Error boundaries: gold gradient button pattern (inline style) replaces bg-primary across all error boundary files"
  - "Loading states: Skeleton-based loading.tsx required for every route segment with async data fetching"

requirements-completed: [UI-03, UI-05, UI-06]

# Metrics
duration: 8min
completed: 2026-03-01
---

# Phase 14 Plan 01: Polish & Verification — Cross-Cutting Design System Fix Summary

**prefers-reduced-motion WCAG guard + destructive/success token migration + gold error boundary buttons + 5 loading.tsx skeletons covering exports, lists, list detail, activity, and analytics routes**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-01T00:00:00Z
- **Completed:** 2026-03-01T00:08:00Z
- **Tasks:** 2
- **Files modified:** 10 (2 modified + 8 created/modified)

## Accomplishments
- Added WCAG 2.1 AA prefers-reduced-motion guard to globals.css — .page-enter fadeIn disabled when OS reduce motion is active
- Replaced all raw Tailwind red/green color classes in lookalike-discovery.tsx with design system semantic tokens (bg-destructive/10, text-destructive, bg-success-muted, text-success)
- Updated all 3 error boundary files (global-error.tsx, [orgId]/error.tsx, admin/error.tsx) to use gold gradient button pattern instead of generic bg-primary
- Created 5 missing loading.tsx skeleton files for route segments that fetch async data

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix accessibility and design system violations in globals.css and lookalike-discovery.tsx** - `5c9f581` (fix)
2. **Task 2: Polish error boundaries and add missing loading.tsx skeletons** - `4daef6f` (feat)

**Plan metadata:** pending docs commit (docs: complete plan)

## Files Created/Modified
- `src/app/globals.css` - Added @media (prefers-reduced-motion: reduce) guard after .page-enter rule
- `src/components/prospect/lookalike-discovery.tsx` - Replaced bg-red-500/10 border-red-500/20 text-red-400 with destructive tokens; bg-green-500/10 text-green-400 with success-muted/success tokens
- `src/app/global-error.tsx` - Gold gradient button replaces bg-primary inline
- `src/app/[orgId]/error.tsx` - Gold gradient button replaces bg-primary inline
- `src/app/admin/error.tsx` - Gold gradient button replaces bg-primary inline; added transition-all duration-200
- `src/app/[orgId]/exports/loading.tsx` - Created: header + 4 stat card skeletons + table skeleton
- `src/app/[orgId]/lists/loading.tsx` - Created: header + 6 grid card skeletons
- `src/app/[orgId]/lists/[listId]/loading.tsx` - Created: header + 8 row skeletons
- `src/app/[orgId]/dashboard/activity/loading.tsx` - Created: header + 10 row skeletons
- `src/app/[orgId]/dashboard/analytics/loading.tsx` - Created: header + 3 chart card skeletons

## Decisions Made
- prefers-reduced-motion guard is additive (adds after .page-enter) — existing rule left unchanged per plan instruction
- Error boundaries use inline style for gold gradient — consistent with established Phase 05 pattern where Tailwind v3 cannot apply CSS variable gradient values via bg- utility classes
- Loading skeletons match the existing pattern from src/app/[orgId]/loading.tsx: Skeleton component, space-y-6 wrapper, rounded-[14px] for cards

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Grep scan revealed false-positive matches for `slate-` pattern in `-translate-` CSS transform classes (nl-search-bar.tsx, page.tsx, top-bar.tsx) — these are transform utilities, not color violations. Only real violations were in lookalike-discovery.tsx as anticipated by plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 14-01 complete: all cross-cutting design system violations fixed
- Zero raw Tailwind color classes remain in src/ (outside shadcn toast internals)
- All route segments with async data fetching now have loading.tsx skeletons
- Error boundaries fully compliant with design system gold button pattern
- Ready for Phase 14-02 (next verification plan)

---
*Phase: 14-polish-verification*
*Completed: 2026-03-01*
