---
phase: 13-admin-dashboard
plan: 01
subsystem: api, ui
tags: [redis, upstash, admin-dashboard, platform-pulse, api-quota]

# Dependency graph
requires:
  - phase: 04-super-admin-health-dashboard
    provides: Redis api_usage key pattern (api_usage:{provider}:{YYYY-MM-DD}), track-api-usage.ts infra
  - phase: 07-layout-shell-navigation
    provides: admin layout shell, surface-admin-card CSS utility, design system CSS variables
provides:
  - /api/admin/quota GET endpoint returning per-provider 7-day totals from Upstash Redis
  - ApiQuotaCard component with gold progress bars, skeleton state, empty state
  - PlatformPulse grid with 4 real stat cards (no ComingSoonCard placeholders)
affects: [14-polish, any future admin analytics pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Inline super_admin auth check in Route Handlers (not requireSuperAdmin) — Phase 04 locked decision
    - redis.mget batch read for N keys in single round-trip
    - Graceful Redis degradation: catch block returns zeros, never throws to client
    - quotaData passed as optional prop with ?? null fallback for backward compatibility

key-files:
  created:
    - src/app/api/admin/quota/route.ts
    - src/components/admin/api-quota-card.tsx
  modified:
    - src/components/admin/platform-pulse.tsx
    - src/app/admin/page.tsx

key-decisions:
  - "Inline super_admin check (not requireSuperAdmin) per Phase 04 locked decision to avoid redirect() 500 in Route Handler context"
  - "redis.mget batches all provider+date keys in one round-trip vs N individual gets"
  - "quotaData is optional prop (quotaData?) so PlatformPulse callers without quota remain valid"
  - "ApiQuotaCard uses skeleton when data===null and empty state when all values are zero"

patterns-established:
  - "ApiQuotaCard: skeleton/empty/data tri-state component pattern for async card data"
  - "Gold progress bars: var(--gold-primary) background, width derived from relative-to-max percentage"

requirements-completed: [SA-01, ANLY-03]

# Metrics
duration: 15min
completed: 2026-03-01
---

# Phase 13 Plan 01: Restore Quota API Route + Build ApiQuotaCard + Wire into PlatformPulse Summary

**Live API quota burn card wired into PlatformPulse grid: Upstash Redis reads api_usage:{provider}:{date} keys for 5 providers over 7 days, displays gold progress bars per provider, replaces ComingSoonCard placeholder**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-28T19:41:41Z
- **Completed:** 2026-03-01T20:10:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Restored `/api/admin/quota` route (previously deleted): reads Upstash Redis `api_usage:{provider}:{date}` keys via `redis.mget` for 5 providers over configurable N days, returns `{ totals, days }` with graceful zero fallback on Redis errors
- Created `ApiQuotaCard` component: tri-state (skeleton/empty/data), gold progress bars scaled relative to max provider, gold-colored non-zero counts, `var(--admin-text-secondary)` labels
- Wired `ApiQuotaCard` into `PlatformPulse`: removed `ComingSoonCard` + `ApiQuotaPlaceholder`, added optional `quotaData` prop
- Updated admin dashboard page: fetches 6th API endpoint (`/api/admin/quota?days=7`) in parallel `Promise.all`, passes `quotaData` to `PlatformPulse`

## Task Commits

Each task was committed atomically:

1. **Task 1: Restore /api/admin/quota route + create ApiQuotaCard** - `f0b8402` (feat)
2. **Task 2: Wire ApiQuotaCard into PlatformPulse + admin page** - `ad07d4c` (committed as part of docs commit by concurrent session)

**ESLint fix (deviation):** `cd224de` (fix: pre-existing ESLint errors blocking build)

## Files Created/Modified
- `src/app/api/admin/quota/route.ts` - Admin quota API endpoint reading api_usage:* keys from Upstash Redis, aggregates per-provider totals, graceful zero fallback
- `src/components/admin/api-quota-card.tsx` - Live API quota card with per-provider gold progress bars, tri-state rendering
- `src/components/admin/platform-pulse.tsx` - Replaced ComingSoonCard+ApiQuotaPlaceholder with ApiQuotaCard, added quotaData prop
- `src/app/admin/page.tsx` - Added quotaData state, 6th fetch to /api/admin/quota?days=7, passes quotaData to PlatformPulse

## Decisions Made
- Inline super_admin check (not requireSuperAdmin) per Phase 04 locked decision — avoids redirect() 500 in Route Handler context
- `redis.mget` batches all provider+date keys in a single round-trip (PROVIDERS.length * days keys)
- `quotaData` is optional prop (`quotaData?`) in PlatformPulse for backward compatibility with existing callers
- Empty state "No API usage data yet" displayed when all provider totals are zero (Redis configured but no usage recorded)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing ESLint errors blocking pnpm build**
- **Found during:** Task 2 (pnpm build verification)
- **Issue:** `search-content.tsx` line 88 used ternary as expression statement (`next.has(id) ? next.delete(id) : next.add(id)`) triggering `@typescript-eslint/no-unused-expressions`. `bulk-actions-bar.tsx` had `totalCount` in destructuring but not used.
- **Fix:** Converted ternary to `if/else` block; removed unused `totalCount` from destructuring (kept in interface for API contract)
- **Files modified:** `src/app/[orgId]/search/components/search-content.tsx`, `src/app/[orgId]/search/components/bulk-actions-bar.tsx`
- **Verification:** `pnpm build` passes clean with `/api/admin/quota` appearing in route listing
- **Committed in:** `cd224de`

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required fix — pre-existing ESLint errors were blocking `pnpm build` which is Task 2's verification criterion. No scope creep.

## Issues Encountered
- Git stash/pop conflict during build verification caused Task 2 changes to be included in an earlier docs commit (`ad07d4c`). All changes are present and correct in HEAD. Build passes clean.

## Next Phase Readiness
- `ApiQuotaCard` is live — PlatformPulse shows 4 real stat cards with no "Coming Soon" overlays
- Quota route returns `{ totals, days }` — extensible for future time-range selectors
- Admin dashboard now fetches 6 endpoints in parallel with 60-second polling

---
*Phase: 13-admin-dashboard*
*Completed: 2026-03-01*

## Self-Check: PASSED

- `src/app/api/admin/quota/route.ts` — FOUND
- `src/components/admin/api-quota-card.tsx` — FOUND
- Commit `f0b8402` (Task 1) — FOUND
- Commit `ad07d4c` (Task 2 wiring) — FOUND
- Commit `cd224de` (ESLint fix) — FOUND
- `pnpm build` passes with `/api/admin/quota` in route listing — VERIFIED
