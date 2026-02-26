---
phase: 05-ui-revamp
plan: 07
subsystem: ui
tags: [recharts, css-variables, design-system, admin, tailwind]

requires:
  - phase: 05-03
    provides: Shell layout, sidebar, nav CSS variable patterns
  - phase: 05-04
    provides: Search page, prospect cards, design system tokens
  - phase: 05-05
    provides: Dashboard, analytics, admin stat cards with Cormorant/gold tokens
  - phase: 05-06
    provides: Prospect slide-over panel, surface-card utility

provides:
  - Zero hardcoded hex colors in all Recharts components (admin charts + usage chart)
  - Admin table pages (tenants, users) using design system header/border/hover patterns
  - Admin form pages (tenants/new, users/new) using surface-card treatment and gold CTAs
  - Status toggle components using success/destructive CSS variable tokens
  - Complete design system coverage across all admin pages

affects: [future-admin-pages, chart-components]

tech-stack:
  added: []
  patterns:
    - Recharts contentStyle uses var(--card)/var(--border)/var(--foreground) — cannot use Tailwind classes
    - Recharts axis stroke/tick uses var(--muted-foreground) for consistent muted axis labels
    - Line/bar colors in chart config use CSS variable strings ("var(--gold-primary)")
    - text-[var(--success)] and text-destructive for semantic status colors in heatmap
    - bg-[var(--success-muted)] and text-[var(--success)] for active status badges
    - surface-card utility on all admin form card containers

key-files:
  created: []
  modified:
    - src/components/admin/enrichment-health-chart.tsx
    - src/components/admin/funnel-chart.tsx
    - src/components/admin/tenant-heatmap.tsx
    - src/components/admin/error-feed.tsx
    - src/components/charts/usage-chart.tsx
    - src/app/admin/tenants/page.tsx
    - src/app/admin/tenants/new/page.tsx
    - src/app/admin/tenants/tenant-status-toggle.tsx
    - src/app/admin/users/page.tsx
    - src/app/admin/users/new/page.tsx
    - src/app/admin/users/user-status-toggle.tsx
    - src/app/admin/analytics/page.tsx

key-decisions:
  - "Recharts LabelList style={{ fill: var(--muted-foreground) }} — Recharts accepts CSS variable strings as fill values in JS style objects"
  - "UsageChart line colors replaced with CSS variable strings in LINES config constant — passed to stroke/activeDot.fill props"
  - "TenantHeatmap uses text-[var(--success)] and text-[var(--warning)] Tailwind arbitrary value syntax for semantic heatmap tiers"
  - "Admin status badges use bg-[var(--success-muted)]/text-[var(--success)] and bg-destructive/10/text-destructive"
  - "Admin form cards use surface-card utility class (gradient glass surface) + border-[var(--border-default)]"
  - "Gold CTA buttons: bg-[var(--gold-bg-strong)] border-[var(--border-gold)] text-[var(--gold-primary)] pattern"

patterns-established:
  - "Pattern: All Recharts style objects use var() CSS variable references for theme-awareness"
  - "Pattern: Admin table headers use text-[11px] font-semibold uppercase tracking-wider (per dashboard.md spec)"
  - "Pattern: Admin table rows use border-border/50 and hover:bg-muted/30 (lighter than MASTER spec)"
  - "Pattern: success-muted/success token pair for active status, destructive/10/destructive for inactive"

requirements-completed: [UI-01]

duration: 7min
completed: 2026-02-26
---

# Phase 5 Plan 07: Admin Charts and Pages Design System Migration Summary

**All Recharts hardcoded hex colors replaced with var() CSS variable references; admin table/form pages migrated to design system tokens with gold CTAs, surface-card treatment, and semantic status badges**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-26T02:33:23Z
- **Completed:** 2026-02-26T02:40:00Z
- **Tasks:** 1 of 2 completed (Task 2 is visual verification checkpoint — awaiting human approval)
- **Files modified:** 12

## Accomplishments

