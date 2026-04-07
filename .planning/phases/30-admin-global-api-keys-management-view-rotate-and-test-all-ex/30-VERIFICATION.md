---
phase: 30-admin-global-api-keys-management-view-rotate-and-test-all-ex
verified: 2026-04-07T12:00:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Navigate to /admin/api-keys as a super_admin user"
    expected: "9-card integration grid renders with correct status badges, masked env var previews, and functional Test Connection buttons"
    why_human: "Visual rendering and interactive test button behavior require a live browser session"
  - test: "Toggle Apollo Mock Enrichment switch ON then OFF"
    expected: "POST /api/admin/api-keys/config fires, optimistic toggle updates immediately, and a subsequent bulk-enrich call uses mock data when ON and real API when OFF"
    why_human: "Requires a running dev server and a super_admin auth session to verify E2E toggle behavior"
  - test: "Click 'Test Connection' on the Apollo card while key is configured"
    expected: "Button enters loading state, latency + 'search endpoint reachable (0 credits)' detail appears inline within ~2s"
    why_human: "Live network call to Apollo API required; cannot be verified with static code analysis"
---

# Phase 30: Admin Global API Keys Management Verification Report

**Phase Goal:** Build an `/admin/api-keys` page where super-admins can view masked previews of all external integration credentials, see circuit breaker state, test live connectivity for each integration, and toggle Apollo mock enrichment mode at runtime — all without raw secret values ever reaching the browser.

**Verified:** 2026-04-07
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DB-backed `platform_config` table exists with migration | VERIFIED | `supabase/migrations/20260407_platform_config.sql` — `CREATE TABLE IF NOT EXISTS platform_config` with RLS enabled, seed row for `apollo_mock_enrichment` |
| 2 | Apollo mock mode toggleable at runtime without redeploy | VERIFIED | `src/lib/platform-config/index.ts` exports `isApolloMockMode()` which queries DB with 30s TTL cache, falls back to env var |
| 3 | Apollo bulk-enrich reads mock mode from DB (not just env var) | VERIFIED | `src/app/api/apollo/bulk-enrich/route.ts` line 7: `import { isApolloMockMode }`, line 118: `const useMock = await isApolloMockMode()` |
| 4 | GET /api/admin/api-keys returns masked integration status | VERIFIED | `src/app/api/admin/api-keys/route.ts` — full implementation: 9 integrations mapped, `maskSecret()` applied, super_admin guard on line 33 |
| 5 | POST /api/admin/api-keys/config writes platform_config | VERIFIED | `src/app/api/admin/api-keys/config/route.ts` — Zod `discriminatedUnion` validation, calls `setPlatformConfig(key, value, user.id)`, super_admin guard present |
| 6 | Integration test probes fire real API calls with normalized results | VERIFIED | `src/lib/admin/integration-tests.ts` — 9 probes (7 real network calls, 2 documented skips), all wrapped in 10s `fetchWithTimeout`, dispatcher `runIntegrationTest()` exported |
| 7 | POST /api/admin/api-keys/test/[integration] route exists and is guarded | VERIFIED | `src/app/api/admin/api-keys/test/[integration]/route.ts` — super_admin guard, slug validation against `INTEGRATION_REGISTRY`, delegates to `runIntegrationTest()` |
| 8 | /admin/api-keys page renders integration cards fetched from API | VERIFIED | `src/app/admin/api-keys/page.tsx` — fetches `/api/admin/api-keys` in `useEffect`, renders `IntegrationCard` grid with `handleMockModeChange` wired |
| 9 | Admin sidebar has active Link to /admin/api-keys | VERIFIED | `src/app/admin/admin-nav-links.tsx` line 23-25: `ADMIN_NAV_SYSTEM_ACTIVE` array with `href: "/admin/api-keys"`, rendered as `<Link>` with gold active state |

**Score:** 9/9 truths verified

---

## Plan-by-Plan Deliverable Report

### Plan 30-01: Platform Config Foundation

**Status: PASS**

| Deliverable | File | Status |
|-------------|------|--------|
| DB migration | `supabase/migrations/20260407_platform_config.sql` | PASS — substantive, creates table with RLS + seed row |
| TypeScript types | `src/types/platform-config.ts` | PASS — `PlatformConfigKey`, `PlatformConfigRow`, `PlatformConfigMap` |
| Config helper | `src/lib/platform-config/index.ts` | PASS — `getPlatformConfig`, `setPlatformConfig`, `isApolloMockMode` all implemented with 30s cache |
| Bulk-enrich migration | `src/app/api/apollo/bulk-enrich/route.ts` | PASS — imports and calls `isApolloMockMode()` |
| Commits | `fc310d9`, `9f94a0f` (in worktree); `fc310d9` merged to main | PASS |

