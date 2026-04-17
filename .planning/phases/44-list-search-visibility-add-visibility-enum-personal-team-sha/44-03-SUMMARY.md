---
phase: 44-list-search-visibility
plan: 03
status: complete
subsystem: server-actions
tags: [typescript, server-actions, vitest, visibility, lists, personas, rls-trust-boundary, phase-44]

# Dependency graph
requires:
  - phase: 44
    plan: 01
    provides: "visibility_mode enum + RLS UPDATE USING clause (creator-or-admin enforcement)"
  - phase: 44
    plan: 02
    provides: "updateListVisibility + updatePersonaVisibility query functions; CreateListInput/CreatePersonaInput/UpdatePersonaInput with optional visibility?: Visibility"
provides:
  - "createListAction reads 'visibility' from formData (default 'team_shared', validates via isVisibility)"
  - "createPersonaAction reads 'visibility' from formData (default 'team_shared', validates via isVisibility)"
  - "updatePersonaAction merges 'visibility' into UpdatePersonaInput (partial-update semantics — omit = don't change)"
  - "updateListVisibilityAction(listId, visibility) — RLS-gated, validated, revalidates list pages"
  - "updatePersonaVisibilityAction(personaId, visibility) — RLS-gated, validated, revalidates personas page"
  - "Vitest coverage: 23 new it() blocks across 2 test files; 52 total tests pass"
  - "Security invariant: NO parallel JS permission check. RLS is the sole trust boundary for creator-or-admin enforcement (D-09 satisfied)"
affects:
  - 44-04 (UI creation dialogs — can now call extended create*Action forms + new update*VisibilityAction from dropdowns)
  - 44-05 (admin workspace page — can wire toggle buttons directly to update*VisibilityAction)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Input validation at action boundary: isVisibility() guard rejects garbage BEFORE query layer call — prevents Postgres enum violation 500s"
    - "Default-when-omitted pattern: formData.get('visibility') null/empty → default 'team_shared' for create; omit from UpdatePersonaInput for update (partial-update semantics)"
    - "RLS-as-sole-trust-boundary: no JS `if (user.id !== resource.created_by && !isAdmin)` parallel check — trust the UPDATE USING clause from Plan 44-01 (D-09)"
    - "Vitest mock-and-assert for server actions: mockUpdateListVisibility / mockUpdatePersonaVisibility added to existing test harnesses; 6 test families each prove happy-path, enum-rejection, auth, role-guard, and RLS-error-surfacing"
    - "Test double for next/navigation redirect(): RedirectError subclass with digest 'NEXT_REDIRECT;replace;/tenant-x;307' — asymmetry between lists/actions.test.ts (carries .message) and personas/actions.test.ts (empty .message) documented in test comments"

key-files:
  created: []
  modified:
    - src/app/[orgId]/lists/actions.ts
    - src/app/[orgId]/personas/actions.ts
    - src/app/[orgId]/lists/__tests__/actions.test.ts
    - src/app/[orgId]/personas/__tests__/actions.test.ts

key-decisions:
  - "updatePersonaAction uses partial-update semantics for visibility: if formData omits the field, updates object does NOT include a visibility key (matches query-layer updatePersona's existing 'only update fields that are defined' logic). Alternative — defaulting to 'team_shared' on every updatePersonaAction call — would silently reset intentionally-personal personas back to team_shared on unrelated edits. Documented in test 'omits visibility from UpdatePersonaInput when missing'."
  - "Input validation runs BEFORE query call so garbage enum values never hit Postgres. A Postgres enum violation would surface as an opaque 500 with leaked DB internals; an explicit 'Invalid visibility value' error message is the clean boundary."
  - "Personas file keeps its inline supabase.auth.getUser() pattern (per PATTERNS.md #7 — deliberate divergence from lists/actions.ts which uses a shared getAuthenticatedUser helper). Did NOT refactor to unify — that's out of scope and the plan spec explicitly preserved this divergence."
  - "RedirectError in personas/__tests__/actions.test.ts carries only .digest (not .message) — existing pattern. The new updatePersonaVisibilityAction test intentionally does NOT assert error.message contains 'NEXT_REDIRECT' (it would be empty); instead it asserts result.success === false + DB never called, which is the security-critical invariant."

