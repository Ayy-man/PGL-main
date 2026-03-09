---
phase: "17"
plan: "05"
subsystem: spacing-components
tags: [responsive, spacing, charts, safe-area, mobile]
dependency-graph:
  requires: [17-01, 17-04]
  provides: [responsive-spacing, safe-area-insets, responsive-charts]
  affects: [all-cards, all-tables, all-charts, body-layout]
tech-stack:
  added: []
  patterns: [p-4-md-p-6, gap-responsive, viewport-fit-cover, env-safe-area-inset]
key-files:
  created: []
  modified:
    - src/app/[orgId]/page.tsx
    - src/components/ui/card.tsx
    - src/components/prospect/profile-view.tsx
    - src/app/admin/page.tsx
    - src/app/admin/users/page.tsx
    - src/app/admin/tenants/tenant-table.tsx
    - src/app/[orgId]/team/page.tsx
    - src/app/admin/tenants/new/page.tsx
    - src/app/admin/users/new/page.tsx
    - src/components/charts/usage-chart.tsx
    - src/components/admin/funnel-chart.tsx
    - src/app/layout.tsx
    - src/app/globals.css
    - src/components/layout/mobile-sidebar.tsx
    - src/components/ui/empty-state.tsx
decisions:
  - CardHeader/CardFooter also made responsive alongside CardContent for consistency
  - Admin dashboard gap-6 adapted to gap-3 md:gap-6 (plan expected gap-5)
  - Usage chart uses wrapper div h-[200px] md:h-[400px] with ResponsiveContainer height=100%
  - Viewport export used instead of meta tag per Next.js 14+ convention
  - invite-dialog.tsx has single full-width button, no flex stacking needed
metrics:
  duration: ~14 min
  completed: "2026-03-09T06:34:09Z"
---

# Phase 17 Plan 05: Spacing & Components Summary

Responsive padding/gap pattern (p-4 md:p-6) across all cards, tables, charts, and containers; form button stacking on mobile; chart height reduction for mobile; safe area insets for notched devices.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Dashboard page responsive gaps | 27ab93b | src/app/[orgId]/page.tsx |
| 2 | Card component responsive padding | 27ab93b | src/components/ui/card.tsx |
| 3 | Profile view responsive section padding | 27ab93b | src/components/prospect/profile-view.tsx |
| 4 | Admin dashboard responsive grid gaps | 27ab93b | src/app/admin/page.tsx |
| 5 | Table cell padding responsive | 27ab93b | admin/users/page.tsx, admin/tenants/tenant-table.tsx, [orgId]/team/page.tsx |
| 6 | Form button stacking | 27ab93b | admin/tenants/new/page.tsx, admin/users/new/page.tsx |
| 7 | Chart heights responsive | 27ab93b | charts/usage-chart.tsx, admin/funnel-chart.tsx |
| 8 | Safe area insets | 27ab93b | app/layout.tsx, globals.css, layout/mobile-sidebar.tsx |
| 9 | Empty state responsive padding | 27ab93b | components/ui/empty-state.tsx |

## Key Changes

### Responsive Padding (p-4 md:p-6 pattern)
- **CardHeader/CardContent/CardFooter** all use responsive padding -- every Card in the app inherits this automatically
- **Profile view** surface-card sections (Lookalike Discovery, Company Context) use p-4 md:p-6
- **Empty state** uses py-12 px-4 md:py-20 md:px-6

### Responsive Gaps
- Dashboard: space-y-4 md:space-y-8 for main container, gap-4 md:gap-6 for grid
- Admin dashboard: space-y-4 md:space-y-8, gap-3 md:gap-6 for all grids

### Table Cell Padding
- Headers: px-3 py-2 md:px-6 md:py-3 across admin users, tenants, and team tables
- Cells: px-3 py-3 md:px-6 md:py-4 across all table body cells
- Compatible with Plan 17-04 mobile card views (tables hidden on mobile via `hidden md:block`)

### Form Button Stacking
- Create Tenant and Create User forms use flex-col sm:flex-row for button groups
- Invite dialog has single full-width button -- no stacking change needed

### Chart Heights
- Usage chart: wrapper div h-[200px] md:h-[400px] with ResponsiveContainer height="100%"
- Funnel chart: wrapper div h-[200px] md:h-[280px] with ResponsiveContainer height="100%"
- Empty/skeleton states also use responsive heights

### Safe Area Insets
- Next.js Viewport export with viewportFit: "cover" (not meta tag -- Next.js 14+ convention)
- Body gets padding-left/right/bottom env(safe-area-inset-*) for notched devices
- Four utility classes: pb-safe, pt-safe, pl-safe, pr-safe
- Mobile sidebar header uses pl-safe for left safe area

## Deviations from Plan

### Adaptations

**1. CardHeader/CardFooter also made responsive**
- **Issue:** Plan only specified CardContent, but CardHeader (p-6) and CardFooter (p-6 pt-0) had same fixed padding
- **Fix:** Applied same p-4 md:p-6 pattern to all three sub-components for consistency
- **Rule:** Rule 2 -- critical completeness (inconsistent padding across card parts would look wrong)

**2. Admin dashboard gap-6 adapted to gap-3 md:gap-6**
- **Issue:** Plan expected gap-5 but actual file had gap-6
- **Fix:** Used gap-3 md:gap-6 (matching actual values) instead of gap-3 md:gap-5
- **Rule:** Rule 1 -- match actual code

**3. Next.js Viewport export instead of meta tag**
- **Issue:** Plan showed `<meta name="viewport">` diff but Next.js 14+ uses exported `viewport` constant
- **Fix:** Used `export const viewport: Viewport` with `viewportFit: "cover"`
- **Rule:** Rule 3 -- blocking issue (meta tag approach not valid for App Router)

**4. invite-dialog.tsx no changes needed**
- **Issue:** Plan expected DialogFooter with side-by-side buttons
- **Finding:** Dialog uses a single full-width submit button, no Cancel in the dialog body
- **Action:** Skipped -- no button pair to stack

## Verification

- pnpm build: exit 0
- All 16 files in plan accounted for (15 modified, 1 skipped with documented reason)
