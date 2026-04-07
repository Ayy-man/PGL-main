---
phase: 30-admin-global-api-keys-management-view-rotate-and-test-all-ex
plan: "04"
subsystem: admin-ui
tags: [admin, api-keys, integration-status, ui, components]
dependency_graph:
  requires:
    - "30-02"  # GET /api/admin/api-keys + types
    - "30-03"  # POST /api/admin/api-keys/test/[integration]
  provides:
    - /admin/api-keys page (integration card grid)
    - StatusBadge component
    - BreakerBadge component
    - IntegrationCard component
  affects:
    - admin navigation (new route)
    - Apollo mock mode visibility
tech_stack:
  added: []
  patterns:
    - client-side fetch with useCallback + useEffect
    - optimistic state update on mock toggle
    - CSS variable color-mix for themed backgrounds
key_files:
  created:
    - src/components/admin/api-keys/status-badge.tsx
    - src/components/admin/api-keys/breaker-badge.tsx
    - src/components/admin/api-keys/integration-card.tsx
    - src/app/admin/api-keys/page.tsx
  modified: []
decisions:
  - "StatusBadge mockActive prop overrides visual state even if underlying status is configured (Apollo can be configured + mock on simultaneously)"
  - "Test button disabled on status === missing — avoids misleading network calls when keys are absent"
  - "Optimistic mock toggle — updates local state on API success, logs error but keeps old state on failure"
  - "Page uses div-based layout inside admin layout that already wraps content in p-4 md:p-6 lg:p-8"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-07"
  tasks_completed: 3
  files_created: 4
  files_modified: 2
---

# Phase 30 Plan 04: Admin API Keys UI — Integration Card Grid Summary

**One-liner:** Responsive 9-card admin grid with per-integration status badges, masked env var previews, circuit breaker indicators, inline test results, and Apollo mock mode toggle — all driven by `/api/admin/api-keys` with no secret values touching the client.

## What Was Built

### StatusBadge (`src/components/admin/api-keys/status-badge.tsx`)
Color-coded pill badge for integration config status. Supports `configured` (green), `missing` (red), `partial` (amber), and `mockActive` override (amber "Mock Active"). Zero raw hex — all via CSS variables and `oklch()`.

### BreakerBadge (`src/components/admin/api-keys/breaker-badge.tsx`)
Inline indicator for circuit breaker state. Returns `null` for `state === "none"` (most integrations). Shows `closed` (green), `half_open` (amber), `open` (red) with dot + label.

### IntegrationCard (`src/components/admin/api-keys/integration-card.tsx`)
Full integration card with:
- Category label, integration name, description in header
- StatusBadge in top-right corner
- Env var rows: variable name + masked preview (or "— not set —")
- Apollo-only mock mode toggle (renders only when `hasMockMode === true`) — POSTs to `/api/admin/api-keys/config`
- BreakerBadge + external Docs link row
- Test Connection button (disabled when `status === "missing"`) — POSTs to `/api/admin/api-keys/test/[id]`
- Inline test result: latency + detail on success, error message on failure

### AdminApiKeysPage (`src/app/admin/api-keys/page.tsx`)
Page component that:
- Fetches `/api/admin/api-keys` with `cache: "no-store"` on mount
- Renders loading spinner, error state, 1/2/3 column responsive grid
- Security notice banner pointing to Vercel dashboard for key rotation
- Refresh button that re-fetches and shows spinning icon
- `handleMockModeChange` optimistically updates integration list state on mock toggle

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing Phase 29 build breakage**
- **Found during:** Task 3 (pnpm build acceptance criteria)
- **Issue:** `saved-searches-tab.tsx` imported `./search-sidebar-rail` and `./saved-search-view-header` which did not exist anywhere in the codebase. The main repo HEAD also had this build failure — it was pre-existing, not introduced by this plan.
- **Fix:** Created functional stub implementations for both components:
  - `src/app/[orgId]/search/components/search-sidebar-rail.tsx` — collapsible sidebar with persona list
  - `src/app/[orgId]/search/components/saved-search-view-header.tsx` — search name, count, refresh button
  Both stubs match the exact TypeScript interface expected by the caller and render meaningful UI.
- **Files modified:** 2 new files created
- **Commit:** `0f90b7e`

## Known Stubs

| File | What's Stubbed | Reason |
|------|---------------|--------|
| `src/app/[orgId]/search/components/search-sidebar-rail.tsx` | Full Phase 29 collapsible sidebar rail | Phase 29 plan 05+ will replace with complete implementation |
| `src/app/[orgId]/search/components/saved-search-view-header.tsx` | Full Phase 29 view header with filter chips | Phase 29 plan 05+ will replace with complete implementation |

Both stubs render functional UI that satisfies the TypeScript interface and allows the build to pass.

## Threat Flags

None. The `/admin/api-keys` page is served through the existing admin layout which already calls `requireSuperAdmin()` — no new auth surface introduced. API routes were implemented in plan 30-02 (guarded by `super_admin` role check). No raw secret values reach the client.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `src/components/admin/api-keys/status-badge.tsx` | FOUND |
| `src/components/admin/api-keys/breaker-badge.tsx` | FOUND |
| `src/components/admin/api-keys/integration-card.tsx` | FOUND |
| `src/app/admin/api-keys/page.tsx` | FOUND |
| Commit `39210eb` (StatusBadge + BreakerBadge) | FOUND |
| Commit `669d88b` (IntegrationCard) | FOUND |
| Commit `0f90b7e` (page + stubs) | FOUND |
| `pnpm build` exit 0 | PASSED |
