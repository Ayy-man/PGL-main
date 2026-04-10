---
phase: 33-tenant-issue-reporting-system
plan: "05"
subsystem: admin-nav
tags: [admin, nav, badge, polling, react-hooks]
dependency_graph:
  requires: ["33-04"]
  provides: ["admin-nav-issue-reports-badge"]
  affects: ["src/app/admin/admin-nav-links.tsx"]
tech_stack:
  added: []
  patterns: ["useCallback+useEffect polling with clearInterval cleanup", "inline badge span with hard-coded rgb() matching nav style convention"]
key_files:
  created: []
  modified:
    - src/app/admin/admin-nav-links.tsx
decisions:
  - "Used inline <span> badge (not shadcn Badge) to match existing nav style convention of inline styles with literal color values"
  - "Scoped badge render to item.href === '/admin/reports' so only that entry shows it, keeping the ADMIN_NAV_PLATFORM map generic"
  - "Added relative class only to ADMIN_NAV_PLATFORM Link elements, not ADMIN_NAV_SYSTEM_ACTIVE, since badge is platform-section-only"
metrics:
  duration: "5 minutes"
  completed: "2026-04-10"
  tasks_completed: 1
  files_modified: 1
---

# Phase 33 Plan 05: Admin Nav Badge Summary

Admin nav "Issue Reports" entry with live-polling unread badge — AlertTriangle icon, 30s setInterval polling, red pill (expanded) and red dot (collapsed) when open > 0.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Issue Reports nav entry + wire unread-count polling | e80b0f7 | src/app/admin/admin-nav-links.tsx |

## What Was Built

Single file edit to `src/app/admin/admin-nav-links.tsx` (170 lines → 207 lines after edit):

1. **New imports**: `useState`, `useCallback`, `useEffect` from React; `AlertTriangle` from lucide-react (added alphabetically into the existing lucide import block).

2. **New nav entry**: `{ label: "Issue Reports", href: "/admin/reports", icon: AlertTriangle, exact: false }` appended to `ADMIN_NAV_PLATFORM` array.

3. **Polling state + effect**: `openCount` state initialized to 0. `fetchUnreadCount` callback fetches `GET /api/admin/reports/unread-count` with `cache: "no-store"`, reads `{ open: N }`, silently ignores non-OK responses and fetch errors. `useEffect` calls `fetchUnreadCount()` immediately on mount then sets `setInterval(fetchUnreadCount, 30_000)` with `clearInterval` cleanup on unmount. Polling interval: **30,000ms**.

4. **Badge rendering** (inside ADMIN_NAV_PLATFORM map, scoped to `item.href === "/admin/reports"`):
   - Expanded sidebar: red pill `<span>` with `px-1.5 py-0.5 text-[10px] font-semibold text-white rounded-full` and `background: rgb(220, 38, 38)`. Shows count or "99+" when `openCount > 99`. Hidden when `openCount === 0`.
   - Collapsed sidebar: absolute-positioned red dot `h-2 w-2 rounded-full` at `top-1 right-1`. Requires `relative` on the Link — added as `relative flex items-center ...` to the ADMIN_NAV_PLATFORM Link className.

5. **Label wrapping**: Changed `{!collapsed && item.label}` to `{!collapsed && <span className="flex-1">{item.label}</span>}` so the label takes all available space and the badge pill floats right via `ml-auto`.

## Key Metrics

- Final line count: **207 lines** (target was ~190-220)
- Polling interval: **30,000ms**
- Collapsed-state dot: uses `absolute top-1 right-1` — renders correctly given `relative` added to Link

## Deviations from Plan

None — plan executed exactly as written. The `relative` class addition was anticipated in Change 5 of the plan and applied as specified.

## Known Stubs

None. The badge renders live data from the polling endpoint; no hardcoded placeholder values flow to the UI.

## Self-Check

- [x] `src/app/admin/admin-nav-links.tsx` exists and is 207 lines
- [x] Commit `e80b0f7` exists
- [x] All 17 grep acceptance criteria pass
- [x] `npx tsc --noEmit` reports zero errors in `admin-nav-links.tsx`

## Self-Check: PASSED
