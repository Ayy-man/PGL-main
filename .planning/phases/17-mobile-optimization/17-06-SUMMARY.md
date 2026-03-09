---
phase: "17"
plan: "06"
subsystem: mobile-feature-parity
tags: [mobile, search, accessibility, performance, css, touch-targets]
dependency_graph:
  requires: [17-02, 17-03, 17-05]
  provides: [mobile-search-access, ambient-glow-mobile-hide, scroll-affordance, reduced-motion-guard, responsive-skeletons, touch-targets]
  affects: [globals.css, mobile-sidebar, admin-mobile-sidebar, profile-tabs, loading-skeletons, layouts]
tech_stack:
  added: []
  patterns: [scroll-fade-right-css-utility, prefers-reduced-motion-universal-guard, responsive-layout-padding]
key_files:
  created: []
  modified:
    - src/app/globals.css
    - src/components/layout/mobile-sidebar.tsx
    - src/app/admin/admin-mobile-sidebar.tsx
    - src/components/prospect/profile-tabs.tsx
    - src/app/[orgId]/loading.tsx
    - src/app/admin/loading.tsx
    - src/app/[orgId]/exports/loading.tsx
    - src/app/[orgId]/lists/loading.tsx
    - src/app/[orgId]/dashboard/activity/loading.tsx
    - src/app/[orgId]/dashboard/analytics/loading.tsx
    - src/app/[orgId]/layout.tsx
    - src/app/admin/layout.tsx
decisions:
  - "Search icon link added to mobile header right side (next to hamburger) using Link component for client-side navigation"
  - "Universal prefers-reduced-motion guard replaces targeted .page-enter-only guard — covers all animations including animate-spin and animate-pulse"
  - "scroll-fade-right applied to profile-tabs outer wrapper (not inner overflow container) so fade stays fixed while tabs scroll"
  - "Layout padding made responsive (p-4 md:p-6) in both org and admin layouts — loading skeletons inherit this context"
metrics:
  duration: ~6min
  completed: "2026-03-09"
  tasks_completed: 6
  tasks_total: 6
  files_modified: 12
---

# Phase 17 Plan 06: Mobile Feature Parity Summary

Search icon in mobile header, ambient glow GPU savings, scroll affordance fade, universal reduced-motion guard, responsive loading skeletons, and 44px+ touch targets on hamburger buttons across 12 files.

## What Was Done

### Task 1: Mobile Search Access
Added a `Search` icon link to the mobile header bar in `mobile-sidebar.tsx`. The header was restructured with `justify-between` layout: tenant name on the left, search + hamburger on the right. The search link navigates to `/{orgId}/search` using Next.js `Link` for client-side navigation.

### Task 2: Ambient Glow Mobile Hide
Added `@media (max-width: 767px)` rule to `globals.css` that sets `display: none` on `.ambient-glow-top` and `.ambient-glow-bottom`. Eliminates GPU-intensive radial gradient compositing on mobile devices where the effect is barely visible.

### Task 3: Scroll Affordance
Added `.scroll-fade-right` CSS utility class to `globals.css` using `::after` pseudo-element with a gradient fade from transparent to `var(--bg-root)`. Applied to the `profile-tabs.tsx` outer wrapper (the positioned container) so the fade remains fixed while the inner tab bar scrolls horizontally.

### Task 4: Prefers-Reduced-Motion Guard
Replaced the targeted `.page-enter`-only guard with a comprehensive universal guard covering `*`, `*::before`, `*::after` with `animation-duration: 0.01ms !important`, `animation-iteration-count: 1 !important`, and `transition-duration: 0.01ms !important`. This covers animate-spin (Loader2 in prospect slide-over), animate-pulse (circuit breaker dots in admin), skeleton pulse animations, and page-enter transitions.

### Task 5: Loading Skeleton Mobile Alignment
Updated all 6 loading.tsx files with responsive patterns:
- `space-y-4 md:space-y-6` for vertical spacing
- `grid-cols-1 sm:grid-cols-2` base grids that expand at breakpoints
- `gap-3 md:gap-4` for responsive grid gaps
- `max-w-full` on fixed-width skeletons to prevent overflow on 375px viewports
- `w-full` on all skeleton cards
- `rounded-[14px]` border radius matching MASTER.md spec

Also made layout content padding responsive: `p-4 md:p-6` in org layout, `p-4 md:p-6 lg:p-8` in admin layout.

### Task 6: Mobile Sidebar Hamburger Touch Targets
Increased hamburger button from `h-9 w-9` to `h-11 w-11` (44px) on both `mobile-sidebar.tsx` and `admin-mobile-sidebar.tsx`, meeting WCAG 2.5.5 AAA touch target minimum.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Layout padding not responsive**
- **Found during:** Task 5
- **Issue:** Both org layout (`p-6`) and admin layout (`p-6 lg:p-8`) used fixed mobile padding, causing content to be too cramped on small screens or conversely too padded
- **Fix:** Made padding responsive: `p-4 md:p-6` for org, `p-4 md:p-6 lg:p-8` for admin
- **Files modified:** `src/app/[orgId]/layout.tsx`, `src/app/admin/layout.tsx`
- **Commit:** dcc4477

**2. [Rule 3 - Blocking] Scroll affordance target mismatch**
- **Found during:** Task 3
- **Issue:** Plan specified applying scroll-fade-right to prospect-slide-over tab bar, but prospect-slide-over.tsx has no tab bar. The horizontally scrollable tab bar is in profile-tabs.tsx.
- **Fix:** Applied scroll-fade-right to profile-tabs.tsx outer wrapper instead
- **Files modified:** `src/components/prospect/profile-tabs.tsx`
- **Commit:** dcc4477

## Verification

- `pnpm build` passes with exit 0
- All 12 files compile without TypeScript errors
- Mobile header shows Search + Hamburger with proper touch targets
- Ambient glow hidden below 768px viewport
- Scroll fade gradient visible on profile tab bar
- Universal reduced-motion guard covers all animation/transition properties
- Loading skeletons use responsive grids that collapse to single column on mobile

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1-6 | Mobile feature parity (all tasks) | dcc4477 | 12 files |
