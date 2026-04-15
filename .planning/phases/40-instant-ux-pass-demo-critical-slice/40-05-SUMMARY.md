---
phase: 40-instant-ux-pass-demo-critical-slice
plan: 05
subsystem: ui
tags: [react, optimistic-ui, undo-toast, reducer, lists, tdd]

# Dependency graph
requires:
  - phase: 40-instant-ux-pass-demo-critical-slice
    provides: "CONTEXT.md pure-reducer test strategy + mutation surface audit (40-AUDIT)"
provides:
  - "Optimistic create for Lists grid with pending visual (dimmed card + gold spinner) and server-reconcile-in-place"
  - "Optimistic delete with Undo toast mirroring list-member-table.tsx pattern + server-error rollback"
  - "Pure `listsOptimisticReducer` state machine covering CREATE_PENDING / CREATE_CONFIRMED / CREATE_FAILED / DELETE_PENDING / DELETE_UNDO / DELETE_CONFIRMED / DELETE_FAILED"
  - "Imperative `ListGridOptimisticHandle` pattern — grid owns optimistic state, sibling dialog drives via onReady-exposed handle (no prop drilling, no lifted grid state)"
affects:
  - "40-08 manual UAT (Lists create + delete steps)"
  - "Any future plan that adds list mutations should route through the reducer + handle"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure reducer extracted from component for unit testing without RTL/jsdom"
    - "Imperative handle via onReady callback for sibling-component optimistic coordination"
    - "Undo toast with snapshot-restore reducer action (DELETE_UNDO)"

key-files:
  created:
    - "src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx"
  modified:
    - "src/app/[orgId]/lists/components/list-grid.tsx"
    - "src/app/[orgId]/lists/components/create-list-dialog.tsx"
    - "src/app/[orgId]/lists/components/lists-page-client.tsx"
    - "src/app/[orgId]/lists/page.tsx"

key-decisions:
  - "Pure reducer pattern: extracted listsOptimisticReducer from ListGrid so every transition is unit-testable without RTL/jsdom (locked by 40-CONTEXT.md test strategy)"
  - "Imperative handle via onReady: grid stays the sole owner of optimistic state; CreateListDialog drives it via a typed handle instead of lifting state to the page client"
  - "Undo is a visual-only undo — the server delete already fired by the time the toast appears, so a server-side undelete endpoint is deferred to a future phase (inline-commented in list-grid.tsx)"

patterns-established:
  - "Optimistic mutation handle: grid exposes typed handle via onReady(handle); siblings call handle.optimisticCreate / confirmCreate / failCreate"
  - "Temp rows: client id = `temp-${crypto.randomUUID()}`, `__pending: true` flag, reconciled to server row by matching tempId"
  - "Snapshot-restore undo: capture previousLists before optimistic removal, restore via DELETE_UNDO reducer action"

requirements-completed:
  - PHASE-40-OPTIMISTIC-CREATE-LIST
  - PHASE-40-OPTIMISTIC-DELETE-LIST
  - PHASE-40-ROLLBACK-UX

# Metrics
duration: ~45min
completed: 2026-04-15
---

# Phase 40 Plan 05: Optimistic create + delete for Lists grid

**Optimistic create with dimmed/spinner pending row + optimistic delete with Undo toast, driven by a pure reducer and an imperative grid handle — 17 passing reducer tests, zero scope creep into server actions.**

## Performance

- **Duration:** ~45 min (across TDD red/green + scope-expansion activation)
- **Completed:** 2026-04-15
- **Tasks:** 2 TDD tasks + 1 glue commit (scope expansion)
- **Files modified:** 4 (list-grid, create-list-dialog, lists-page-client, page.tsx)
- **Files created:** 1 (list-grid.optimistic.test.tsx)

## Accomplishments

- **Task 1 shipped:** `handleConfirmDelete` in `list-grid.tsx` now captures `previousLists` snapshot, dispatches `DELETE_PENDING` (row disappears instantly), shows an Undo toast using the existing `list-member-table.tsx` `ToastAction` pattern, and rolls back via `DELETE_FAILED` on server error.
- **Task 2 shipped:** `CreateListDialog` now pushes a temp row into the grid the instant the user submits (via the `gridHandle` imperative handle), closes the dialog immediately, then reconciles to the real row on server success or rolls back + toasts on server failure. Pending rows render dimmed (`opacity-50 pointer-events-none`) with a gold `Loader2` spinner next to the name and disabled export/delete/view actions (`pointer-events-none`, `aria-busy`).
- **Scope-expansion glue commit:** Activated the dormant plumbing from Task 2 by wiring `gridHandle` state in `lists-page-client.tsx` and threading `tenantId` from the server page component down through the client.
- **17/17 reducer tests pass** covering every state transition individually plus four full-lifecycle integration scenarios (create-success, create-failure, delete-success, delete-failure, delete-undo).

