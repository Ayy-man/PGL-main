---
phase: "16"
plan: "03"
subsystem: "ui-components"
tags: [theme-picker, tenant-branding, ui]
dependency_graph:
  requires: [tenant-theme-map]
  provides: [theme-picker-component]
  affects: [onboarding-flow, admin-tenant-drawer]
tech_stack:
  added: []
  patterns: [css-variable-hover, inline-style-for-dynamic-values]
key_files:
  created:
    - src/components/ui/theme-picker.tsx
  modified: []
decisions:
  - "onMouseEnter/onMouseLeave for hover scale -- CSS variables and dynamic inline styles cannot be toggled via Tailwind hover: pseudo-classes"
  - "focus-visible ring for keyboard accessibility -- consistent with button.tsx pattern"
metrics:
  duration: "1 min"
  completed: "2026-03-09"
---

# Phase 16 Plan 03: ThemePicker Component Summary

**One-liner:** Visual theme picker with 8 gradient swatches, glow selection state, and keyboard accessibility using TENANT_THEMES map.

## What Was Built

### Task 1: ThemePicker Component
**Commit:** `46ce3f9`
**File created:** `src/components/ui/theme-picker.tsx`

A "use client" component that renders 8 circular color swatches from the `TENANT_THEMES` map. Each swatch displays a 135-degree gradient from the theme's main to accent color. The selected theme shows a centered white Check icon (lucide-react) with a glowing box-shadow ring using the theme's main color. Unselected swatches have a `var(--border-subtle)` border. Hover triggers `scale(1.1)` with 150ms transition. Each button has `title` and `aria-label` for tooltip and screen reader support. A label below displays the selected theme name using `var(--admin-text-secondary)`.

Props: `value: string` (current theme key) and `onChange: (theme: string) => void` (selection callback).

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- [x] All 8 swatches render with correct gradient colors (Object.entries maps gold through coral)
- [x] onClick fires onChange with correct theme key
- [x] Selected swatch shows white Check icon + glow box-shadow
- [x] Hover scale(1.1) transition with 150ms duration
- [x] title attribute provides native tooltip with theme label
- [x] aria-label for screen reader accessibility
- [x] focus-visible ring for keyboard navigation (tab + enter)
- [x] Label below shows selected theme name with fallback to "Gold"
- [x] ESLint passes clean (no warnings or errors)
- [x] No raw Tailwind colors -- uses CSS variables (--border-subtle, --admin-text-secondary)
- [x] No emojis

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `46ce3f9` | feat(16-03): create ThemePicker visual component |

## Self-Check: PASSED

- [x] src/components/ui/theme-picker.tsx -- FOUND
- [x] Commit 46ce3f9 -- FOUND
