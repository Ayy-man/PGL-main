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