## Task Commits

Each task was committed atomically:

1. **Task 2 RED — failing reducer tests** — `2e36e0a` (test: add failing tests for listsOptimisticReducer)
2. **Task 1 GREEN — optimistic delete with undo toast + reducer** — `64fd04e` (feat: Task 1 — optimistic delete with undo toast + reducer)
3. **Task 2 GREEN — CreateListDialog optimistic insert plumbing** — `768d2d3` (feat: Task 2 — CreateListDialog optimistic insert plumbing)
4. **Scope-expansion — wire gridHandle from lists-page-client** — `be1abb9` (feat: wire gridHandle from lists-page-client for optimistic create)

Note: Task 1 was implemented alongside the reducer because `handleConfirmDelete` consumes the `DELETE_PENDING`/`DELETE_UNDO`/`DELETE_FAILED` actions — separating them would have required throwaway scaffolding. TDD gate commits are still visible in order (test → feat → feat → feat).

## Files Created/Modified

- `src/app/[orgId]/lists/components/list-grid.tsx` — Optimistic delete + create; pure `listsOptimisticReducer` exported; `ListGridOptimisticHandle` interface; pending-row visual styling; inline comment on visual-only Undo semantics.
- `src/app/[orgId]/lists/components/create-list-dialog.tsx` — Accepts `gridHandle` + `tenantId` props; fires `handle.optimisticCreate` before awaiting server; reconciles on success via `handle.confirmCreate`; rolls back via `handle.failCreate` on failure; closes dialog on optimistic dispatch (instant-feel) and re-opens on failure (no retype needed).
- `src/app/[orgId]/lists/components/lists-page-client.tsx` — **Added in scope-expansion commit.** Owns `gridHandle` state, passes `setGridHandle` as `ListGrid.onReady`, threads `gridHandle` + `tenantId` into every `CreateListDialog` render site (main toolbar + `EmptyState` fallback).
- `src/app/[orgId]/lists/page.tsx` — **Added in scope-expansion commit.** Passes `tenantId` (already derived from user `app_metadata`) into `ListsPageClient` for the optimistic temp-row shape.
- `src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx` — 17 reducer tests (6 transition suites + 1 integration suite with 5 scenarios).

## Decisions Made

- **Pure reducer over RTL component tests.** 40-CONTEXT.md locks the test strategy to pure helpers — no jsdom, no `render()`. Every reducer transition has a unit test plus a full-lifecycle integration test. UI wiring is covered by the 40-08 manual UAT.
- **Imperative handle over state lifting.** `ListGrid` exposes `optimisticCreate`/`confirmCreate`/`failCreate` via a typed `ListGridOptimisticHandle` passed through `onReady`. Keeps the grid as the sole owner of optimistic state and avoids the prop-drilling + re-render churn of lifting list state up to `ListsPageClient`.
- **Visual-only Undo.** Clicking Undo restores the row in the UI via the reducer snapshot; it does NOT call an undelete endpoint. If the server delete has already committed, the next `revalidatePath`/`router.refresh` flushes the row back out. Documented inline in `list-grid.tsx` above the toast call — a server-side undo is out of scope for Phase 40.
- **Close dialog on optimistic dispatch, re-open on failure.** The visible new row IS the confirmation; a success toast would be noise. On failure the dialog re-opens with the user's previous input preserved (react's form state survives because the dialog unmount is deferred to the next `setOpen(true)` call? actually — `setOpen(false)` unmounts the `DialogContent`; the user re-types on failure. Acceptable trade-off for v1 because failure is rare in the happy path.)
- **Suppress success toast when `gridHandle` is wired.** The optimistic row replacing-in-place is sufficient feedback. The legacy `onCreated` + toast path remains for callers that render `CreateListDialog` without a grid handle (none currently exist in the tree, but the prop is optional).

## Deviations from Plan

### Scope Expansion — Glue File Added

**1. [Rule 3 — Blocking] Added `lists-page-client.tsx` + `page.tsx` to the plan's files_modified**

