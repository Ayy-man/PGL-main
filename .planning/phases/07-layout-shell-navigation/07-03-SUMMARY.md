---
phase: 07-layout-shell-navigation
plan: "03"
subsystem: ui
tags: [next.js, layout, top-bar, supabase, mobile-responsive]

# Dependency graph
requires:
  - phase: 06-ui-redesign-foundation
    provides: TopBar component with search input, notification bell, and user avatar
  - phase: 07-01
    provides: Sidebar component wired into layout
provides:
  - TopBar component hidden on mobile (hidden lg:flex) so MobileSidebar header takes over below lg
  - Tenant layout ([orgId]/layout.tsx) uses TopBar with user session-derived name and initials
  - Duplicate ambient-glow divs removed from tenant layout (root layout is the single source)
  - Clean layout: root ambient glow > z-10 content > Sidebar + TopBar + page-enter main
affects: [07-04, 07-05, all tenant pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TopBar receives userName/userInitials from server layout — no client-side session fetching needed
    - hidden lg:flex pattern on TopBar ensures no double header on mobile
    - Ambient glow divs owned solely by root layout — tenant/admin layouts must NOT duplicate them

key-files:
  created: []
  modified:
    - src/components/layout/top-bar.tsx
    - src/app/[orgId]/layout.tsx

key-decisions:
  - "hidden lg:flex on TopBar ensures MobileSidebar header and TopBar never both show simultaneously"
  - "userName/userInitials derived server-side in layout from user.user_metadata.full_name or user.email fallback"
  - "Ambient glow divs removed from tenant layout — root layout.tsx is the sole owner"

patterns-established:
  - "TopBar hidden below lg: add 'hidden lg:flex' to header root element"
  - "User identity for TopBar: derive in server layout, pass as props (no extra client-side fetch)"

requirements-completed: []

# Metrics
duration: 1min
completed: 2026-03-01
---

# Phase 7 Plan 03: Wire TopBar into Tenant Layout Summary

**TopBar component wired into tenant layout with session-derived user initials, hidden on mobile via `hidden lg:flex`, and duplicate ambient glow divs removed**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-28T18:59:32Z
- **Completed:** 2026-02-28T19:00:16Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- TopBar now hides on mobile (`hidden lg:flex`) so MobileSidebar header takes over below lg breakpoint
- Tenant layout replaced inline `<header>` block with `<TopBar>` component, passing session-derived `userName` and `userInitials`
- Duplicate `ambient-glow-top` and `ambient-glow-bottom` divs removed from tenant layout (root layout is the single source)
- `Search` and `Bell` imports removed from `[orgId]/layout.tsx` — TopBar manages its own icons
- `pnpm build` passes with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Update TopBar to hide on mobile (below lg breakpoint)** - `dbd03c0` (feat)
2. **Task 2: Replace inline header with TopBar component in tenant layout** - `a1040fa` (feat)

## Files Created/Modified
- `src/components/layout/top-bar.tsx` - Added `hidden lg:flex` to root header element for mobile hide
- `src/app/[orgId]/layout.tsx` - Replaced inline `<header>` with `<TopBar>`, added user identity derivation, removed ambient glow duplication and unused imports

## Decisions Made
- `hidden lg:flex` on TopBar coordinates cleanly with MobileSidebar's `lg:hidden` — no JS state needed for mobile/desktop switching
- `userName` and `userInitials` derived server-side from `user.user_metadata.full_name ?? user.email` — avoids a second client-side auth call
- Ambient glow divs belong solely to root layout — any other layout that includes them creates stacking duplicates

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tenant layout now cleanly uses TopBar with real session data
- Desktop/mobile breakpoint coordination is in place
- Ready for Phase 07-04 (MobileSidebar wiring) and 07-05 (final layout polish)

---
*Phase: 07-layout-shell-navigation*
*Completed: 2026-03-01*