**Note:** 30-01-PLAN.md and 30-01-SUMMARY.md were located in a separate worktree (`agent-a7a8ba99`) rather than the primary phase directory. The artifacts themselves are present in the main working tree and all commits exist.

---

### Plan 30-02: API Routes for Integration Status and Config Writes

**Status: PASS**

| Deliverable | File | Status |
|-------------|------|--------|
| Integration registry types | `src/types/admin-api-keys.ts` | PASS — 9 integrations, `maskSecret()`, `INTEGRATION_REGISTRY` constant, all required types |
| GET /api/admin/api-keys | `src/app/api/admin/api-keys/route.ts` | PASS — super_admin guard, env var inspection, `maskSecret()` applied, breaker state, `isApolloMockMode()` wired |
| POST /api/admin/api-keys/config | `src/app/api/admin/api-keys/config/route.ts` | PASS — Zod discriminatedUnion, super_admin guard, `setPlatformConfig()` called |
| Commits | `c2ebaa5`, `39c1500` | PASS — both verified in git log |

---

### Plan 30-03: Integration Test Probe Library + Dynamic Route

**Status: PASS**

| Deliverable | File | Status |
|-------------|------|--------|
| Probe library | `src/lib/admin/integration-tests.ts` | PASS — all 9 probes, `fetchWithTimeout`, `runIntegrationTest` dispatcher |
| Dynamic test route | `src/app/api/admin/api-keys/test/[integration]/route.ts` | PASS — super_admin guard, slug validation, async params (Next.js 14 pattern) |
| Commits | `96d82df`, `2f8aad3` | PASS — both verified in git log |

---

### Plan 30-04: Admin API Keys UI — Integration Card Grid

**Status: PASS**

| Deliverable | File | Status |
|-------------|------|--------|
| StatusBadge | `src/components/admin/api-keys/status-badge.tsx` | PASS — `configured`/`missing`/`partial`/`mockActive` states, CSS variables |
| BreakerBadge | `src/components/admin/api-keys/breaker-badge.tsx` | PASS — `closed`/`half_open`/`open`/`none`, returns null for "none" |
| IntegrationCard | `src/components/admin/api-keys/integration-card.tsx` | PASS — env var rows, mock toggle (Apollo only), test button with inline result, POSTs to correct routes |
| AdminApiKeysPage | `src/app/admin/api-keys/page.tsx` | PASS — fetches API on mount, `useCallback`+`useEffect`, responsive grid, refresh button, error state, `handleMockModeChange` optimistic update |
| Commits | `39210eb`, `669d88b`, `0f90b7e` | PASS — all verified in git log |

**Side effect noted:** Plan 30-04 also created stub files for Phase 29 missing components (`search-sidebar-rail.tsx`, `saved-search-view-header.tsx`) to unblock the build. These are documented in the SUMMARY as intentional stubs awaiting Phase 29 completion.

---

### Plan 30-05: Enable Global API Keys Nav Item

**Status: PASS**

