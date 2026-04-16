# Phase 43 — Deferred Items

## Pre-existing TypeScript Errors (Out of Scope)

Discovered during Plan 01 Task 2 `pnpm tsc --noEmit` verification. These errors exist on `main` BEFORE Phase 43 changes (confirmed via `git stash` + typecheck). They are in `src/lib/search/__tests__/execute-research.test.ts` — an existing Phase 26 test file touching `ChannelParams` tuple access — unrelated to wealth-tier work.

Per executor `SCOPE BOUNDARY` rule, these are not fixed here. Logged for follow-up or quick task cleanup.

```
src/lib/search/__tests__/execute-research.test.ts(178,12): error TS2532: Object is possibly 'undefined'.
src/lib/search/__tests__/execute-research.test.ts(178,34): error TS2493: Tuple type '[]' of length '0' has no element at index '0'.
src/lib/search/__tests__/execute-research.test.ts(180,12): error TS2532: Object is possibly 'undefined'.
src/lib/search/__tests__/execute-research.test.ts(180,36): error TS2493: Tuple type '[]' of length '0' has no element at index '0'.
src/lib/search/__tests__/execute-research.test.ts(200,24): error TS2352: Conversion of type 'undefined' to type 'ChannelParams' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/lib/search/__tests__/execute-research.test.ts(200,46): error TS2493: Tuple type '[]' of length '0' has no element at index '0'.
```

**Verification that Phase 43 additions compile cleanly:**
```
pnpm tsc --noEmit 2>&1 | grep -E "(auto_wealth_tier|wealth_tier_estimated|DataEventType)"
# (no output — zero errors related to Phase 43 types)
```

## Pre-existing Test Failures (Out of Scope)

Discovered during Plan 02 Task 2 verification. The wider vitest suite reports
22 failing tests in `src/inngest/functions/__tests__/enrich-prospect.test.ts`,
all with the same signature:

```
TypeError: supabase.rpc is not a function
  at updateSourceStatus src/inngest/functions/enrich-prospect.ts:24:18
  at src/inngest/functions/enrich-prospect.ts:265:15
  at src/inngest/functions/enrich-prospect.ts:194:25
```

Root cause: the mock Supabase client in that suite lacks an `rpc()` method.
`updateSourceStatus` was updated (prior to Phase 43) to use the
`merge_enrichment_source_status` RPC for atomic JSONB merge, but the test mock
wasn't kept in lock-step. This is NOT introduced by Phase 43 and is not caused
by `estimateWealthTier` — our own suite (`wealth-tier.test.ts`) is green with
13/13 passing.

Per executor `SCOPE BOUNDARY` rule, not fixed here. Will need a follow-up
quick task to add `rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))`
to the mock Supabase chain in `enrich-prospect.test.ts`.

**Verification that Phase 43-02 additions pass cleanly:**
```
pnpm vitest run src/lib/enrichment/__tests__/wealth-tier.test.ts
# Test Files  1 passed (1)
#      Tests  13 passed (13)
```
