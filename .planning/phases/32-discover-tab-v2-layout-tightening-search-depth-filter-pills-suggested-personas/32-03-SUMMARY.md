---
phase: 32-discover-tab-v2-layout-tightening-search-depth-filter-pills-suggested-personas
plan: "03"
subsystem: layout/navigation
tags: [sidebar, nav, badges, server-query, counts]
dependency_graph:
  requires: []
  provides: [sidebar-nav-count-badges]
  affects: [src/app/[orgId]/layout.tsx, src/components/layout/sidebar.tsx, src/components/layout/nav-items.tsx]
tech_stack:
  added: []
  patterns: [supabase-head-count-query, promise-all-parallel, prop-threading, iife-jsx-badge]
key_files:
  created: []
  modified:
    - src/app/[orgId]/layout.tsx
    - src/components/layout/sidebar.tsx
    - src/components/layout/nav-items.tsx
decisions:
  - Hoisted savedSearchCount + listsCount as outer-scope `let` vars (default 0) so they are accessible in JSX below the try/catch block
  - Used IIFE pattern in JSX to compute badge per nav item without restructuring component
  - Queries intentionally inside existing try block so RLS/network failures use the same error path; `?? 0` default prevents undefined badges
metrics:
  duration: "~8 min"
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_modified: 3
---

# Phase 32 Plan 03: Sidebar Nav Count Badges Summary

**One-liner:** Server-rendered pill badges on Saved Searches and Lists sidebar items via parallel Supabase head-count queries threaded through layout → Sidebar → NavItems.

## What Was Built

Live count badges on the "Saved Searches" and "Lists" sidebar navigation items. Counts are fetched server-side in `layout.tsx` using `Promise.all` with two `{ count: "exact", head: true }` queries against the `personas` and `lists` tables, scoped by `tenantScopeId`. The counts thread down as props: `layout.tsx` → `Sidebar` → `NavItems`. NavItems renders a rounded pill badge to the right of the label text when the sidebar is expanded; the badge is gold-tinted on the active nav item and subdued on inactive items. Badges are entirely hidden when the sidebar is collapsed.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Server-side count queries in layout.tsx + thread props to Sidebar | beade4a | src/app/[orgId]/layout.tsx |
| 2 | Thread counts through Sidebar and render badges in NavItems | a61878f | src/components/layout/sidebar.tsx, src/components/layout/nav-items.tsx |

## Decisions Made

1. **Outer-scope `let` with default 0:** `savedSearchCount` and `listsCount` are declared as `let` variables above the `try` block (initialized to `0`) and assigned inside. This is the same pattern used for `userName`, `userRole`, etc. in this layout — keeps them accessible in the JSX return below.

2. **IIFE badge pattern:** The badge is rendered via an immediately-invoked function expression inside the JSX (`{!collapsed && (() => { ... })()}`). This avoids restructuring the existing `<Link>` render while still being able to call `getBadgeCount(item.label)` per item.

3. **Queries inside existing try block:** Both head-count queries share the same error boundary as the tenant query. A failed count query surfaces in the same error path, but `?? 0` ensures the layout never renders with `undefined` badge values.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Variable scope fix for savedSearchCount / listsCount**
- **Found during:** Task 1 implementation review
- **Issue:** Plan's code snippet declared `savedSearchCount` and `listsCount` as `const` inside the `try` block. These would not be accessible in the JSX `return` statement outside the block.
- **Fix:** Declared both as `let` with default `0` above the `try` block, assigned (not declared) inside the try block — matching the existing pattern used for `userName`, `userRole`, `userInitials`.
- **Files modified:** src/app/[orgId]/layout.tsx
- **Commit:** beade4a

## Known Stubs

None — all badge counts come from live Supabase head-count queries. No hardcoded or placeholder values in the render path.

## Threat Flags

None — queries are scoped by `tenantScopeId` and go through the session client with RLS active. No new network endpoints or auth paths introduced. No new schema changes.

## Self-Check: PASSED

Files exist:
- FOUND: src/app/[orgId]/layout.tsx
- FOUND: src/components/layout/sidebar.tsx
- FOUND: src/components/layout/nav-items.tsx

Commits exist:
- FOUND: beade4a (feat(32-03): server-side personas + lists head-count queries in layout.tsx)
- FOUND: a61878f (feat(32-03): sidebar + nav-items pill badges for Saved Searches and Lists)

TypeScript: zero errors in all 3 plan-modified files.