| Deliverable | File | Status |
|-------------|------|--------|
| Active nav link | `src/app/admin/admin-nav-links.tsx` line 24 | PASS — `ADMIN_NAV_SYSTEM_ACTIVE` array with `href: "/admin/api-keys"`, rendered as `<Link>` with gold active-state styling |
| Remaining stubs | `ADMIN_NAV_SYSTEM_STUBS` | PASS — Master Data Schema, Security Policies, Integrations remain as disabled buttons per scope |
| Commit | `f4cc5de` | PASS — verified in git log |

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260407_platform_config.sql` | DDL + RLS | VERIFIED | Substantive — CREATE TABLE, RLS enabled, seed row |
| `src/types/platform-config.ts` | Type definitions | VERIFIED | `PlatformConfigKey`, `PlatformConfigRow`, `PlatformConfigMap` |
| `src/lib/platform-config/index.ts` | Config helper | VERIFIED | `getPlatformConfig`, `setPlatformConfig`, `isApolloMockMode` with cache |
| `src/types/admin-api-keys.ts` | Integration types + registry | VERIFIED | 9 integrations, `maskSecret`, all types |
| `src/app/api/admin/api-keys/route.ts` | GET integration status | VERIFIED | Full implementation, super_admin guard |
| `src/app/api/admin/api-keys/config/route.ts` | POST config write | VERIFIED | Zod discriminatedUnion, super_admin guard |
| `src/lib/admin/integration-tests.ts` | Probe library | VERIFIED | 9 probes, dispatcher, `fetchWithTimeout` |
| `src/app/api/admin/api-keys/test/[integration]/route.ts` | Dynamic test route | VERIFIED | Async params, slug validation, super_admin guard |
| `src/components/admin/api-keys/status-badge.tsx` | StatusBadge | VERIFIED | All states implemented |
| `src/components/admin/api-keys/breaker-badge.tsx` | BreakerBadge | VERIFIED | All states implemented |
| `src/components/admin/api-keys/integration-card.tsx` | IntegrationCard | VERIFIED | Full card with test + mock toggle |
| `src/app/admin/api-keys/page.tsx` | Admin page | VERIFIED | Fetches API, renders grid, optimistic updates |
| `src/app/admin/admin-nav-links.tsx` | Nav with active link | VERIFIED | `ADMIN_NAV_SYSTEM_ACTIVE` with `/admin/api-keys` href |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bulk-enrich/route.ts` | `platform-config/index.ts` | `isApolloMockMode()` call | WIRED | Import on line 7, call on line 118 inside POST handler |
| `api-keys/route.ts` (GET) | `platform-config/index.ts` | `isApolloMockMode()` | WIRED | Import + call on line 37 |
| `api-keys/config/route.ts` (POST) | `platform-config/index.ts` | `setPlatformConfig()` | WIRED | Import + call on line 42 |
| `test/[integration]/route.ts` | `integration-tests.ts` | `runIntegrationTest()` | WIRED | Import + call on line 37 |
| `integration-card.tsx` | `api-keys/config` route | `fetch("/api/admin/api-keys/config", POST)` | WIRED | `toggleMock()` function lines 58-64 |
| `integration-card.tsx` | `test/[integration]` route | `fetch("/api/admin/api-keys/test/${id}", POST)` | WIRED | `runTest()` function line 38 |
| `page.tsx` | `api-keys` GET route | `fetch("/api/admin/api-keys", { cache: "no-store" })` | WIRED | `fetchData()` callback line 25 |
| `admin-nav-links.tsx` | `/admin/api-keys` page | `<Link href="/admin/api-keys">` | WIRED | Line 117-151 in ADMIN_NAV_SYSTEM_ACTIVE map |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `page.tsx` | `integrations` state | `GET /api/admin/api-keys` → reads `process.env.*` + `isApolloMockMode()` | Yes — reads live env vars and DB | FLOWING |
| `integration-card.tsx` | `result` state | `POST /api/admin/api-keys/test/${id}` → probe library | Yes — real API calls | FLOWING |
| `api-keys/route.ts` | `integrations` array | `process.env.*` values via `INTEGRATION_REGISTRY` | Yes — live process env | FLOWING |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/api/admin/api-keys/route.ts` | 23 | `// TODO: wire additional breakers as they are exported (contactout, exa, edgar)` | Info | Only Apollo breaker is surfaced; other integrations show `"none"`. Acceptable — only Apollo breaker currently exists in the codebase. |

No blockers or warnings found. The TODO is informational and accurately describes a known limitation (no circuit breakers for contactout/exa/edgar exist anywhere in the codebase).

---

## Human Verification Required

### 1. Integration Grid Rendering

**Test:** Sign in as a super_admin user and navigate to `/admin/api-keys`.
**Expected:** 9 integration cards render in a 3-column grid. Each card shows: category label, integration name, description, env var names with masked previews (or "— not set —"), status badge (configured/missing/partial), and a "Test Connection" button. Apollo card shows the mock mode toggle.
**Why human:** Visual rendering and layout correctness cannot be verified by static code analysis.

### 2. Apollo Mock Mode Toggle

**Test:** Click the Mock Enrichment Mode toggle on the Apollo card.
**Expected:** Toggle switches state immediately (optimistic update). A POST fires to `/api/admin/api-keys/config` with `{ key: "apollo_mock_enrichment", value: true/false }`. StatusBadge updates to "Mock Active" when ON. Running a bulk enrich with mock ON returns fake data without consuming Apollo credits.
**Why human:** Requires a live Supabase connection and Apollo API key to verify the full E2E toggle path including DB write and subsequent bulk-enrich behavior.

### 3. Live Test Connection

**Test:** On a card where the integration key is configured (e.g., Exa, Finnhub), click "Test Connection."
**Expected:** Button shows spinner, then within ~10s an inline result appears showing "OK · {N}ms · {detail}" or an error message. ContactOut and Inngest cards show "SKIPPED" result.
**Why human:** Requires live API keys in the deployment environment to exercise real probe network calls.

---

## Gaps Summary

No gaps identified. All 9 observable truths are verified against the actual codebase. All 13 key artifacts exist with substantive implementations. All 8 critical links are wired end-to-end. Data flows from live sources (env vars + Supabase) through the API to the UI.

The only open item is 3 human verification tests for live browser behavior — standard for a UI + integration-test feature that makes real external API calls.

---

_Verified: 2026-04-07_
_Verifier: Claude (gsd-verifier)_
