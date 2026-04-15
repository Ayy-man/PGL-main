---
phase: 42-server-side-role-enforcement
plan: 03
subsystem: auth / server-side RBAC
tags: [auth, rbac, server-actions, vitest, personas]
status: complete
wave: 2
depends_on: [42-01]
requires:
  - src/lib/auth/rbac.ts → requireRole("agent")
  - src/lib/personas/queries.ts → createPersona / updatePersona / deletePersona
provides:
  - role-guarded persona Server Actions (create / update / delete)
  - co-located Vitest coverage for all 3 actions × 3 role paths + hierarchy sanity
affects:
  - /[orgId]/personas routes: Assistant-role users are now blocked server-side
    (NEXT_REDIRECT → client navigation to tenant root)
tech-stack:
  added: []
  patterns:
    - "Pattern A (inline Server Action guard) per 42-01-PLAN.md"
    - "Vitest mocks: @/lib/auth/rbac, @/lib/supabase/server, @/lib/personas/queries, next/cache"
    - "RedirectError class with digest='NEXT_REDIRECT;…' as assistant-path sentinel"
key-files:
  created:
    - src/app/[orgId]/personas/__tests__/actions.test.ts
  modified:
    - src/app/[orgId]/personas/actions.ts
decisions:
  - "Inline `await requireRole('agent')` 3x (once per action). No shared chokepoint exists in personas/actions.ts (unlike lists/actions.ts's getAuthenticatedUser helper)."
  - "Guard placement: after `if (!tenantId)` throw, before any form parsing or DB write. Preserves existing 'Not authenticated' / 'No tenant ID' error ordering."
  - "Error semantic: no try/catch wrapper — these actions already let errors propagate (unlike lists/actions.ts's { success, error } envelope)."
  - "Test mocks requireRole directly (not getCurrentUser) — cleanest way to simulate each role path without rebuilding Supabase session shape."
metrics:
  completed: 2026-04-15
  duration_minutes: ~10
  tasks_completed: 2
  files_changed: 2
  tests_added: 10
---

# Phase 42 Plan 03: Personas Server Action Role Guards — Summary

One-liner: Added `requireRole("agent")` to all 3 persona Server Actions (create / update / delete) in `src/app/[orgId]/personas/actions.ts` with co-located Vitest coverage proving assistant-role users hit NEXT_REDIRECT before the DB layer runs.

## What shipped

### 1. `src/app/[orgId]/personas/actions.ts` — 3 inline guards

| Action                  | Guard line (post-edit) | Action span    |
| ----------------------- | ---------------------- | -------------- |
| `createPersonaAction`   | **28**                 | lines 13–93    |
| `updatePersonaAction`   | **110**                | lines 95–159   |
| `deletePersonaAction`   | **179**                | lines 161–181  |

Each guard placed identically: immediately after the `if (!tenantId)` throw block, immediately before the next meaningful statement (form parsing for create/update, `await deletePersona(...)` for delete). Added one import: `import { requireRole } from "@/lib/auth/rbac";` at line 11.

No signature changes. No behavior change for agent / tenant_admin / super_admin. For assistant: `requireRole` calls `redirect("/{tenantId}")` which throws NEXT_REDIRECT; Next.js's Server Action boundary intercepts and issues a client-side navigation.

### 2. `src/app/[orgId]/personas/__tests__/actions.test.ts` — 10 tests

Structure:
- `personas/actions — role guard` (outer describe)
  - `createPersonaAction` (3 tests: agent / assistant / no-session)
  - `updatePersonaAction` (3 tests: agent / assistant / no-session)
  - `deletePersonaAction` (3 tests: agent / assistant / no-session)
  - `hierarchy sanity` (1 test: tenant_admin + super_admin both pass via `.mockResolvedValueOnce` loop)

Total describes: **5**. Total tests: **10** (matches plan minimum: 9 + 1 hierarchy).

