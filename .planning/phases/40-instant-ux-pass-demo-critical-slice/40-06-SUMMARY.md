---
phase: 40-instant-ux-pass-demo-critical-slice
plan: 06
subsystem: search + prospect-profile
tags: [optimistic-ui, toasts, rollback, tdd]
requires:
  - src/components/ui/toast.tsx (ToastAction, ToastActionElement)
  - src/hooks/use-toast.ts (useToast, toast function type)
provides:
  - src/app/[orgId]/search/lib/dismiss-reducer.ts (applyDismiss, applyUndoDismiss, runOptimisticDismiss)
  - src/components/prospect/lib/tags-reducer.ts (computeTagDiff, applyTagDiff)
  - src/components/prospect/lib/profile-edit-reducer.ts (runFieldSave)
affects:
  - src/app/[orgId]/search/components/search-content.tsx (handleDismiss now uses reducer + undo toast)
  - src/components/prospect/profile-view.tsx (handleTagsChange now toasts on per-tag failure)
  - src/components/prospect/inline-edit-field.tsx (handleSave now toasts on save failure)
tech-stack:
  added: []
  patterns:
    - pure-helper extraction for testability without RTL
    - toast + ToastAction undo pattern (mirrors list-member-table.tsx:148)
    - Parameters<typeof toast>[0] for toast signature compatibility
key-files:
  created:
    - src/app/[orgId]/search/lib/dismiss-reducer.ts
    - src/app/[orgId]/search/components/__tests__/dismiss.optimistic.test.tsx
    - src/components/prospect/lib/tags-reducer.ts
    - src/components/prospect/__tests__/tags.optimistic.test.tsx
    - src/components/prospect/lib/profile-edit-reducer.ts
    - src/components/prospect/__tests__/profile-edit.optimistic.test.tsx
  modified:
    - src/app/[orgId]/search/components/search-content.tsx
    - src/components/prospect/profile-view.tsx
    - src/components/prospect/inline-edit-field.tsx
