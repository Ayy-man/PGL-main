---
phase: 21-depth-polish-visual-refinement-pass
plan: "01"
subsystem: tenant-ui
tags: [depth, polish, animation, css-utilities, visual-refinement]
dependency_graph:
  requires: [globals.css CSS utility classes from quick task 260327-usu]
  provides: [depth-polish coverage on 6 tenant-facing components]
  affects: [prospect-result-card, persona-card, list-grid, activity-feed, export-log-client, metrics-cards]
tech_stack:
  added: []
  patterns: [row-hover-lift, press-effect, card-glow, row-enter stagger, surface-card-featured]
key_files:
  created: []
  modified:
    - src/app/[orgId]/search/components/prospect-result-card.tsx
    - src/app/[orgId]/search/components/persona-card.tsx
    - src/app/[orgId]/lists/components/list-grid.tsx
    - src/components/dashboard/activity-feed.tsx
    - src/app/[orgId]/exports/components/export-log-client.tsx
    - src/components/charts/metrics-cards.tsx
decisions:
  - "prospect-result-card and persona-card keep inline style approach for hover (manages selected + hover simultaneously); only gold glow appended to existing boxShadow"
  - "list-grid uses card-glow press-effect added to existing animate-stagger-in; row-enter not added to avoid animation conflict"
  - "export-log-client mobile cards get row-enter stagger alongside desktop TableRow rows"
  - "metrics-cards is use client component, so row-enter is safe (no SSR invisible flash)"
metrics:
  duration: "~2 min"
  completed: "2026-03-27"
  tasks_completed: 2
  files_modified: 6
---

# Phase 21 Plan 01: Depth and Polish — Tenant UI Component Wiring Summary

Wire existing depth/polish CSS utility classes (defined in globals.css during quick task 260327-usu) to 6 tenant-facing components that previously lacked them.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire depth classes to search cards, persona cards, list grid, activity feed | 3799a02 | prospect-result-card.tsx, persona-card.tsx, list-grid.tsx, activity-feed.tsx |
| 2 | Wire depth classes to export log table and stat cards featured line | d801958 | export-log-client.tsx, metrics-cards.tsx |

## Changes by Component

### prospect-result-card.tsx
- Added `press-effect` class to outer div className
- Added gold glow `0 0 20px rgba(212, 175, 55, 0.06)` appended to `var(--card-shadow-hover)` in hover boxShadow
- Retained existing `hover:translate-y-[-1px]` Tailwind class (no `row-hover-lift` added to avoid conflict)

### persona-card.tsx (search variant)
- Added `press-effect` class to outer button className
- Added gold glow `0 0 20px rgba(212, 175, 55, 0.06)` appended to `var(--card-shadow-hover)` in hover boxShadow

### list-grid.tsx
- Added `card-glow press-effect` to list card className alongside existing `animate-stagger-in`
- Did NOT add `row-enter` (would conflict with existing `animate-stagger-in` animation)

### activity-feed.tsx
- Changed `.map((entry) =>` to `.map((entry, index) =>` to expose stagger index
- Added `row-enter` to entry div className
- Added `animationDelay: ${Math.min(index * 30, 300)}ms` inline style (capped at 300ms)

### export-log-client.tsx
- Added `row-hover-lift press-effect row-enter` + stagger delay to desktop TableRow data rows (not header)
- Added `row-enter` + stagger delay to mobile card entries
- Header TableRow untouched

### metrics-cards.tsx
- Added `surface-card-featured` alongside `surface-card` on stat card divs (gold crown gradient line)
- Added `row-enter` class with `index * 60ms` stagger delay for entrance animation
- Added `index` parameter to `METRICS.map` callback

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None introduced in this plan.

## Verification

- All 6 files contain at least 1 depth/polish CSS class match
- `pnpm build --no-lint` exits 0 (confirmed from main project directory)
- Header TableRow in export-log-client.tsx does NOT contain `row-hover-lift`
- `Math.min(index * 30, 300)` stagger cap applied in activity-feed.tsx and export-log-client.tsx

## Self-Check: PASSED

Files verified:
- src/app/[orgId]/search/components/prospect-result-card.tsx — FOUND (press-effect, gold glow)
- src/app/[orgId]/search/components/persona-card.tsx — FOUND (press-effect, gold glow)
- src/app/[orgId]/lists/components/list-grid.tsx — FOUND (card-glow press-effect)
- src/components/dashboard/activity-feed.tsx — FOUND (row-enter)
- src/app/[orgId]/exports/components/export-log-client.tsx — FOUND (row-hover-lift press-effect row-enter)
- src/components/charts/metrics-cards.tsx — FOUND (surface-card-featured row-enter)

Commits verified:
- 3799a02 — feat(21-01): wire depth classes to search cards, persona cards, list grid, activity feed
- d801958 — feat(21-01): wire depth classes to export log table and dashboard stat cards
