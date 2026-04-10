---
phase: 36-fix-nlp-search-flow-issues
plan: "01"
subsystem: search
tags: [rate-limiting, input-validation, resilience, openrouter, apollo-enums]
dependency_graph:
  requires: []
  provides: [parse-query-rate-limiter, parse-query-length-guard, openrouter-timeout, apollo-enum-validation]
  affects: [src/app/api/search/parse-query/route.ts, src/lib/rate-limit/limiters.ts, src/lib/ai/openrouter.ts]
tech_stack:
  added: []
  patterns: [upstash-sliding-window-rate-limit, AbortSignal.timeout, Apollo-enum-set-validation]
key_files:
  created: []
  modified:
    - src/lib/rate-limit/limiters.ts
    - src/app/api/search/parse-query/route.ts
    - src/lib/ai/openrouter.ts
decisions:
  - parseQueryRateLimiter uses 20/min sliding window matching plan spec (same Upstash Redis pattern as apolloRateLimiter)
  - VALID_SENIORITIES and VALID_INDUSTRIES defined as module-scope Sets for O(1) lookup
  - Enum validation strips invalid values and deletes the key entirely if all values are invalid
  - AbortSignal.timeout placed on the fetch options object (not wrapping); supported in Node 18+
metrics:
  duration: "~8 min"
  completed: "2026-04-10T16:37:38Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 36 Plan 01: Parse-Query Hardening Summary

Server-side NLP parse-query endpoint hardened with rate limiting (20/min/tenant), 1000-char length guard, Apollo enum validation, increased max_tokens to 1000, and a 15-second OpenRouter fetch timeout.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rate limiter + length guard + enum validation for parse-query | 0878d7b | src/lib/rate-limit/limiters.ts, src/app/api/search/parse-query/route.ts |
| 2 | 15-second timeout for OpenRouter fetch | edeca84 | src/lib/ai/openrouter.ts |

## What Was Built

**Task 1 — parse-query route hardening (5 bugs fixed):**

- **H4 (cost amplification):** Added `parseQueryRateLimiter` (20 req/min sliding window, Upstash Redis) to `src/lib/rate-limit/limiters.ts`. Applied in route after auth check — returns 429 with `Retry-After` header if exceeded.
- **H5 (prompt injection / oversized payload):** Query length guard rejects any query >1000 characters with 400 before auth or LLM is called.
- **L6 (truncated JSON for complex queries):** `chatCompletion` call's `max_tokens` increased from 500 to 1000.
- **M12 (invalid Apollo enum values):** `VALID_SENIORITIES` and `VALID_INDUSTRIES` Sets defined at module scope. Post-parse filtering strips invalid values; if all values invalid, the key is deleted from filters entirely.

**Task 2 — OpenRouter resilience (1 bug fixed):**

- **M11 (indefinite hang):** `signal: AbortSignal.timeout(15_000)` added to the `fetch` call in `chatCompletion`. Server-side LLM call now aborts after 15 seconds if OpenRouter is unresponsive.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — all mitigations in threat register (T-36-01 through T-36-05) were implemented as planned. No new security surface introduced.

## Self-Check: PASSED

- `src/lib/rate-limit/limiters.ts` — modified, contains `parseQueryRateLimiter`
- `src/app/api/search/parse-query/route.ts` — modified, contains rate limit + length guard + enum validation + max_tokens 1000
- `src/lib/ai/openrouter.ts` — modified, contains `AbortSignal.timeout(15_000)`
- Commits: `0878d7b` (Task 1), `edeca84` (Task 2)
- `pnpm build` — passed with no errors or warnings
