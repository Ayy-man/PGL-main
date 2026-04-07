---
phase: 32-discover-tab-v2-layout-tightening-search-depth-filter-pills-suggested-personas
plan: "01"
subsystem: search-ui
tags: [discover-tab, search-bar, layout, polish, ui]
dependency_graph:
  requires: []
  provides: [nl-search-bar-slim-props, discover-tab-v2-hero, stats-bar-strip]
  affects: [32-02, search-content]
tech_stack:
  added: []
  patterns: [inline-rgba-style, stacked-box-shadow-focus]
key_files:
  created: []
  modified:
    - src/app/[orgId]/search/components/nl-search-bar.tsx
    - src/app/[orgId]/search/components/discover-tab.tsx
decisions:
  - "Use inline rgba() style for NLSearchBar border/shadow — design tokens don't cover stacked box-shadow literals"
  - "Keep onApplyFilters in DiscoverTab props — Plan 02 will wire it to external filter pills row"
  - "Stats bar copy is static ('12,400+ prospects indexed · Updated 2 hours ago') — dynamic data deferred"
metrics:
  duration: 2 min
  completed: "2026-04-08"
  tasks_completed: 2
  files_modified: 2
---

# Phase 32 Plan 01: Discover Tab V2 — Hero Tighten, Stats Bar, Search Bar Depth Summary

NLSearchBar elevated to rgba(255,255,255,0.03) background with prominent gold focus state (stacked inner inset + outer ring); Filters chip removed from toolbar. DiscoverTab hero scaled down ~30% (32/40px), vertical space reclaimed, static stats bar trust strip inserted, and inline AdvancedFiltersPanel removed in preparation for Plan 02's external filter pills row.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Rewrite NLSearchBar — elevated bg, prominent gold focus, remove Filters chip | fbb4586 | nl-search-bar.tsx |
| 2 | Tighten DiscoverTab hero, add stats bar, remove inline AdvancedFiltersPanel | 160bb40 | discover-tab.tsx |

## What Was Built

**NLSearchBar (nl-search-bar.tsx):**
- Removed `onToggleFilters` and `filtersOpen` from props interface
- Removed `SlidersHorizontal` import
- Background changed from `var(--bg-input)` to `rgba(255,255,255,0.03)`
- Resting border: `rgba(212,175,55,0.18)` (up from 0.15)
- Focused border: `rgba(212,175,55,0.55)` (up from 0.30)
- Focused box-shadow: `inset 0 0 0 1px rgba(212,175,55,0.25), 0 0 0 4px rgba(212,175,55,0.08)` (premium stacked focus signal)
- Toolbar changed from `justify-between` to `justify-end`; Filters button removed
- Mic + ArrowUp send button preserved right-aligned, all behavior intact

**DiscoverTab (discover-tab.tsx):**
- Removed `AdvancedFiltersPanel` import and inline render
- Removed `filtersOpen` state (`useState(false)` dropped)
- Hero wrapper: `mb-8` → `mb-4`
- h1: `text-[44px] sm:text-[56px]` → `text-[32px] sm:text-[40px]`
- Subtext: `mt-3` → `mt-2`
- Stats bar strip added between hero and search area: "12,400+ prospects indexed · Updated 2 hours ago"
- NLSearchBar invocation cleaned: `onToggleFilters` / `filtersOpen` props removed
- `onApplyFilters` preserved in props destructure (Plan 02 dependency)
- Radial glow, ghost save link, SavedSearchShortcutList all preserved

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `pnpm tsc --noEmit` clean for nl-search-bar.tsx and discover-tab.tsx
- Pre-existing unrelated errors in `src/lib/search/__tests__/execute-research.test.ts` (out of scope, not introduced by this plan)

## Known Stubs

- Stats bar copy is static: "12,400+ prospects indexed · Updated 2 hours ago" — no live data source wired. This is intentional for the trust strip MVP; dynamic data can be wired in a future plan if desired.

## Threat Flags

None — changes are purely cosmetic/layout. No new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- `src/app/[orgId]/search/components/nl-search-bar.tsx` — exists, contains `rgba(255,255,255,0.03)`, no `SlidersHorizontal`, no `onToggleFilters`
- `src/app/[orgId]/search/components/discover-tab.tsx` — exists, contains `12,400+ prospects indexed`, `text-[32px] sm:text-[40px]`, no `AdvancedFiltersPanel`
- Commit fbb4586 — present in git log
- Commit 160bb40 — present in git log
