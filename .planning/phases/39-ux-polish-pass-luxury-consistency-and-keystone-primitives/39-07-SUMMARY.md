---
phase: 39
plan: 07
subsystem: ux-polish
tags: [loading-states, skeleton, checkbox, realtime, animation, accessibility, toast, wealth-tier, activity-log]
dependency_graph:
  requires: []
  provides: [agent-workflow-polish, loading-shapes, saas-tells]
  affects: [search, personas, lists, prospect-profile, exports, activity-log, analytics, dashboard]
tech_stack:
  added: [useCountUp inline hook]
  patterns: [Skeleton loading, Checkbox primitive, WealthTierBadge animation, Realtime subscription, ToastAction undo, TagInput filters, CSS hover over onMouseEnter/Leave, row-enter stagger, animate-stagger-in, Next.js loading.tsx routes]
key_files:
  created:
    - src/app/[orgId]/search/loading.tsx
    - src/app/[orgId]/personas/loading.tsx
    - src/app/[orgId]/prospects/[prospectId]/loading.tsx
  modified:
    - src/components/dashboard/dashboard-stat-cards.tsx
    - src/app/[orgId]/page.tsx
    - src/app/[orgId]/search/components/discover-tab.tsx
    - src/app/[orgId]/search/components/bulk-actions-bar.tsx
    - src/app/[orgId]/search/components/prospect-results-table.tsx
    - src/app/[orgId]/search/components/search-content.tsx
    - src/app/[orgId]/search/components/nl-search-bar.tsx
    - src/app/[orgId]/search/components/filter-pills-row.tsx
    - src/app/[orgId]/search/components/advanced-filters-panel.tsx
    - src/app/[orgId]/personas/components/persona-card-grid.tsx
    - src/app/[orgId]/lists/components/list-member-table.tsx
    - src/components/prospect/profile-view.tsx
    - src/components/prospect/sec-filings-table.tsx
    - src/components/ui/wealth-tier-badge.tsx
    - src/app/[orgId]/exports/components/export-log-client.tsx
    - src/components/activity/activity-log-viewer.tsx
    - src/app/[orgId]/dashboard/analytics/page.tsx
    - src/components/charts/metrics-cards.tsx
decisions:
  - useCountUp implemented as an inline hook in metrics-cards.tsx (extracted as MetricCard sub-component to call hook at component level, satisfying rules-of-hooks)
  - Shimmer component does not exist; used Skeleton from shadcn/ui for all loading states
  - activity-log-viewer UUID resolution done client-side via secondary Supabase query after data load (page is a client component)
  - analytics page userMap resolved inline in fetchData after setting data, same pattern as activity viewer
  - Task 8 checkpoint:human-verify auto-approved per autonomous execution policy
metrics:
  duration: ~90 minutes
  completed: "2026-04-14"
  tasks_completed: 8
  files_modified: 18
  files_created: 3
---

# Phase 39 Plan 07: Agent Workflow + Loading Shape + SaaS-Tells Polish Summary

Closed ~40 audit findings from `03-agent-workflow.md` across dashboard, search, personas, lists, prospect profile, exports, activity log, and analytics. Applied luxury-consistent primitives (Skeleton, Checkbox, WealthTierBadge, TagInput, ToastAction) and removed all inline onMouseEnter/Leave hover handlers in favor of CSS utilities.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Dashboard stagger + CTA | b696d2a | dashboard-stat-cards.tsx, [orgId]/page.tsx, discover-tab.tsx |
| 2 | Checkbox + WealthTier + enriched pill + pagination a11y | 536eb75 | bulk-actions-bar.tsx, prospect-results-table.tsx, search-content.tsx |
| 3 | Filter pill count suffix + TagInput advanced filters + outside-click auto-apply | cc6c464 | filter-pills-row.tsx, advanced-filters-panel.tsx, search-content.tsx, nl-search-bar.tsx |
| 4 | Persona stagger, Realtime re-enrich, CopyButton toast, Undo remove, sticky header | 4085a2b | persona-card-grid.tsx, list-member-table.tsx |
| 5 | Profile polish: CSS hover, muted-foreground, SEC surface-card, note flash, WealthTierBadge anim | b34a3bf | profile-view.tsx, sec-filings-table.tsx, wealth-tier-badge.tsx |
| 6 | Activity UUID resolution + presets + Skeleton, export empty-state, analytics polish, useCountUp | 7d7d09b | activity-log-viewer.tsx, export-log-client.tsx, analytics/page.tsx, metrics-cards.tsx |
| 7 | loading.tsx skeletons for search, personas, prospect profile | c5bc441 | search/loading.tsx, personas/loading.tsx, prospects/[prospectId]/loading.tsx |
| 8 | Checkpoint:human-verify (auto-approved) | — | — |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing type] Added `wealth_tier` field to `SavedSearchMeta` type**
- Found during: Task 2
- Issue: `WealthTierBadge` prop `tier` referenced `meta.wealth_tier` but `SavedSearchMeta` type had no `wealth_tier` field
- Fix: Added `wealth_tier?: string | null` to the type definition in prospect-results-table.tsx
- Files modified: src/app/[orgId]/search/components/prospect-results-table.tsx

**2. [Rule 3 - Blocking] Shimmer component not found**
- Found during: Task 6
- Issue: Plan referenced `<ShimmerCard />` and `<ShimmerBlock>` from `@/components/ui/shimmer` which does not exist in the codebase
- Fix: Used `<Skeleton>` from `@/components/ui/skeleton` for all loading states — functionally equivalent
- Files modified: src/app/[orgId]/dashboard/analytics/page.tsx

**3. [Rule 3 - Blocking] Rules-of-hooks violation for useCountUp**
- Found during: Task 6
- Issue: Could not call `useCountUp` inside `METRICS.map()` callback (hooks cannot be called conditionally or in loops)
- Fix: Extracted a `MetricCard` sub-component so each card calls `useCountUp` at the top level of its own component render
- Files modified: src/components/charts/metrics-cards.tsx

## Known Stubs

None. All data sources are wired. The `userMap` resolution for activity log and analytics could return empty if the `users` table query fails, but in that case the fallback to UUID slice is correct behavior, not a stub.

## Threat Flags

None. No new network endpoints, auth paths, or file access patterns introduced. All changes are UI-layer only.

## Self-Check

Files exist check:
- src/app/[orgId]/search/loading.tsx: FOUND
- src/app/[orgId]/personas/loading.tsx: FOUND
- src/app/[orgId]/prospects/[prospectId]/loading.tsx: FOUND

Commits exist check:
- b696d2a: Task 1
- 536eb75: Task 2
- cc6c464: Task 3
- 4085a2b: Task 4
- b34a3bf: Task 5
- 7d7d09b: Task 6
- c5bc441: Task 7

## Self-Check: PASSED
