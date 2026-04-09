# Quick Task 260409-rzz — Apollo Safety Pass

**Date:** 2026-04-09
**Status:** Complete
**Scope:** 3 files, 3 atomic commits

## Goal

Wire up existing rate-limiting infrastructure into the two Apollo-credit-burning endpoints and wrap the bulk-enrich fetch in its own circuit breaker so repeated Apollo outages fail fast instead of hammering the API.

## Context

Derived from the project review (see prior conversation). Original review finding #4 ("retry-on-4xx burns credits") was reframed after reading `apollo-breaker.ts` — there is no retry loop to fix. The real gap in that file was that `bulkEnrichPeople` was not wrapped in any circuit breaker at all (only `apolloSearchRequest` was). Review finding #5 ("no rate limiting on paid endpoints") was accurate — `apolloRateLimiter` and the `withRateLimit`/`rateLimitResponse` helpers were already defined in `src/lib/rate-limit/` but never wired into the two enrichment routes.

## Changes

### 1. `src/app/api/apollo/bulk-enrich/route.ts` (+12)
**Commit:** `2d0ec7a` — feat(apollo): rate-limit POST /api/apollo/bulk-enrich per tenant

Added tenant ID extraction from `user.app_metadata.tenant_id` and a `withRateLimit(apolloRateLimiter, \`tenant:${tenantId}\`)` check immediately after the auth block and before `request.json()`. Returns `rateLimitResponse(result)` (429 with `X-RateLimit-*` headers) on rate-limit exhaustion. Preserves existing Zod validation, mock-mode branch, `bulkEnrichPeople` call, and the `insufficient credits` 402 catch branch.

### 2. `src/app/api/prospects/[prospectId]/enrich/route.ts` (+7)
**Commit:** `7e44a95` — feat(enrich): rate-limit POST /api/prospects/[prospectId]/enrich per tenant

Added the same rate-limit block immediately after the existing `!tenantId` throw, before the UUID resolution and prospect lookup. Placement saves the DB round-trip for abusive callers. Preserves existing staleness check, in-progress check, Inngest send, and final response.

### 3. `src/lib/circuit-breaker/apollo-breaker.ts` (+30 / -1)
**Commit:** `d4332bd` — feat(apollo): wrap bulkEnrichPeople in dedicated circuit breaker

Renamed the existing implementation to private `bulkEnrichPeopleImpl`. Created `apolloBulkEnrichBreaker = new CircuitBreaker(bulkEnrichPeopleImpl, options)` using the same options object as `apolloBreaker` (timeout 15s, 50% error threshold, 30s reset, 5-call volume threshold). Added three event listeners (`open`, `halfOpen`, `close`) with `[Bulk Enrich Circuit Breaker]` prefix so logs are distinguishable from the search breaker. Re-exported `bulkEnrichPeople` as a thin wrapper calling `apolloBulkEnrichBreaker.fire(apolloIds)`. Public function signature unchanged — callers in `src/app/api/apollo/bulk-enrich/route.ts` continue to work with no changes needed. Existing `apolloSearchRequest`, `apolloBreaker`, and its three event listeners are untouched.

## Verification

- **TypeScript:** `npx tsc --noEmit -p tsconfig.json` — 0 errors in the three target files. (6 pre-existing errors in `src/lib/search/__tests__/execute-research.test.ts` are unrelated and out of scope.)
- **Atomicity:** each task committed separately; `git diff --stat 6d1da88..HEAD` shows exactly the three files above.
- **Infrastructure reuse:** no new dependencies added, no new rate-limit infrastructure created. Uses existing `apolloRateLimiter`, `withRateLimit`, and `rateLimitResponse` from `src/lib/rate-limit/`.

## Deviations

None — plan executed exactly as written. One procedural note: executor used `npx tsc` instead of `pnpm exec tsc` because pnpm had no `tsc` binary registered in the worktree, same output either way.

## Base

Base commit: `6d1da88` (quick task 260409-jiz docs commit)
Final commit: `d4332bd`
