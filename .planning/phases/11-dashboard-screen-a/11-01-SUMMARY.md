---
phase: 11
plan: 01
subsystem: dashboard-components
tags: [dashboard, components, stat-pills, persona-pills, lists-preview, presentational]
dependency_graph:
  requires: [src/lib/personas/types.ts, src/lib/lists/types.ts, src/components/ui/empty-state.tsx]
  provides: [StatPills, PersonaPillRow, RecentListsPreview]
  affects: [dashboard page assembly]
tech_stack:
  added: []
  patterns: [CSS variable hover via onMouseEnter/Leave, Server Component + Client Component split, font-mono numeric rendering]
key_files:
  created:
    - src/components/dashboard/stat-pills.tsx
    - src/components/dashboard/persona-pill-row.tsx
    - src/components/dashboard/recent-lists-preview.tsx
  modified: []
decisions:
  - StatPills is a pure Server Component (no interactivity needed — just renders numbers)
  - PersonaPillRow and RecentListsPreview are Client Components (onMouseEnter/Leave for CSS variable hover states)
  - RecentListsPreview returns null when no lists exist (clean no-render pattern)
  - PersonaPillRow shows EmptyState from shared UI when no personas exist
  - Pre-existing build failure in src/app/[orgId]/exports/ is out-of-scope (missing export-stat-cards and export-log-client components predating this plan)
metrics:
  duration: 74s
  completed: 2026-02-28
  tasks_completed: 3
  files_created: 3
  files_modified: 0
---

# Phase 11 Plan 01: Create Dashboard Sub-Components Summary

Three presentational dashboard sub-components built — StatPills (server), PersonaPillRow (client), RecentListsPreview (client) — using CSS variable tokens, Lucide icons, and the onMouseEnter/Leave hover pattern for design system compliance.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| T1 | Create StatPills component | bddc81b | src/components/dashboard/stat-pills.tsx |
| T2 | Create PersonaPillRow component | e4ec3ce | src/components/dashboard/persona-pill-row.tsx |
| T3 | Create RecentListsPreview component | 825b034 | src/components/dashboard/recent-lists-preview.tsx |

## What Was Built

### StatPills (`src/components/dashboard/stat-pills.tsx`)
- Pure Server Component — no `"use client"` directive
- Accepts `totals` prop with shape: `{ totalLogins, searchesExecuted, profilesViewed, profilesEnriched, csvExports, listsCreated }`
- Renders `STAT_ITEMS` array: Searches, Profiles Viewed, Enrichments, Exports, Lists
- `flex flex-wrap gap-2` horizontal layout
- Each pill: `bg-elevated` background, `border-subtle` border, `gold-primary` value color, `text-secondary` label color
- `font-mono` class for number rendering with `.toLocaleString()` formatting

### PersonaPillRow (`src/components/dashboard/persona-pill-row.tsx`)
- Client Component — uses `onMouseEnter`/`onMouseLeave` for CSS variable hover states
- Accepts `personas: Persona[]` and `orgId: string`
- Renders EmptyState (from `@/components/ui/empty-state`) when `personas.length === 0`
- Shows up to 8 pills; each links to `/${orgId}/search?persona=${persona.id}`
- When count exceeds 8, shows gold `+N more` pill linking to `/${orgId}/personas`
- Hover: border transitions `border-subtle` → `border-hover`, color `text-secondary` → `text-primary`
- Lucide `Users` icon (h-3.5 w-3.5) inside each pill
- `font-serif` heading "Target Personas" at 22px

### RecentListsPreview (`src/components/dashboard/recent-lists-preview.tsx`)
- Client Component — uses `onMouseEnter`/`onMouseLeave` for CSS variable hover states
- Accepts `lists: List[]` and `orgId: string`
- Returns `null` when list is empty (no-render pattern, not EmptyState)
- Shows up to 5 recent lists (name + member count)
- Header row: `font-serif` "Recent Lists" + "View All" link (hover: `text-secondary` → `gold-primary`)
- Row hover: background transitions `transparent` → `bg-elevated`
- Member count: `font-mono text-xs text-tertiary` with singular/plural ("prospect"/"prospects")
- Lucide `List` (aliased `ListIcon`) and `ArrowRight` icons

## Verification Results

- All 3 files exist in `src/components/dashboard/`
- TypeScript check: no errors in dashboard components
- No raw Tailwind color classes (zinc-*, gray-*, yellow-*, emerald-*) — confirmed
- No font-cormorant usage — confirmed (only font-serif)
- No emojis — confirmed
- All interactive elements have `cursor-pointer` — confirmed
- `pnpm build` has pre-existing failure in exports page (unrelated — logged below)

## Deviations from Plan

### Pre-existing Build Failure (Out of Scope)

**Found during:** Build verification (Task 3)
**Issue:** `src/app/[orgId]/exports/page.tsx` references `./components/export-stat-cards` and `./components/export-log-client` which do not exist. This failure exists on the `main` branch before this plan's commits (confirmed via `git stash` test).
**Action:** Logged to deferred items. Not caused by, not fixed by this plan.
**Scope:** This is a pre-existing issue in unrelated files — out of scope per deviation rules.

## Self-Check: PASSED

- src/components/dashboard/stat-pills.tsx: FOUND
- src/components/dashboard/persona-pill-row.tsx: FOUND
- src/components/dashboard/recent-lists-preview.tsx: FOUND
- Commit bddc81b: FOUND (feat(11-01): create StatPills component)
- Commit e4ec3ce: FOUND (feat(11-01): create PersonaPillRow component)
- Commit 825b034: FOUND (feat(11-01): create RecentListsPreview component)
