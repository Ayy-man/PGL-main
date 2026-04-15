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
