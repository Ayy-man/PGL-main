---
phase: 30-admin-global-api-keys-management-view-rotate-and-test-all-ex
plan: "03"
subsystem: admin-api-keys
tags: [admin, api-keys, integration-tests, connectivity-probes, server-api]
dependency_graph:
  requires: ["30-01"]
  provides: ["integration-test-probes", "test-route-POST"]
  affects: ["30-04-ui-test-button"]
tech_stack:
  added: []
  patterns: ["fetchWithTimeout-abort-controller", "probe-dispatcher-pattern", "Next.js-14-async-params"]
key_files:
  created:
    - src/lib/admin/integration-tests.ts
    - src/app/api/admin/api-keys/test/[integration]/route.ts
    - src/types/admin-api-keys.ts
  modified: []
decisions:
  - "ContactOut and Inngest return skipped:true without network calls — sandbox key is known-broken, Inngest has no cheap health endpoint"
  - "SEC EDGAR uses HEAD method on tickers JSON to minimize data transfer"
  - "Apollo probe uses per_page:1 to consume zero credits"
  - "All external fetches wrapped in 10s fetchWithTimeout with AbortController"
metrics:
  duration: "~8min"
  completed: "2026-04-07"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 30 Plan 03: Integration Test Probe Library + Dynamic Route Summary

**One-liner:** Connectivity probe library for all 9 integrations with normalized `{ok, latencyMs, status, error?}` results, exposed via super-admin-guarded `POST /api/admin/api-keys/test/[integration]`.

## What Was Built

### Task 1: Integration test probe library (`src/lib/admin/integration-tests.ts`)

Created a probe library with per-integration connectivity checks and a dispatcher:

- **`IntegrationTestResult`** type: `{ id, ok, latencyMs, status, error?, skipped?, detail? }`
- **`fetchWithTimeout(url, init)`**: wraps `fetch` with `AbortController` at 10s timeout to prevent hanging
- **9 probe functions**: Apollo, ContactOut, Exa, SEC EDGAR, Finnhub, OpenRouter, Inngest, Supabase, Upstash Redis
- **`runIntegrationTest(id)`**: dispatches to probe, wraps errors, always returns normalized result

Key probe behaviors:
| Integration | Method | Endpoint | Why cheap |
|-------------|--------|----------|-----------|
| Apollo | POST | `/api/v1/mixed_people/api_search` | `per_page:1` — zero credits |
| Exa | POST | `/search` | `numResults:1` |
| SEC EDGAR | HEAD | `/files/company_tickers.json` | HEAD = no body transfer |
| Supabase | SELECT | `platform_config` LIMIT 1 | Minimal query on existing table |
| Upstash Redis | PING | Upstash REST client | Native ping, ~1ms |
| Finnhub | GET | `/quote?symbol=AAPL` | Single quote lookup |
| OpenRouter | GET | `/api/v1/models` | List endpoint, read-only |
| ContactOut | — | none | Skipped — sandbox key broken |
| Inngest | — | none | Skipped — no health endpoint |

Security enforced:
- No raw env var values in logs or response bodies
- Probe errors caught and converted to string messages
- `skipped: true` flag for integrations that cannot be safely tested

### Task 2: Dynamic test route (`src/app/api/admin/api-keys/test/[integration]/route.ts`)

POST handler at the dynamic route path:
- Super-admin role guard (`app_metadata.role !== "super_admin"` → 403)
- Validates `integration` slug against `INTEGRATION_REGISTRY` → 400 for unknown IDs
- Uses `await context.params` (Next.js 14 async params pattern)
- Returns raw `IntegrationTestResult` with no wrapper envelope
- `export const dynamic = "force-dynamic"` to disable static caching

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Created `src/types/admin-api-keys.ts` as unblocking dependency**
- **Found during:** Task 1 setup — the types file is authored by plan 30-02 (parallel wave)
- **Issue:** Plan 30-03 imports `IntegrationId` and `INTEGRATION_REGISTRY` from `src/types/admin-api-keys.ts`, but plan 30-02 runs in parallel and hadn't created this file yet
- **Fix:** Created the full `admin-api-keys.ts` types file (matching the spec from 30-02 PLAN.md) to unblock compilation
- **Files modified:** `src/types/admin-api-keys.ts` (created)
- **Commit:** `96d82df`

Note: Plan 30-02 will create the same file. The orchestrator merge will resolve this — both agents produce identical content from the same spec.

## Known Stubs

None — all probe functions make real API calls (or explicitly skip with documented reasons).

## Threat Flags

None — new endpoints are guarded by super-admin role check. No new auth paths or trust boundaries introduced.

## Self-Check

Files created:
- `src/lib/admin/integration-tests.ts` — exports `runIntegrationTest`, `IntegrationTestResult`
- `src/app/api/admin/api-keys/test/[integration]/route.ts` — exports `POST`
- `src/types/admin-api-keys.ts` — exports `IntegrationId`, `INTEGRATION_REGISTRY`, `IntegrationStatus`

Commits:
- `96d82df`: feat(30-03): create integration test probe library
- `2f8aad3`: feat(30-03): add dynamic test route POST /api/admin/api-keys/test/[integration]