decisions:
  - Extract per-surface reducers/orchestration into src/*/lib/* modules; keep component files thin. Chosen over inline test-double harnesses because 40-CONTEXT locked "no RTL" — pure helpers are the only testable unit.
  - Undo toast restores UI synchronously inside the click handler before firing the server undo POST, so the user sees the restore instantly. Mirrors the list-member-table undo pattern.
  - For profile-view tag rollback, each failed POST/DELETE gets its own toast instead of one aggregate toast. Reason: the existing loop was per-tag anyway and surgical error messages are more actionable ("Failed to add tag 'foo': tag too long" vs "Some tags failed").
  - Toast function typed via Parameters<typeof toast>[0] (re-exported from @/hooks/use-toast) to stay compatible with shadcn's intersection of Radix ToastProps + ToasterToast. Avoids coupling the reducers to Radix internals.
metrics:
  duration: ~22 minutes
  completed: 2026-04-15
  tasks_completed: 3
  tests_added: 28
  commits: 6
---

# Phase 40 Plan 06: Optimistic Dismiss + Tags + Profile Edit Summary

Three optimistic-UI surfaces (search-result dismiss with undo, prospect tag add/remove, inline profile-field edit) now show immediate feedback and roll back with a destructive toast on server failure.

## What was built

### Task 1 — Optimistic dismiss with undo toast

**Before:** Clicking dismiss on a search-result card triggered an optimistic filter with a plain success toast. If the server call failed, prospects silently restored with a generic "Dismiss failed" toast — no undo affordance, no server error propagation.

**After:** Dismiss click fires the same optimistic filter, but the toast now carries a `ToastAction` with an Undo label. Clicking Undo restores the UI synchronously and POSTs `{ action: "undo" }` to the same endpoint. On server error during the initial dismiss, the toast shows the parsed server error message (`body.error` if available).

**Files:**
- New: `src/app/[orgId]/search/lib/dismiss-reducer.ts` — `applyDismiss` / `applyUndoDismiss` pure reducers + `runOptimisticDismiss` orchestration
- Modified: `src/app/[orgId]/search/components/search-content.tsx` — `handleDismiss` now delegates to `runOptimisticDismiss`, passes a `ToastAction` rendered with inline undo handler

**Tests:** `src/app/[orgId]/search/components/__tests__/dismiss.optimistic.test.tsx` — 11 tests covering reducer purity, bulk vs single dispatch, error rollback paths, generic fallback on missing server error, fetch-level rejection handling.

### Task 2 — Tighten tag rollback with destructive toast

**Before:** `handleTagsChange` in `profile-view.tsx:295` performed per-tag optimistic POST/DELETE. On failure it reverted UI state **silently** — no toast, no error message.

**After:** Each failure (add OR remove) fires a per-tag destructive toast with the server's error message (or a generic fallback). The `applyTagDiff` helper drives the per-tag loop and fires `onAddFail(tag, errorMsg)` / `onRemoveFail(tag, errorMsg)` callbacks so the component can do a surgical revert of just the affected tag without clobbering concurrent writes.

**Files:**
- New: `src/components/prospect/lib/tags-reducer.ts` — `computeTagDiff` (pure set difference) + `applyTagDiff` (per-tag orchestration)
- Modified: `src/components/prospect/profile-view.tsx` — `handleTagsChange` now uses `computeTagDiff` + `applyTagDiff` with callbacks that revert the single tag and fire a toast

**Tests:** `src/components/prospect/__tests__/tags.optimistic.test.tsx` — 11 tests covering diff correctness, POST/DELETE body shapes, per-side failure callbacks, network rejection, mixed success/failure sequences.

### Task 3 — Optimistic inline profile-field edit with rollback

**Before:** `inline-edit-field.tsx:61` caught `onSave` rejections and silently reverted `displayValue` + `inputValue`. No toast, so users saw their edit disappear without explanation (bad URL validation, perm denied, etc.).

**After:** `handleSave` delegates to `runFieldSave` which:
1. awaits `onSave(newValue)`
2. on rejection, calls `onRevert(previousValue)` and fires a destructive toast with the thrown error's message
3. uses the optional `label` prop to personalize the toast title (e.g. "Failed to save Email")

**Files:**
- New: `src/components/prospect/lib/profile-edit-reducer.ts` — `runFieldSave` helper
- Modified: `src/components/prospect/inline-edit-field.tsx` — adds `useToast` import + `runFieldSave` call

**Tests:** `src/components/prospect/__tests__/profile-edit.optimistic.test.tsx` — 6 tests covering commit-on-success, revert+toast on Error reject, null previousValue edge case, generic fallback on non-Error reject, label-driven toast title, no-toast-on-success even with label.

## Verification results

- **All 3 test files pass:** 28/28 tests green (`pnpm vitest run` against each file)
- **Typecheck clean** on all modified files (`tsc --noEmit`)
- **Build compiles successfully** (`next build` — prerender errors on auth/admin pages are pre-existing and unrelated to 40-06)
- **grep requirements met:**
  - `toast({...destructive` in `profile-view.tsx`: 3 hits (≥1 required)
  - `previousValue` in `inline-edit-field.tsx`: 2 hits (≥1 required)

## Key decisions

### Toast typing via `Parameters<typeof toast>[0]`
The shadcn `toast` function accepts `Omit<ToasterToast, "id">` where `ToasterToast` intersects Radix `ToastProps` with custom fields, producing a narrower `title: string` constraint than `ReactNode`. Declaring our own `ToastArgs` type (with `title?: ReactNode`) caused a contravariance mismatch when assigning the real `toast` to a parameter. Using `Parameters<typeof ToastFunction>[0]` inherits the exact shadcn shape, keeps reducers decoupled from Radix, and lets test callers use `vi.fn()` since we relax the return type to `unknown`.

### Undo handler scoped to the dismiss call
`runOptimisticDismiss` takes an `undoAction?: ToastActionElement` prop rather than baking the undo logic into the reducer. The component-level `handleDismiss` closure over `previousProspects` / `previousDismissedCount` + `persona` + the scoped `loadSavedProspects` keeps the undo deterministic even if the component state changes between dismiss-click and undo-click. The reducer stays React-free.

### Per-tag surgical revert instead of array-replay
The tag rollback uses `setCurrentTags((prev) => prev.filter((t) => t !== tag))` (add fail) and `setCurrentTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))` (remove fail) rather than restoring the full prior tag array. Reason: if the user adds tags A and B simultaneously and only A fails, we want A removed and B to stay — a full-array replay would nuke B. The include-check on the re-add prevents duplicate entries from race conditions.

## Auth gates

None. All three surfaces were authenticated already via the existing API routes.

## Deviations from Plan

### Rule 1 - Bug: None
Plan executed as written.

### Rule 2 - Missing critical functionality: None
Scope was strictly bounded to the files listed in `files_modified`.

### Rule 3 - Blocking issue: Worktree `node_modules/` was empty
- **Found during:** Task 1 GREEN test run
- **Issue:** `pnpm vitest` and `pnpm build` failed — worktree had no installed deps
- **Fix:** Used the parent repo's `node_modules/.bin/vitest` and `node_modules/.bin/next` directly via absolute path. No state change needed.
- **Commit:** n/a — tooling workaround only

### Scope-boundary deferrals
Two pre-existing test/type issues discovered during verification, logged to `deferred-items.md` per deviation rules:
1. `src/lib/search/__tests__/execute-research.test.ts` — 6 pre-existing TS errors
2. `src/inngest/functions/__tests__/enrich-prospect.test.ts` — 22 pre-existing runtime failures (Supabase RPC mock mismatch)

Both confirmed pre-existing by stashing my working tree and running against base commit `085482b`. Out of 40-06 scope.

## Tasks + commits

| Task | Name                                              | Commits                                                                 |
| ---- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| 1    | Optimistic dismiss with undo toast                | `b60238b` (RED), `81a4944` (GREEN)                                       |
| 2    | Tag rollback with destructive toast               | `55871e7` (RED), `9bd4f5e` (GREEN)                                       |
| 3    | Inline profile-field rollback with toast          | `476ca16` (RED), `57e483a` (GREEN)                                       |

All commits follow TDD gate ordering (`test:` before `feat:`).

## Known Stubs

None. All three handlers wire real state + real fetch + real toast.

## Self-Check: PASSED

- `.planning/phases/40-instant-ux-pass-demo-critical-slice/40-06-SUMMARY.md` FOUND
- `src/app/[orgId]/search/lib/dismiss-reducer.ts` FOUND
- `src/app/[orgId]/search/components/__tests__/dismiss.optimistic.test.tsx` FOUND
- `src/components/prospect/lib/tags-reducer.ts` FOUND
- `src/components/prospect/__tests__/tags.optimistic.test.tsx` FOUND
- `src/components/prospect/lib/profile-edit-reducer.ts` FOUND
- `src/components/prospect/__tests__/profile-edit.optimistic.test.tsx` FOUND
- Commits `b60238b`, `81a4944`, `55871e7`, `9bd4f5e`, `476ca16`, `57e483a` — all in `git log`
