---
phase: 05-ui-revamp
plan: 05
subsystem: ui
tags: [design-system, cormorant, tailwind, css-variables, gold-accents, dark-luxury]

# Dependency graph
requires:
  - phase: 05-01
    provides: CSS variable tokens, font stack setup, globals.css design system
  - phase: 05-02
    provides: Button gold variant, EmptyState component, surface-card pattern

provides:
  - Lists page with full-width horizontal cards and Cormorant typography
  - Dashboard page with 38px Cormorant greeting and stat pills navigation
  - Analytics page with Cormorant 36px stat values, gold period toggle, gradient chart containers
  - PlatformPulse with Cormorant 36px stats, gold-primary for non-zero values
  - Personas page with gold Create Persona CTA
  - ComingSoonCard with gold pill badge treatment

affects: [all remaining pages, 05-06, 05-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - onMouseEnter/Leave handlers for CSS variable hover states on horizontal cards
    - Cormorant 36px/700 pattern for stat values (gold non-zero, text-secondary zero)
    - HTML-safe JSON parse guard for analytics API (text() then JSON.parse)

key-files:
  created: []
  modified:
    - src/app/[orgId]/lists/components/list-grid.tsx
    - src/app/[orgId]/lists/components/create-list-dialog.tsx
    - src/app/[orgId]/page.tsx
    - src/app/[orgId]/dashboard/analytics/page.tsx
    - src/app/[orgId]/personas/page.tsx
    - src/app/admin/page.tsx
    - src/components/admin/platform-pulse.tsx
    - src/components/admin/coming-soon-card.tsx
    - src/components/charts/metrics-cards.tsx

key-decisions:
  - "onMouseEnter/Leave handlers used for CSS variable hover states on list cards — same pattern as nav items established in Plan 03"
  - "Cormorant 36px pattern extracted to MetricsCards and PlatformPulse StatCard for both analytics and admin dashboard"
  - "Dashboard simplified to greeting + search hero + stat pills — removed secondary action grid cards"
  - "HTML-safe JSON parse guard added to analytics fetch (text() then try/parse) per dashboard.md known bug"
  - "ComingSoonCard uses gold pill badge (gold-bg-strong/border-gold/gold-primary) per design system spec"

requirements-completed:
  - LIST-02
  - LIST-06
  - ANLY-02
  - ANLY-05
  - SA-01

# Metrics
duration: 6min
completed: 2026-02-26
---

# Phase 5 Plan 05: Apply Design System to Lists, Dashboard, Analytics, Admin, Personas Summary

**Horizontal list cards with Cormorant 20px names, 38px greeting dashboard, 36px gold stat values across analytics and admin, gold CTA buttons on all pages**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-26T02:22:22Z
- **Completed:** 2026-02-26T02:28:23Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Lists page rebuilt with full-width horizontal card stack: Cormorant 20px/600 list names, 22px/700 gold member counts, CSS variable hover transitions, download/delete/view actions per row
- Dashboard rebuilt with 38px Cormorant greeting (time-aware: morning/afternoon/evening), stat pills for quick navigation, CSS variable hero card hover
- Analytics page: Cormorant 36px stat values (gold for non-zero, muted for zero), 2/4-col grid, gold segmented period toggle, gradient chart containers with rounded-[14px] treatment
- PlatformPulse and MetricsCards upgraded to Cormorant 36px stats with gold-primary coloring for non-zero data
- ComingSoonCard upgraded to gold pill badge treatment per design system spec
- Personas page Create Persona CTA upgraded to `variant="gold"`
- Admin page RefreshCw icon uses gold-primary CSS variable instead of text-primary

## Task Commits

1. **Task 1: Rebuild Lists page with horizontal card layout and Cormorant typography** - `af524bc` (feat)
2. **Task 2: Update Dashboard, Analytics, Admin Dashboard, and Personas pages** - `915c135` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/app/[orgId]/lists/components/list-grid.tsx` - Replaced grid with flex-col vertical stack of horizontal cards; Cormorant names/gold counts; CSS var hover
- `src/app/[orgId]/lists/components/create-list-dialog.tsx` - Gold variant trigger button
- `src/app/[orgId]/page.tsx` - 38px Cormorant greeting with time-aware salutation; stat pills nav; CSS var hero hover
- `src/app/[orgId]/dashboard/analytics/page.tsx` - Cormorant 36px stats; gold period toggle; gradient chart containers; safe JSON parse guard
- `src/app/[orgId]/personas/page.tsx` - Gold variant on Create Persona CTA
- `src/app/admin/page.tsx` - Gold RefreshCw spinner; no raw color classes
- `src/components/admin/platform-pulse.tsx` - Cormorant 36px stats; gold-primary for non-zero; design system surface treatment
- `src/components/admin/coming-soon-card.tsx` - Gold pill badge (gold-bg-strong/border-gold/gold-primary)
- `src/components/charts/metrics-cards.tsx` - 2/4-col grid; Cormorant 36px; gold non-zero / text-secondary zero

## Decisions Made
- onMouseEnter/Leave handlers for CSS variable hover states on list cards — same pattern established in Plan 03 for nav items
- Dashboard body simplified: removed secondary action cards grid, replaced with stat pills (inline-flex rounded-full design system pills)
- HTML-safe JSON parse guard added to analytics fetch per dashboard.md known bug documentation
- ComingSoonCard badge converted to gold pill treatment per design system admin dashboard spec

## Deviations from Plan

None - plan executed exactly as written. All five pages updated per their respective page override specs.

## Issues Encountered
None. TypeScript compiled clean (`tsc --noEmit` zero errors). All 7 verification checks passed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All five remaining tenant-facing page surfaces now use design system tokens
- Lists, Dashboard, Analytics, Admin, and Personas pages ready for visual verification
- Phase 5 Plans 01-05 complete — remaining plans: 06 (prospect detail), 07 (final polish)

---
*Phase: 05-ui-revamp*
*Completed: 2026-02-26*

## Self-Check: PASSED

All files verified present. Both task commits confirmed in git log (af524bc, 915c135).
