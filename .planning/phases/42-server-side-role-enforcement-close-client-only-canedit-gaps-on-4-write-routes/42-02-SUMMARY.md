---
phase: 42-server-side-role-enforcement
plan: 02
subsystem: auth / lists
tags: [security, auth, rbac, server-action, vitest]
requires:
  - 42-01 (convention lock — Pattern A)
provides:
  - Server-side role guard on all 6 list Server Actions
  - 19 Vitest tests pinning role-guard behavior
affects:
  - src/app/[orgId]/lists/actions.ts
  - src/app/[orgId]/lists/__tests__/actions.test.ts (new)
tech-stack:
  added: []
  patterns:
    - Pattern A (requireRole chokepoint inside getAuthenticatedUser)
    - Vitest mock hoisting (mirrors enrich-prospect.test.ts)
key-files:
  created:
    - src/app/[orgId]/lists/__tests__/actions.test.ts
  modified:
    - src/app/[orgId]/lists/actions.ts
decisions:
  - Single guard at getAuthenticatedUser() chokepoint covers all 6 actions in one edit
  - Assistant-path assertion locks on DB-query-never-called + error-string-contains-NEXT_REDIRECT
  - RedirectError carries NEXT_REDIRECT in .message so it surfaces through the action's try/catch
metrics:
  duration_seconds: 148
  tasks_completed: 2
  test_count: 19
  completed: 2026-04-15
---

# Phase 42 Plan 02: Lists Server Actions Role Guard — Summary

Server-side `requireRole('agent')` guard added at the `getAuthenticatedUser()` chokepoint in `src/app/[orgId]/lists/actions.ts` — one edit covers all 6 Server Actions. Co-located Vitest suite pins the assistant-blocked / agent-allowed / no-session invariants with 19 tests.

## Choke-point choice

All 6 Server Actions in `lists/actions.ts` funnel through the internal `getAuthenticatedUser()` helper before any DB write. Adding `await requireRole("agent")` inside that helper — after the existing auth/tenant resolution, before `return` — is the minimum-diff, maximum-coverage change. Seven inserted lines (one import, one guard call, five lines of comment) guard six actions. No per-action edits required.

## Assistant-path assertion shape (flagged by plan-checker)

Plan 42-02 flagged uncertainty about the assistant-path assertion: `requireRole` calls `redirect()` which throws `NEXT_REDIRECT`. In production, Next.js's Server Action boundary re-throws the digest so it surfaces as a client-side navigation. In tests, there is no framework wrapper — the action's try/catch catches the rejection and returns `{ success: false, error: <message> }`.

**Decision locked on first run:**
1. `RedirectError extends Error` carries the NEXT_REDIRECT digest in both `.digest` AND `.message` (via `super(digest)`), so when the action's catch serializes via `error.message`, the digest survives into the return envelope.
2. The assistant-path test asserts **two** things:
   - `result.success === false` and `result.error` contains `"NEXT_REDIRECT"` — proves the guard fired and the redirect signal propagated.
   - `mockX.not.toHaveBeenCalled()` — the security-relevant invariant; holds regardless of envelope shape.
3. The assertion shape passed on first run — no iteration needed.

This means a future refactor that accidentally swallows the guard rejection (e.g., catching in `getAuthenticatedUser` itself and returning a fake success) would break the NEXT_REDIRECT substring check AND the `not.toHaveBeenCalled` check, so the suite catches drift from either angle.

## Final test count

| describe block            | tests | paths covered                                    |
| ------------------------- | ----- | ------------------------------------------------ |
| `createListAction`        | 3     | agent / assistant / no-session                   |
| `deleteListAction`        | 3     | agent / assistant / no-session                   |
| `updateMemberStatusAction`| 3     | agent / assistant / no-session                   |
| `updateMemberNotesAction` | 3     | agent / assistant / no-session                   |
| `removeFromListAction`    | 3     | agent / assistant / no-session                   |
| `addToListAction`         | 3     | agent / assistant / no-session                   |
| `hierarchy sanity`        | 1     | tenant_admin + super_admin (looped in one `it`)  |
| **Total**                 | **19**| matches plan's ≥19 target                        |

Test runtime: 15 ms (fast — all mocks, no I/O).

## Deviations from Plan

None. Plan executed exactly as written.

- Both atomic commits landed with the exact messages the plan specified.
- Two files touched match `files_modified` in frontmatter verbatim.
- Test count (19) matches plan's minimum.
- The plan-checker's "first run may require flipping assertion shape" caveat did not materialize — the `RedirectError` shape with digest-in-message worked first try.

## Verification evidence

- `grep -n 'await requireRole("agent")' src/app/[orgId]/lists/actions.ts` → exactly one match at line 33 (inside `getAuthenticatedUser`).
- `grep -n 'import { requireRole } from "@/lib/auth/rbac"' src/app/[orgId]/lists/actions.ts` → one match at line 5.
- `npx vitest run src/app/[orgId]/lists/__tests__/actions.test.ts` → 19 passed / 19 total.
- `npx tsc --noEmit` → zero errors in either in-scope file (pre-existing errors in unrelated files, not in scope per §Scope Boundary).

## Commits

| Task | Commit    | Message                                                      |
| ---- | --------- | ------------------------------------------------------------ |
| 1    | `62439fe` | feat(42-02): guard lists Server Actions with requireRole('agent') |
| 2    | `2d34d03` | test(42-02): cover lists Server Actions role-guard paths     |

## Self-Check: PASSED

- FOUND: src/app/[orgId]/lists/actions.ts (modified, import + guard line present)
- FOUND: src/app/[orgId]/lists/__tests__/actions.test.ts (new, 19 tests)
- FOUND: commit 62439fe in git log
- FOUND: commit 2d34d03 in git log
