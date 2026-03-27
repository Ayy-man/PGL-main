---
phase: quick
plan: 260327-usu
subsystem: ui/css
tags: [css, animation, depth, polish, dark-luxury]
tech-stack:
  added: []
  patterns: [dual-shadow, pseudo-element-crown-line, staggered-animation, noise-overlay]
key-files:
  created: []
  modified:
    - src/app/globals.css
    - src/app/layout.tsx
    - src/components/layout/sidebar.tsx
    - src/app/[orgId]/lists/components/list-member-table.tsx
    - src/components/prospect/wealth-signals.tsx
    - src/components/prospect/profile-header.tsx
    - src/app/[orgId]/lists/components/member-status-select.tsx
decisions:
  - surface-card-featured uses ::after pseudo-element for gold crown gradient (border-image incompatible with border-radius)
  - row-hover-lift hover state inside @media (hover: hover) guard consistent with existing pattern
  - noise-overlay at z-index 9999 with pointer-events: none to not block interactions
  - enrichmentSourceStatus unused param renamed to _enrichmentSourceStatus to satisfy ESLint (pre-existing bug)
metrics:
  duration: ~8 minutes
  completed: 2026-03-27
  tasks_completed: 2
  files_modified: 7
---

# Quick Task 260327-usu: Depth and Polish — Dual Shadows, Gradient Border, Staggered Animations

**One-liner:** Layered depth pass adding dual-shadow cards, SVG noise grain overlay, gold crown lines, staggered row entrance animations, card glow on hover, and click press feedback across the dark luxury UI.

## Objective

Visual refinement pass elevating the dark luxury aesthetic with CSS utility classes applied globally and wired into key components.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add CSS utility classes to globals.css + noise overlay + sidebar shadow | 65ceb0f | globals.css, layout.tsx, sidebar.tsx |
| 2 | Apply CSS utility classes to components | 4211252 | list-member-table.tsx, wealth-signals.tsx, profile-header.tsx, member-status-select.tsx |

## What Was Built

### globals.css Changes

- **surface-card** and **card-interactive**: Updated `box-shadow` to dual-layer (`inset 0 1px 0` highlight + `0 4px 24px` outer shadow)
- **surface-card-featured**: New class with `::after` pseudo-element providing a gold crown gradient line (`transparent → rgba(212,175,55,0.3) → transparent`) at the top edge
- **row-hover-lift**: Table row hover with `translateY(-1px)` lift and shadow
- **press-effect**: `scale(0.995)` on `:active` for tactile click feedback
- **card-glow**: Gold outer glow (`rgba(212,175,55,0.06)`) on hover + border highlight
- **row-enter**: `fadeInUp` entrance animation (0.3s, opacity 0 → 1, translateY 8px → 0)
- **badge-pulse / badge-pulse-urgent**: Subtle opacity pulse for status badges (2s / 1s)
- **noise-overlay**: Fixed SVG fractal noise at z-index 9999 with mix-blend-mode overlay and 0.4 opacity
- New keyframes: `fadeInUp`, `pulse-subtle`
- All new animations automatically covered by existing `@media (prefers-reduced-motion: reduce)` rule

### layout.tsx

- Added `<div className="noise-overlay" aria-hidden="true" />` as first child of `<body>` before `<NuqsAdapter>`

### sidebar.tsx

- Added `boxShadow: "4px 0 24px rgba(0, 0, 0, 0.3)"` to desktop `<aside>` for rightward depth

### Component Wiring

- **list-member-table.tsx**: Desktop `<TableRow>` elements get `row-hover-lift press-effect row-enter` with 30ms per-row stagger delay
- **wealth-signals.tsx**: Each signal card div gets `card-glow press-effect row-enter` with 60ms per-card stagger delay
- **profile-header.tsx**: Profile card gets `surface-card-featured` class; manual `rgba(212,175,55,0.12)` top-accent div removed (replaced by CSS pseudo-element with gradient)
- **member-status-select.tsx**: `<Badge>` in `<SelectValue>` gets `badge-pulse` class when `status === "new"`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing unused `enrichmentSourceStatus` parameter in ProfileHeader**

- **Found during:** Task 2 verification (pnpm build)
- **Issue:** `enrichmentSourceStatus` was declared in destructuring but never used — TypeScript/ESLint error causing build failure
- **Fix:** Renamed to `_enrichmentSourceStatus` to satisfy the `Allowed unused args must match /^_/u` ESLint rule
- **Files modified:** `src/components/prospect/profile-header.tsx`
- **Commit:** 4211252

## Known Stubs

None — all new utility classes are fully wired CSS with no placeholder data.

## Self-Check: PASSED

- `src/app/globals.css` — modified with all 9 utility classes
- `src/app/layout.tsx` — noise overlay div present
- `src/components/layout/sidebar.tsx` — boxShadow added
- `src/app/[orgId]/lists/components/list-member-table.tsx` — row classes applied
- `src/components/prospect/wealth-signals.tsx` — card-glow classes applied
- `src/components/prospect/profile-header.tsx` — surface-card-featured applied
- `src/app/[orgId]/lists/components/member-status-select.tsx` — badge-pulse applied
- Commits `65ceb0f` and `4211252` verified present
- `pnpm build` exits 0 with no new errors