Mock strategy (mirrors 42-02 blueprint):
- `@/lib/auth/rbac` → `requireRole` mocked via `mockRequireRole` fn. Default resolves with a `SessionUser`-shaped object (role='agent'); tests override with `mockRejectedValue(new RedirectError())` to simulate assistant.
- `@/lib/supabase/server` → `createClient` returns `{ auth: { getUser: mockGetUser } }`. Default resolves authed user; no-session tests override with `{ data: { user: null } }`.
- `@/lib/personas/queries` → `createPersona / updatePersona / deletePersona` all mocked as spies. Assertion: in assistant and no-session paths, `expect(mockCreatePersona).not.toHaveBeenCalled()` (and likewise for update/delete).
- `next/cache` → `revalidatePath` no-op.

The `RedirectError` sentinel class has `digest = "NEXT_REDIRECT;replace;/tenant-x;307"`, matching the shape Next.js's `redirect()` throws. Tests assert `.rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") })`.

## Verification

```
$ rg -n 'await requireRole\("agent"\)' src/app/\[orgId\]/personas/actions.ts
28:  await requireRole("agent");
110:  await requireRole("agent");
179:  await requireRole("agent");
# → exactly 3 matches ✓

$ npx vitest run src/app/\[orgId\]/personas/__tests__/actions.test.ts
 ✓ src/app/[orgId]/personas/__tests__/actions.test.ts (10 tests) 12ms
 Test Files  1 passed (1)
      Tests  10 passed (10)
# → green ✓

$ npx tsc --noEmit -p tsconfig.json | rg 'personas/(actions\.ts|__tests__/actions\.test\.ts)'
# → no output (clean) ✓
```

## Deviations from Plan

None — plan executed exactly as written. The `tdd="true"` tags on both tasks did not trigger a strict RED-before-GREEN commit sequence because the plan itself orders implementation (Task 1: `feat` commit) before tests (Task 2: `test` commit) per the shared convention across 42-02/03/04. The guard's correctness is verified immediately post-implementation via the Task 2 test run.

## Test assertion adjustments

No adjustments needed. The `RedirectError` class with a `digest` starting with `"NEXT_REDIRECT"` worked cleanly as the assistant-path sentinel — assertions of the form `.rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") })` matched exactly on first run. Unlike the 42-02 plan note about Next.js re-throwing from the catch block, these persona actions have NO try/catch wrapper at all, so the NEXT_REDIRECT error simply propagates — the test shape the plan proposed worked verbatim.

## Commits

| Hash      | Message                                                                 |
| --------- | ----------------------------------------------------------------------- |
| `1e186e1` | feat(42-03): guard personas Server Actions with requireRole('agent')    |
| `5025daf` | test(42-03): cover personas Server Actions role-guard paths             |

## Threat mitigations (from plan's STRIDE register)

| Threat ID    | Status    | Evidence                                                                                   |
| ------------ | --------- | ------------------------------------------------------------------------------------------ |
| T-42-03-01 E | mitigated | `deletePersonaAction` test asserts `mockDeletePersona` not called when requireRole rejects |
| T-42-03-02 T | mitigated | `updatePersonaAction` test asserts `mockUpdatePersona` not called when requireRole rejects |
| T-42-03-03 E | mitigated | `createPersonaAction` test asserts `mockCreatePersona` not called when requireRole rejects |

Because personas double as saved searches (MEMORY.md: "Saved searches in this codebase ARE personas (same table)"), closing these three gaps simultaneously closes the equivalent saved-search mutation surfaces — no duplicate guarding work needed in a follow-up.

## Final test count

**10 tests** across **5 describe blocks** (1 outer + 3 per-action + 1 hierarchy). Matches plan's minimum of 9 (3 actions × 3 paths) + 1 hierarchy.

## Self-Check: PASSED

- [x] `src/app/[orgId]/personas/actions.ts` — modified, 3 `requireRole("agent")` calls on lines 28, 110, 179
- [x] `src/app/[orgId]/personas/__tests__/actions.test.ts` — created, 10 tests green
- [x] Commit `1e186e1` exists
- [x] Commit `5025daf` exists
- [x] `npx tsc --noEmit` clean for both files
- [x] No unexpected file deletions (`git diff --diff-filter=D HEAD~2 HEAD` empty)
