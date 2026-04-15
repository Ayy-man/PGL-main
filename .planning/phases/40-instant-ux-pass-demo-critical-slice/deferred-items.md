# Phase 40 Deferred Items

## Pre-existing TypeScript errors out of scope

**Source plan:** 40-06 (discovered during Task 1 typecheck)

**File:** `src/lib/search/__tests__/execute-research.test.ts`
**Lines:** 178, 180, 200

**Errors:**
- TS2532: Object is possibly 'undefined' (x2)
- TS2493: Tuple type '[]' of length '0' has no element at index '0' (x3)
- TS2352: Conversion of type 'undefined' to type 'ChannelParams' may be a mistake

**Why deferred:** Pre-existing errors in tests unrelated to 40-06 scope
(dismiss/tags/profile-edit optimistic updates). Last touched in commit
`0d08d93 feat: add CI pipeline, integration tests, structured API errors`.
Out of scope per executor deviation rules.

## Pre-existing test failures (enrich-prospect)

**Source plan:** 40-06 (discovered during full-suite vitest run)

**File:** `src/inngest/functions/__tests__/enrich-prospect.test.ts`
**Result:** 22/22 tests failing on base commit `085482b` (confirmed by
stashing working tree and running against unmodified base).

**Why deferred:** Pre-existing failures unrelated to 40-06 scope. Root cause
appears to be a Supabase RPC mock signature mismatch in the mock setup
(`ts(2554)`-style runtime error at line 257 of `enrich-prospect.ts`).
Out of scope per executor deviation rules.