- Removed every hardcoded hex color (#18181b, #3f3f46, #f4f4f5, #a1a1aa, #27272a, #d4af37) from all Recharts components
- Migrated admin table pages (tenants, users) to design system header/row/hover/badge patterns per dashboard.md spec
- Updated admin form pages to use surface-card treatment, border-default inputs with gold focus ring, and gold submit buttons
- Auto-fixed status toggle components and analytics error block as Rule 2 (missing design system compliance in related files)
- TypeScript compiles clean (tsc --noEmit passes)

## Task Commits

1. **Task 1: Migrate Recharts components and admin pages from hardcoded hex to CSS variables** - `43e523d` (feat)

**Plan metadata:** TBD after checkpoint completion

## Files Created/Modified

- `src/components/admin/enrichment-health-chart.tsx` - CartesianGrid, XAxis/YAxis stroke/tick, Tooltip contentStyle all use var() references
- `src/components/admin/funnel-chart.tsx` - Tooltip contentStyle, LabelList fill styles use var() references
- `src/components/admin/tenant-heatmap.tsx` - Heatmap tier classes: text-destructive, text-[var(--success)], text-[var(--warning)]
- `src/components/admin/error-feed.tsx` - Badge classes use destructive and success CSS variable tokens
- `src/components/charts/usage-chart.tsx` - LINES color config uses var(--gold-primary), var(--chart-2), var(--success), var(--chart-5)
- `src/app/admin/tenants/page.tsx` - Table header text-[11px] font-semibold, border-border/50, hover:bg-muted/30; gold CTA button
- `src/app/admin/tenants/new/page.tsx` - surface-card treatment, border-default inputs, gold focus ring, gold submit button
- `src/app/admin/tenants/tenant-status-toggle.tsx` - success-muted/destructive tokens
- `src/app/admin/users/page.tsx` - Table header text-[11px] font-semibold, border-border/50, hover:bg-muted/30; role badge gold; gold CTA button
- `src/app/admin/users/new/page.tsx` - surface-card treatment, border-default inputs, gold focus ring, gold submit button
- `src/app/admin/users/user-status-toggle.tsx` - success-muted/destructive tokens
- `src/app/admin/analytics/page.tsx` - Error block uses destructive/30 border and destructive/10 background

## Decisions Made

- Recharts LabelList `style={{ fill: "var(--muted-foreground)" }}` — Recharts accepts CSS variable strings in JS style objects
- UsageChart LINES config stores CSS variable strings ("var(--gold-primary)") — passed directly to stroke and activeDot.fill
- TenantHeatmap uses Tailwind arbitrary value syntax `text-[var(--success)]` for CSS variable-based semantic colors
- Admin form cards use `surface-card` utility class (matches all other card surfaces in the app)
- Gold CTA button pattern: `bg-[var(--gold-bg-strong)] border border-[var(--border-gold)] text-[var(--gold-primary)]`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed TenantStatusToggle and UserStatusToggle color classes**
- **Found during:** Task 1 (verification scan)
- **Issue:** Status toggle components used `bg-green-500/10 text-green-500` and `bg-red-500/10 text-red-500` — raw Tailwind color classes violating design system
- **Fix:** Replaced with `bg-[var(--success-muted)] text-[var(--success)]` and `bg-destructive/10 text-destructive`
- **Files modified:** src/app/admin/tenants/tenant-status-toggle.tsx, src/app/admin/users/user-status-toggle.tsx
- **Verification:** grep scan confirms no green-*/red-* classes remain in admin directory
- **Committed in:** 43e523d (Task 1 commit)

**2. [Rule 2 - Missing Critical] Fixed analytics page error block color classes**
- **Found during:** Task 1 (verification scan)
- **Issue:** Admin analytics page error div used `border-red-900 bg-red-950 text-red-300` — raw Tailwind colors
- **Fix:** Replaced with `border-destructive/30 bg-destructive/10 text-destructive`
- **Files modified:** src/app/admin/analytics/page.tsx
- **Verification:** grep scan confirms no red-[0-9] classes remain
- **Committed in:** 43e523d (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 2 — missing design system compliance in adjacent admin files)
**Impact on plan:** Necessary to achieve complete zero-raw-color-class coverage across admin section. No scope creep.

## Issues Encountered

None — all changes applied cleanly. TypeScript compiles without errors.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All admin chart components and pages now use design system CSS variable tokens
- Zero hardcoded hex colors remain in any admin/chart component
- Visual verification (Task 2 checkpoint) is required to confirm the dark luxury aesthetic renders correctly in browser
- Phase 5 UI revamp will be complete after visual verification is approved

---
*Phase: 05-ui-revamp*
*Completed: 2026-02-26*
