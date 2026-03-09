---
phase: "17"
plan: "01"
subsystem: mobile-layout
tags: [mobile, responsive, layout, grid, dialog, drawer, touch-target]
dependency_graph:
  requires: []
  provides: [responsive-personas-layout, responsive-list-grid, mobile-safe-dialog, mobile-safe-drawer, touch-safe-sheet-close]
  affects: [personas-layout, persona-card-grid, tenant-detail-drawer, dialog, list-grid, sheet]
tech_stack:
  added: []
  patterns: [responsive-grid-collapse, surface-card-class, card-interactive-class, mobile-first-breakpoints]
key_files:
  created: []
  modified:
    - src/app/[orgId]/personas/components/personas-layout.tsx
    - src/app/[orgId]/personas/components/persona-card-grid.tsx
    - src/components/admin/tenant-detail-drawer.tsx
    - src/components/ui/dialog.tsx
    - src/app/[orgId]/lists/components/list-grid.tsx
    - src/components/ui/sheet.tsx
decisions:
  - "Sidebars hidden on mobile via hidden lg:block — mobile shows card grid only"
  - "card-interactive CSS class replaces inline onMouseEnter/Leave hover handlers on CTA button"
  - "surface-card CSS class replaces inline style + onMouseEnter/Leave on list cards"
  - "View link inline hover handlers removed — Button ghost variant handles hover"
metrics:
  duration: "302s (~5 min)"
  completed: "2026-03-09T06:09:28Z"
  tasks_completed: 6
  tasks_total: 6
  files_modified: 6
---

# Phase 17 Plan 01: Critical Layout Fixes Summary

Responsive grid collapse, mobile-safe dialogs/drawers, touch-safe close buttons, inline hover handler removal across 6 files.

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Personas Layout — Responsive Grid Collapse | dd1b02d | Replace inline gridTemplateColumns with cn() + lg: breakpoints; wrap sidebars in hidden lg:block |
| 2 | Persona Card Grid — Mobile-Safe Minimum Width | dd1b02d | grid-cols-1 sm:grid-cols-2 lg:auto-fill; remove inline hover handlers; card-interactive class |
| 3 | Tenant Detail Drawer — Responsive Width | dd1b02d | w-full sm:w-[680px] replaces fixed w-[680px] |
| 4 | Dialog Component — Mobile Margin + Responsive Padding + Title | dd1b02d | w-[calc(100%-2rem)] sm:w-full; p-4 sm:p-6; text-lg sm:text-[22px] |
| 5 | List Grid — Mobile Card Layout | dd1b02d | surface-card replaces inline styles + hover handlers; flex-col sm:flex-row stacking; responsive gaps/padding/title |
| 6 | Sheet Close Button — Touch-Safe Size | dd1b02d | p-1 padding + h-5 w-5 icon (was h-4 w-4 no padding) |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- pnpm build: exit 0 (clean pass)
- All 6 files modified as specified
- No horizontal overflow from fixed grid columns at 375px
- Inline onMouseEnter/onMouseLeave hover handlers removed from persona CTA and list cards
- CSS classes (surface-card, card-interactive) provide hover treatment via CSS instead of JS

## Key Changes Detail

### Personas Layout (Task 1)
- Added `cn` import from `@/lib/utils`
- Replaced inline `style={{ gridTemplateColumns: "220px 1fr 280px" }}` with Tailwind responsive classes
- `grid-cols-1 lg:grid-cols-[220px_1fr_280px]` (or `lg:grid-cols-[220px_1fr]` without activity)
- PersonasLibrarySidebar wrapped in `<div className="hidden lg:block">`
- LiveDataStream wrapped in `<div className="hidden lg:block">`

### Persona Card Grid (Task 2)
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]`
- CTA button: `card-interactive` class, responsive padding `p-5 md:p-7`, minHeight reduced to 180px
- Removed `onMouseEnter`/`onMouseLeave` JS handlers

### List Grid (Task 5)
- `surface-card` class replaces inline `style={{ background, border, boxShadow }}` + JS hover handlers
- `flex-col sm:flex-row` for mobile stacking
- Responsive padding: `p-4 sm:p-6 sm:px-7`
- Responsive title: `text-base sm:text-[20px]`
- Right side: `gap-3 sm:gap-6 mt-3 sm:mt-0`
- View link: removed inline `onMouseEnter`/`onMouseLeave`

## Self-Check: PASSED

- All 6 modified source files exist on disk
- SUMMARY.md created at .planning/phases/17-mobile-optimization/17-01-SUMMARY.md
- Commit dd1b02d verified in git log with all 6 files