patterns-established:
  - "Phase 44 action boundary: isVisibility() validation always runs BEFORE query layer — no 'let Postgres reject invalid enums' fallback"
  - "Phase 44 visibility on create: default 'team_shared' when formData key missing/empty; reject garbage explicitly; thread validated Visibility into the query layer input"
  - "Phase 44 visibility on update: partial-update semantics (omit = no-op) not default-fill; only the dedicated update*VisibilityAction accepts a raw Visibility arg"
  - "T-44-02 mitigation: action files are grep-clean for `isAdmin|created_by !==|user.id !==`; RLS UPDATE USING clause from Plan 44-01 is the single authorization source of truth"

requirements-completed: [VIS-ACTIONS]

# Metrics
duration: ~5min
completed: 2026-04-17
---

# Phase 44 Plan 03: Server-Action Layer Summary

**Wired server-action layer to the extended query layer for list/persona visibility — 4 action functions (2 extended, 2 new), 23 new Vitest cases, zero parallel JS permission checks. RLS remains the sole authorization trust boundary.**

## Performance

- **Duration:** ~5 min (4 tasks, 4 commits)
- **Started:** 2026-04-17T11:59:07Z
- **Completed:** 2026-04-17T12:03:55Z
- **Tasks:** 4 (all `type="auto"`)
- **Files modified:** 4 (2 action files + 2 test files)

## Accomplishments

### Action files

- **`src/app/[orgId]/lists/actions.ts`**
  - Added `import type { Visibility } from "@/types/visibility"` + `isVisibility` guard
  - Added `updateListVisibility` to the `@/lib/lists/queries` import list
  - `createListAction` now reads `formData.get("visibility")`, defaults to `'team_shared'`, validates via `isVisibility()`, throws `"Invalid visibility value"` on garbage (before DB call), threads `visibility` into `createList` input
  - New `updateListVisibilityAction(listId, visibility)` — authenticates, validates visibility, calls `updateListVisibility(listId, tenantId, visibility)`, revalidates `/[orgId]/lists` + `/[orgId]/lists/[listId]`, returns `{ success: true }` or `{ success: false, error }`
  - NO parallel JS `isAdmin` or `created_by` check — RLS is the sole authorization gate

