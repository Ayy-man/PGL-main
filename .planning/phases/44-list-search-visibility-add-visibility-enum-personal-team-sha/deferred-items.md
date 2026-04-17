# Phase 44 — Deferred Items

Out-of-scope issues discovered during Plan 44-02 execution. Logged per GSD scope
boundary rule (only fix issues directly caused by the current task's changes).

## Pre-existing TSC errors in src/lib/search/__tests__/execute-research.test.ts

**Discovered:** Plan 44-02, Task 2 (2026-04-17)

**Errors:**
- L178,12: TS2532 Object is possibly 'undefined'
- L178,34: TS2493 Tuple type '[]' of length '0' has no element at index '0'
- L180,12: TS2532 Object is possibly 'undefined'
- L180,36: TS2493 Tuple type '[]' of length '0' has no element at index '0'
- L200,24: TS2352 Conversion of type 'undefined' to type 'ChannelParams' may be a mistake
- L200,46: TS2493 Tuple type '[]' of length '0' has no element at index '0'

**Verified pre-existing via `git stash && pnpm tsc --noEmit`** — errors present
even with all Plan 44-02 changes stashed. This is a Phase 26 test file issue
unrelated to list/persona visibility.

**Recommendation:** Fix in a follow-up quick task (tighten optional-tuple access
in execute-research.test.ts). Not blocking Phase 44 progress because:
- Plan 44-02 acceptance criterion is scoped to `src/lib/lists/**` and `src/types/**` — those are clean.
- Errors live in test file only (not shipping code).
