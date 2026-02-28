---
phase: 07-layout-shell-navigation
plan: "01"
subsystem: ui
tags: [navigation, sidebar, lucide-react, next.js, layout]

# Dependency graph
requires:
  - phase: 06-ui-redesign-foundation
    provides: Design system tokens, CSS variables, nav component patterns established
provides:
  - Updated NAV_ITEMS array with 6 items in v2.0 priority order
  - Dashboard nav item with exact pathname matching
  - Lead Discovery replacing Search label
  - exact field on nav items for precise active state logic
affects:
  - 07-02 (sidebar/shell wiring uses these nav items)
  - 07-03 and beyond (all pages rely on sidebar nav)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "exact field on nav items controls isActive matching strategy — Dashboard uses exact match, all others use startsWith"
    - "fullHref derived from item.href: root / maps to /${orgId}, all others use /${orgId}${item.href}"

key-files:
  created: []
  modified:
    - src/components/layout/nav-items.tsx

key-decisions:
  - "exact: true on Dashboard nav item prevents it being active on every sub-page (root route false-positive problem)"
  - "fullHref for Dashboard computed as /${orgId} (no trailing slash) to match Next.js pathname behavior"
  - "FileDown imported alongside LayoutDashboard for future export nav item without requiring another import pass"

patterns-established:
  - "Nav item shape: { label, href, icon, exact } — exact boolean controls active matching strategy"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 7 Plan 01: Update Tenant Navigation Items Summary

**Tenant sidebar nav updated to v2.0 structure: Dashboard first with exact-match active logic, Search renamed to Lead Discovery, 6 items in UX-priority order (Dashboard > Lead Discovery > Personas > Lists > Activity > Analytics)**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-28T18:56:37Z
- **Completed:** 2026-02-28T18:57:29Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added Dashboard as first nav item linking to `/${orgId}` with exact pathname match (not startsWith) to prevent false active state on sub-pages
- Renamed "Search" to "Lead Discovery" per v2.0 redesign spec
- Reordered nav from [Search, Lists, Personas, Activity, Analytics] to [Dashboard, Lead Discovery, Personas, Lists, Activity, Analytics]
- Added `exact` field to NAV_ITEMS shape; isActive logic now branches on it
- Imported `LayoutDashboard` and `FileDown` from lucide-react (FileDown available for future export nav item)

## Task Commits

Each task was committed atomically:

1. **Task 07-01-T1: Update NAV_ITEMS array and imports in nav-items.tsx** - `da32f15` (feat)

## Files Created/Modified

- `src/components/layout/nav-items.tsx` - Updated NAV_ITEMS array with 6 items, exact field, updated isActive logic and fullHref derivation, added LayoutDashboard/FileDown imports

## Decisions Made

- `exact: true` on Dashboard item prevents the root `/${orgId}` path from appearing active on every sub-page (e.g., `/${orgId}/search` would otherwise match startsWith logic)
- `fullHref` for Dashboard computed as `/${orgId}` (not `/${orgId}/`) to match Next.js usePathname() output which never includes a trailing slash on root
- `FileDown` imported alongside `LayoutDashboard` to avoid a future import pass when the export nav item is added

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Build verification: `pnpm build` produced an ENOENT error on `.next/server/pages-manifest.json` — a pre-existing environment issue from a prior interrupted build, not caused by this change. TypeScript compilation (`npx tsc --noEmit`) passed cleanly with zero errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- NAV_ITEMS are updated and ready for 07-02 (sidebar/shell wiring into layout)
- All 6 nav items reference real existing routes
- Dashboard active state logic is correct and isolated to exact root match

---
*Phase: 07-layout-shell-navigation*
*Completed: 2026-02-28*