- **`src/app/[orgId]/personas/actions.ts`**
  - Added `import type { Visibility }` + `isVisibility` + `UpdatePersonaInput`
  - Added `updatePersonaVisibility` to the `@/lib/personas/queries` import list
  - `createPersonaAction` now reads `formData.get("visibility")`, defaults to `'team_shared'`, validates + rejects garbage, threads into `createPersona` input
  - `updatePersonaAction` now reads `formData.get("visibility")`; **partial-update semantics** — only merges into `UpdatePersonaInput` when caller explicitly sent the field (omit = don't change)
  - New `updatePersonaVisibilityAction(personaId, visibility)` — inline auth (mirrors existing pattern in this file per PATTERNS.md #7), validates, calls `updatePersonaVisibility`, revalidates `/[orgId]/personas`, returns result envelope
  - Inline auth preserved (no refactor to unified getAuthenticatedUser helper — out of scope)

### Test files

- **`src/app/[orgId]/lists/__tests__/actions.test.ts`** — 10 new tests (19 pre-existing → 29 total pass)
  - `describe("createListAction — visibility (Phase 44)")` — 4 cases: personal from formData, default team_shared, reject garbage, accept team_shared
  - `describe("updateListVisibilityAction — Phase 44")` — 6 cases: happy-path personal, happy-path team_shared, reject garbage, not authenticated, role guard rejects, surface RLS error

- **`src/app/[orgId]/personas/__tests__/actions.test.ts`** — 13 new tests (10 pre-existing → 23 total pass)
  - Extended `fdWithFilters` helper to optionally set `visibility`
  - `describe("createPersonaAction — visibility (Phase 44)")` — 4 cases mirror lists
  - `describe("updatePersonaAction — visibility (Phase 44)")` — 3 cases: merges when specified, omits when missing (partial-update verification), rejects garbage
  - `describe("updatePersonaVisibilityAction — Phase 44")` — 6 cases mirror updateListVisibilityAction

### Security invariants proven

- T-44-02 (Elevation of Privilege): A compromised client that POSTs `updateListVisibilityAction('someone-elses-list-id', 'personal')` bypassing UI gating fails at RLS (silent zero-row update). Action file contains NO parallel `if (user.id !== list.created_by && !isAdmin) return { error }` check. Confirmed via grep:
  ```
  grep -En "isAdmin|created_by !==|user\.id !==" src/app/[orgId]/{lists,personas}/actions.ts
  # → no matches
  ```
- T-44-11 (Tampering via bad input): `isVisibility()` guard at action entry rejects `'garbage'` before query layer call. Postgres enum is a second line of defense.

## Task Commits

1. **Task 1 — `739256d`** `feat(44-03): thread visibility through lists actions + add updateListVisibilityAction`
2. **Task 2 — `fcc8d6d`** `feat(44-03): thread visibility through persona actions + add updatePersonaVisibilityAction`
3. **Task 3 — `77da13a`** `test(44-03): add visibility round-trip coverage for lists actions`
4. **Task 4 — `2523a3f`** `test(44-03): add visibility round-trip coverage for persona actions`

## Acceptance Criteria Evidence

| Criterion | Evidence |
| --- | --- |
| `createListAction` reads visibility from formData, defaults to 'team_shared', validates via isVisibility | `grep 'formData.get("visibility")' src/app/[orgId]/lists/actions.ts` hits L52; isVisibility + default path at L53-59 |
| `updateListVisibilityAction` exported + calls `updateListVisibility` query | `grep 'export async function updateListVisibilityAction' src/app/[orgId]/lists/actions.ts` hits L187; `updateListVisibility(listId, tenantId, visibility)` call at L198 |
| `createPersonaAction` / `updatePersonaAction` accept visibility from formData | Both `grep 'formData.get("visibility")' src/app/[orgId]/personas/actions.ts` hits (L41 for create, L148 for update); isVisibility validation in both paths |
| `updatePersonaVisibilityAction` exported + calls `updatePersonaVisibility` query | `grep 'export async function updatePersonaVisibilityAction'` hits L249; `updatePersonaVisibility(personaId, tenantId, visibility)` call at L273 |
| All new + extended actions use `getAuthenticatedUser()` (or equivalent session-client auth pattern) | Lists uses shared `getAuthenticatedUser()`; personas uses inline `supabase.auth.getUser()` + role guard (PATTERNS.md #7 — deliberate divergence preserved) |
| Invalid visibility values return `{ success: false, error }` WITHOUT calling query layer | Test `createListAction — rejects garbage visibility value and never calls createList` + mirror for persona both pass; `expect(mockCreate*).not.toHaveBeenCalled()` asserted |
| `revalidatePath` called with correct route tokens after successful visibility mutations | `updateListVisibilityAction` revalidates `/[orgId]/lists` + `/[orgId]/lists/[listId]`; `updatePersonaVisibilityAction` revalidates `/[orgId]/personas` |
| Vitest test files extended with visibility round-trip coverage | Lists: +10 tests (29 pass); Personas: +13 tests (23 pass) |
| `pnpm vitest run <both test files>` exits 0 | ✅ 52 tests pass across both files |
| No action contains `if (user.id !== list.created_by && !isAdmin) ...` — RLS is the trust boundary | `grep -En "isAdmin|created_by !==|user\.id !==" src/app/[orgId]/{lists,personas}/actions.ts` → no matches |
| `pnpm tsc --noEmit` does not regress | 6 pre-existing errors in `src/lib/search/__tests__/execute-research.test.ts` (Plan 44-02 deferred-items.md); ZERO new errors in action files or test files |

## TSC State

Zero new errors. Pre-existing deferred errors unchanged (documented in `deferred-items.md`):
```
src/lib/search/__tests__/execute-research.test.ts(178,12): error TS2532: Object is possibly 'undefined'.
src/lib/search/__tests__/execute-research.test.ts(178,34): error TS2493: Tuple type '[]' of length '0' has no element at index '0'.
src/lib/search/__tests__/execute-research.test.ts(180,12): error TS2532: Object is possibly 'undefined'.
src/lib/search/__tests__/execute-research.test.ts(180,36): error TS2493: Tuple type '[]' of length '0' has no element at index '0'.
src/lib/search/__tests__/execute-research.test.ts(200,24): error TS2352: Conversion of type 'undefined' to type 'ChannelParams' may be a mistake ...
src/lib/search/__tests__/execute-research.test.ts(200,46): error TS2493: Tuple type '[]' of length '0' has no element at index '0'.
```

## Vitest Run Output

```
$ pnpm vitest run src/app/[orgId]/lists/__tests__/actions.test.ts src/app/[orgId]/personas/__tests__/actions.test.ts

 ✓ src/app/[orgId]/lists/__tests__/actions.test.ts (29 tests)
 ✓ src/app/[orgId]/personas/__tests__/actions.test.ts (23 tests)

 Test Files  2 passed (2)
      Tests  52 passed (52)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Test Assertion Bug] Empty `error.message` from RedirectError in personas test file**

- **Found during:** Task 4 (first vitest run)
- **Issue:** The `RedirectError` class in `src/app/[orgId]/personas/__tests__/actions.test.ts:51-53` is defined as:
  ```typescript
  class RedirectError extends Error {
    digest = "NEXT_REDIRECT;replace;/tenant-x;307";
  }
  ```
  Unlike the sibling test file at `src/app/[orgId]/lists/__tests__/actions.test.ts` which calls `super(message)` with the digest string, this one does NOT set `.message`. My initial test asserted `expect(result.error).toContain("NEXT_REDIRECT")` which failed because `error.message` is `""` after the action catches the thrown RedirectError.
- **Fix:** Changed the test to only assert `result.success === false` + `mockUpdatePersonaVisibility` was never called — the security-critical invariants. Added an explanatory comment in the test documenting the shape asymmetry between the two files' RedirectError classes. No production code change needed; this is a test-harness peculiarity.
- **Files modified:** `src/app/[orgId]/personas/__tests__/actions.test.ts`
- **Commit:** `2523a3f` (included in Task 4 commit)
- **Impact:** None on production semantics. The rejected-DB-never-touched invariant is still proven; the NEXT_REDIRECT string assertion was redundant given the pre-existing tests in the same file use `.rejects.toMatchObject({ digest: ... })` on throws (not on returned envelopes).

**Total deviations:** 1 auto-fixed (Rule 1 test assertion bug). No Rule 2/3/4 deviations. No user decisions required.

## Issues Encountered

- **Empty `error.message` in persona test file's RedirectError (Task 4 first vitest run):** Documented above as Deviation #1. Fixed in-file.
- **PreToolUse:Edit hook false positives:** The hook asked for re-reads after files were already read earlier in the session; edits still went through successfully. Not a defect; hook is overly cautious.
- **No other issues.** All 4 tasks executed first pass per plan spec (modulo the one test-assertion fix above).

## Downstream Impact

Plan 44-04 (UI creation dialogs) can now:
- Import + call `createListAction` / `createPersonaAction` from forms that include a `<input type="hidden" name="visibility" value={...}>` field
- Import + call `updateListVisibilityAction` / `updatePersonaVisibilityAction` from dropdown onChange handlers
- Trust that all input validation is handled at the action boundary (no client-side `isVisibility` needed before POST)

Plan 44-05 (admin workspace page) can now:
- Wire toggle buttons directly to `updateListVisibilityAction(list.id, nextVisibility)` / `updatePersonaVisibilityAction(persona.id, nextVisibility)`
- Rely on RLS admin-role clause from Plan 44-01 to allow admins to toggle visibility on rows they don't own (NO client-side admin gate needed in the action — RLS handles it)

## User Setup Required

None. Pure TypeScript + test additions; no env vars, no migrations, no user action.

## Next Phase Readiness

- Wave 3 complete. Plans 44-04 (UI dialogs) and 44-05 (admin workspace) now unblocked — both depend on the action exports landed here.
- No blockers or concerns carried forward.

## Self-Check: PASSED

**Files modified — on disk:**
- `src/app/[orgId]/lists/actions.ts` — FOUND
- `src/app/[orgId]/personas/actions.ts` — FOUND
- `src/app/[orgId]/lists/__tests__/actions.test.ts` — FOUND
- `src/app/[orgId]/personas/__tests__/actions.test.ts` — FOUND

**Commits verified in git log:**
- `739256d` — FOUND (feat(44-03): thread visibility through lists actions + add updateListVisibilityAction)
- `fcc8d6d` — FOUND (feat(44-03): thread visibility through persona actions + add updatePersonaVisibilityAction)
- `77da13a` — FOUND (test(44-03): add visibility round-trip coverage for lists actions)
- `2523a3f` — FOUND (test(44-03): add visibility round-trip coverage for persona actions)

**Anti-pattern grep (T-44-02):** CLEAN — `grep -En "isAdmin|created_by !==|user\.id !==" src/app/[orgId]/{lists,personas}/actions.ts` returns no matches.

**TSC in-scope:** 0 new errors. 6 pre-existing deferred errors in `execute-research.test.ts` (unchanged).

**Vitest:** `pnpm vitest run src/app/[orgId]/lists/__tests__/actions.test.ts src/app/[orgId]/personas/__tests__/actions.test.ts` → 52 tests pass.

---
*Phase: 44-list-search-visibility*
*Plan: 03*
*Completed: 2026-04-17*