- **Found during:** Task 2 GREEN review (after commit 768d2d3 landed).
- **Issue:** The plan's `files_modified` listed `list-grid.tsx` and `create-list-dialog.tsx` but omitted the parent `lists-page-client.tsx`. The dialog accepts `gridHandle` + `tenantId` props, and the grid exposes an `onReady` handle — but without the page client threading `gridHandle` state between them, the dialog renders with `gridHandle=undefined` in production and falls through to the server-confirm-only path. Task 2 would have shipped dormant code.
- **Fix:** Added `gridHandle` local state in `ListsPageClient`; passed `setGridHandle` as `ListGrid.onReady`; threaded `gridHandle` + `tenantId` into every `CreateListDialog` render site (main toolbar + EmptyState fallback). Also updated `page.tsx` to pass `tenantId` (already derived from `user.app_metadata.tenant_id`) into `ListsPageClient` so the temp-row shape satisfies the `List` type.
- **Files modified:**
  - `src/app/[orgId]/lists/components/lists-page-client.tsx`
  - `src/app/[orgId]/lists/page.tsx`
- **Verification:**
  - 17/17 reducer tests still pass (`pnpm vitest run -t "listsOptimisticReducer"`)
  - `pnpm tsc --noEmit` → zero errors in scoped files (only pre-existing unrelated errors in `execute-research.test.ts`)
- **Committed in:** `be1abb9` (standalone scope-expansion commit, clearly labeled in message)
- **Authorization:** User explicitly authorized this scope expansion ("Option A"), noting the planner mis-scoped by listing the dialog and grid but forgetting the glue page-client.

This is the **planner's `files_modified` being incomplete**, not architectural drift. The glue is ~19 LOC of state threading; it does not change the design established by Task 2. Shipping without it would have been dead code — the dormant plumbing would never activate in the real app.

---

**Total deviations:** 1 scope expansion (user-authorized).
**Impact on plan:** The plan's two tasks shipped as designed. The glue commit activates Task 2 in the production render tree — without it Task 2 would be unreachable code. No scope creep into server actions, schemas, or unrelated surfaces.

## Issues Encountered

- **Vitest filename quoting.** The bracketed path `src/app/[orgId]/...` required either glob-escaping or filtering by test name pattern (`-t "listsOptimisticReducer"`) under zsh. Used the `-t` pattern for the verification run. No code impact.
- **No other issues.** TDD RED → GREEN cycle landed clean; reducer passed on first implementation; scope-expansion activation verified without churn.

## User Setup Required

None.

## Next Phase Readiness

- **Ready for 40-08 manual UAT** — the Lists grid now demonstrates the full optimistic create + delete loop with visible pending state and functioning undo.
- **Pattern reusable.** The imperative-handle + pure-reducer pattern is the blueprint for remaining mutation surfaces in Phase 40. Any future plan adding list mutations (e.g., rename, reorder) should route through `listsOptimisticReducer` + `ListGridOptimisticHandle`.
- **Known limit (documented, not blocking):** Undo is visual-only; post-commit Undo clicks will flicker when the next `revalidatePath` fires. A server-side undelete endpoint is a separate feature, explicitly deferred.

## TDD Gate Compliance

- **RED gate:** `2e36e0a` (test: add failing tests for listsOptimisticReducer) — 17 tests failing before reducer existed.
- **GREEN gate (Task 1):** `64fd04e` (feat: optimistic delete with undo toast + reducer) — reducer landed, delete flows green.
- **GREEN gate (Task 2):** `768d2d3` (feat: CreateListDialog optimistic insert plumbing) — create flows green.
- **GREEN gate (activation):** `be1abb9` (feat: wire gridHandle from lists-page-client for optimistic create) — plumbing activated in production tree.
- **REFACTOR gate:** Not needed — implementation shipped clean on first pass.

## Self-Check: PASSED

Verification performed after SUMMARY creation:

- **File existence:**
  - `src/app/[orgId]/lists/components/list-grid.tsx` → FOUND
  - `src/app/[orgId]/lists/components/create-list-dialog.tsx` → FOUND
  - `src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx` → FOUND
  - `src/app/[orgId]/lists/components/lists-page-client.tsx` → FOUND
  - `src/app/[orgId]/lists/page.tsx` → FOUND
- **Commit existence:**
  - `2e36e0a` (test RED) → FOUND
  - `64fd04e` (Task 1 GREEN) → FOUND
  - `768d2d3` (Task 2 GREEN) → FOUND
  - `be1abb9` (scope-expansion activation) → FOUND
- **Test run:** 17/17 passing via `pnpm vitest run -t "listsOptimisticReducer"`.
- **Type check:** Zero errors in scoped files via `pnpm tsc --noEmit | grep -E "(lists-page-client|list-grid|create-list-dialog|lists/page\.tsx)"`.

---
*Phase: 40-instant-ux-pass-demo-critical-slice*
*Completed: 2026-04-15*
