---
phase: quick
plan: x7b
subsystem: enrichment-gate
tags: [apollo, enrichment, validation, security]
dependency_graph:
  requires: []
  provides: [enrichment-gate-server-side]
  affects: [bulk-enrich-flow, upsert-route]
tech_stack:
  added: []
  patterns: [server-side-validation, error-code-union]
key_files:
  created: []
  modified:
    - src/lib/circuit-breaker/apollo-breaker.ts
    - src/app/api/prospects/upsert/route.ts
    - src/lib/api-error.ts
decisions:
  - Added OBFUSCATED_PROSPECT to ApiErrorCode union rather than casting to avoid type safety bypass
metrics:
  duration: ~5min
  completed: 2026-04-07
---

# Phase quick Plan x7b: Enrichment Gate Fix — Profile Buttons Summary

**One-liner:** Server-side enrichment gate: stamps `_enriched: true` on real Apollo bulk-match results and rejects obfuscated preview names at the upsert endpoint with a typed 400 error.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Stamp _enriched: true on real Apollo bulk-match results | 80a945f | src/lib/circuit-breaker/apollo-breaker.ts |
| 2 | Server-side guard rejecting obfuscated prospect names | cd2d686 | src/app/api/prospects/upsert/route.ts, src/lib/api-error.ts |

## What Was Built

- `bulkEnrichPeople` in `apollo-breaker.ts` now maps each result from the Apollo `bulk_match` API to include `_enriched: true as const`, ensuring real enriched people pass the client-side add-to-list gate without manual overrides.
- `POST /api/prospects/upsert` now checks `name`, `first_name`, and `last_name` fields for the `"***"` obfuscation marker before any database write. Obfuscated requests are rejected with HTTP 400 and code `OBFUSCATED_PROSPECT`.
- `ApiErrorCode` union in `src/lib/api-error.ts` extended with `"OBFUSCATED_PROSPECT"` to keep the error system fully typed.

## Deviations from Plan

**1. [Rule 2 - Missing Critical Functionality] Added OBFUSCATED_PROSPECT to ApiErrorCode union**
- **Found during:** Task 2 — TypeScript compilation (`npx tsc --noEmit`) reported `Argument of type '"OBFUSCATED_PROSPECT"' is not assignable to parameter of type 'ApiErrorCode'`
- **Issue:** The plan specified using `ApiError` with a new code string but didn't account for the closed union type in `api-error.ts`
- **Fix:** Added `| "OBFUSCATED_PROSPECT"` to the `ApiErrorCode` union — correct approach rather than casting to bypass type safety
- **Files modified:** `src/lib/api-error.ts`
- **Commit:** cd2d686

## Known Stubs

None.

## Threat Flags

None — the changes implement mitigations already in the plan's threat register (T-x7b-01, T-x7b-02).

## Self-Check: PASSED

- [x] `src/lib/circuit-breaker/apollo-breaker.ts` — modified, `_enriched: true as const` confirmed on line 106
- [x] `src/app/api/prospects/upsert/route.ts` — modified, `OBFUSCATED_PROSPECT` guard confirmed on lines 80–87
- [x] `src/lib/api-error.ts` — modified, `OBFUSCATED_PROSPECT` added to union
- [x] Commit 80a945f — exists
- [x] Commit cd2d686 — exists
- [x] `npx tsc --noEmit` — no new errors (pre-existing test file errors unrelated to this plan)
