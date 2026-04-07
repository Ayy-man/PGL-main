---
phase: 30-admin-global-api-keys-management-view-rotate-and-test-all-ex
plan: "05"
subsystem: admin-ui
tags: [admin, navigation, api-keys, nav-link]
dependency_graph:
  requires:
    - "30-04"  # /admin/api-keys page
  provides:
    - Active nav link from admin sidebar to /admin/api-keys
  affects:
    - admin sidebar navigation (System Config section)
tech_stack:
  added: []
  patterns:
    - Next.js Link with pathname-based active state
    - Split nav arrays: active links vs disabled stubs
key_files:
  created: []
  modified:
    - src/app/admin/admin-nav-links.tsx
decisions:
  - "Split ADMIN_NAV_SYSTEM into ADMIN_NAV_SYSTEM_ACTIVE and ADMIN_NAV_SYSTEM_STUBS to allow per-item active/disabled control without changing visual order"
  - "Reused identical Link + isActive pattern from Platform Control section for consistency"
metrics:
  duration: "~2 minutes"
  completed: "2026-04-07"
  tasks_completed: 1
  files_created: 0
  files_modified: 1
---

# Phase 30 Plan 05: Enable Global API Keys Nav Item Summary

**One-liner:** Promoted the disabled "Global API Keys" stub button to an active `<Link>` pointing to `/admin/api-keys` with gold active-state highlighting — closing the navigation loop for the page built in Plan 30-04.

## What Was Built

### admin-nav-links.tsx (modified)

Split the monolithic `ADMIN_NAV_SYSTEM` constant (all-disabled array) into two arrays:

- `ADMIN_NAV_SYSTEM_ACTIVE` — contains the single live item: `{ label: "Global API Keys", href: "/admin/api-keys", icon: Key, exact: false }`
- `ADMIN_NAV_SYSTEM_STUBS` — contains the remaining three disabled items: Master Data Schema, Security Policies, Integrations

Rendering order in System Config section:
1. Active links map (`ADMIN_NAV_SYSTEM_ACTIVE`) — uses identical `<Link>` + `isActive` pattern from Platform Control section (gold background + left border on active route, hover state when inactive)
2. Disabled stubs map (`ADMIN_NAV_SYSTEM_STUBS`) — unchanged button elements with `opacity-60` and "Coming soon" title

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — the Global API Keys link points to a fully-implemented page (built in 30-04). The other three System Config items remain intentional stubs (Master Data Schema, Security Policies, Integrations) per plan scope.

## Threat Flags

None. No new routes or auth surfaces introduced — only changed how an existing route is linked from the sidebar.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `href: "/admin/api-keys"` in admin-nav-links.tsx | FOUND |
| `ADMIN_NAV_SYSTEM_ACTIVE` constant | FOUND |
| `ADMIN_NAV_SYSTEM_STUBS` constant | FOUND |
| Old `ADMIN_NAV_SYSTEM = [` removed | CONFIRMED |
| Commit `f4cc5de` | FOUND |
| `pnpm build` exit 0 | PASSED |
