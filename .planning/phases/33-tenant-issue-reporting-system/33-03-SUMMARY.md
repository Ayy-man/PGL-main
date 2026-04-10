---
phase: 33-tenant-issue-reporting-system
plan: "03"
subsystem: tenant-ui
tags: [report-issue, mount-points, prospect, list, personas, search]
dependency_graph:
  requires: ["33-02"]
  provides: ["tenant-mount-points"]
  affects: ["prospect-dossier", "list-detail", "personas-index", "search-content"]
tech_stack:
  added: []
  patterns: ["server-component imports client-component", "additive header mount"]
key_files:
  created: []
  modified:
    - src/app/[orgId]/prospects/[prospectId]/page.tsx
    - src/app/[orgId]/lists/[listId]/page.tsx
    - src/app/[orgId]/personas/page.tsx
    - src/app/[orgId]/search/components/search-content.tsx
decisions:
  - "Prospect page wraps ProfileView in a flex column with a right-aligned button row above it — additive, no ProfileView refactor"
  - "List detail button appended to existing flex header row after member count"
  - "Personas button placed in a new flex wrapper around the page header div — right-aligned, does not break existing layout"
  - "Search button mounted in the tab bar right slot via ml-auto div — inside SearchContent (use client), no boundary change"
  - "Search snapshot captures searchState.keywords and searchState.persona (the selected persona ID) as query/filters fields"
metrics:
  duration: ~15 min
  completed: 2026-04-10
  tasks_completed: 2
  files_modified: 4
---

# Phase 33 Plan 03: Tenant Mount Points Summary

Mount `<ReportIssueButton>` on all four locked tenant page locations so tenants can report issues with full contextual snapshots.

## What Was Built

Four additive mounts of `ReportIssueButton` (created in Plan 33-02) across the tenant-facing page tree:

1. **Prospect dossier** (`src/app/[orgId]/prospects/[prospectId]/page.tsx`) — button appears in a right-aligned row above `<ProfileView>`. Snapshot: `{ name, title, company, linkedin_url, email }` sourced from the `prospect` row fetched by the server component.

2. **List detail** (`src/app/[orgId]/lists/[listId]/page.tsx`) — button appended to the existing flex header row (after the member count text). Snapshot: `{ name, description, member_count }` where `member_count` is `members.length` (the loaded array length, not a stale DB count).

3. **Personas index** (`src/app/[orgId]/personas/page.tsx`) — button placed in a new `flex items-start justify-between` wrapper around the existing page-header div, right-aligned. Snapshot: `{ scope: "personas_index", persona_count: personas?.length ?? 0 }`.

4. **Search page** (`src/app/[orgId]/search/components/search-content.tsx`) — button rendered inside the tab bar row via `ml-auto` div, to the right of the Discover/Saved tabs. Snapshot: `{ query: searchState.keywords, filters: searchState.persona, result_count: activeResultCount }`.

## Variable Names Used

| Page | Data Variable | Fields Used |
|------|---------------|-------------|
| Prospect dossier | `prospect` | `prospect.id`, `prospect.name`, `prospect.title`, `prospect.company`, `prospect.linkedin_url`, `prospect.email` |
| List detail | `list`, `members` | `list.id`, `list.name`, `list.description`, `members.length` |
| Personas | `personas` | `personas?.length` |
| Search | `searchState`, `activeResultCount` | `searchState.keywords`, `searchState.persona`, `activeResultCount` |

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1: Prospect + List | `7535704` | `prospects/[prospectId]/page.tsx`, `lists/[listId]/page.tsx` |
| 2: Personas + Search | `395ecb9` | `personas/page.tsx`, `search/components/search-content.tsx` |

## Deviations from Plan

**1. [Rule 3 - Blocking] Worktree rebased onto 33-02 merge commit**
- **Found during:** Plan start — `report-issue-button.tsx` did not exist in the worktree (based on `27814e0`)
- **Issue:** Plan 33-03 depends on 33-02 components but worktree was branched from the pre-phase base. Main repo had 33-02 merged at `8ec66a3`.
- **Fix:** Rebased worktree branch onto `8ec66a3` before executing tasks.
- **Files modified:** No source files — git operation only.

**2. [Rule 1 - Layout] Prospect page has no header in page.tsx — ProfileView renders everything**
- **Found during:** Task 1 — `page.tsx` only returns `<ProfileView>`. No header row exists to append to.
- **Fix:** Wrapped the return in a `flex flex-col gap-4` div with a right-aligned `flex justify-end` button row above `<ProfileView>`. Additive — ProfileView unchanged.

## Known Stubs

None — all snapshot fields are sourced from live server-fetched data.

## Threat Flags

None — these are purely additive UI mounts. No new network endpoints, auth paths, or data access patterns introduced.

## Self-Check: PASSED

- `src/app/[orgId]/prospects/[prospectId]/page.tsx` — contains `ReportIssueButton` + `type: "prospect"`: FOUND
- `src/app/[orgId]/lists/[listId]/page.tsx` — contains `ReportIssueButton` + `type: "list"`: FOUND
- `src/app/[orgId]/personas/page.tsx` — contains `ReportIssueButton` + `type: "persona"`: FOUND
- `src/app/[orgId]/search/components/search-content.tsx` — contains `ReportIssueButton` + `type: "search"`: FOUND
- `src/app/[orgId]/settings/` — zero hits for `ReportIssueButton`: CONFIRMED
- `src/app/admin/` — zero hits for `ReportIssueButton`: CONFIRMED
- Commits `7535704` and `395ecb9` exist in git log: CONFIRMED
- TypeScript: zero new errors in modified files (pre-existing errors in `capture-screenshot.ts` and test files are out of scope)
