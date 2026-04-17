---
phase: 44-list-search-visibility
plan: 04
status: complete
subsystem: ui-dialogs
tags: [typescript, react, lucide-react, visibility, optimistic-ui, vitest, phase-44]

# Dependency graph
requires:
  - phase: 44
    plan: 02
    provides: "List.visibility + created_by fields; CreateListInput.visibility; OptimisticList auto-inherits"
  - phase: 44
    plan: 03
    provides: "createListAction + createPersonaAction read visibility from formData; isVisibility() validation; updatePersonaAction partial-update semantics"
provides:
  - "CreateListDialog renders gold-accented segmented control (Users = team_shared, Lock = personal); hidden input name='visibility' threads value into FormData"
  - "makeTempList now accepts visibility + createdBy args; optimistic temp row carries real values from segmented control (Pitfall 5 resolved)"
  - "CreateListDialog exposes currentUserId prop; threaded from lists/page.tsx via supabase.auth.getUser() — no extra auth round-trip"
  - "PersonaFormDialog renders identical segmented control between Name/Description block and first <Separator />; pre-fills from persona.visibility in edit mode, defaults to team_shared in create mode"
  - "PersonaFormDialog resetForm restores visibility alongside other filter state on dialog close/reopen"
  - "list-grid.optimistic.test.tsx fixtures updated: makeList defaults to created_by='user-abc'; makePending signature accepts optional visibility + createdBy"
  - "2 new CREATE_PENDING test cases prove reducer preserves visibility (personal + team_shared) from makeTempList through state — Pitfall 5 regression guard"
affects:
  - 44-05 (list-grid + persona-card badges — can now read the correctly-threaded visibility + created_by from optimistic rows)
  - 44-06 (admin workspace page — no direct dependency, but verifies the same pattern with creator attribution column)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gold-accented segmented control with CSS variable tokens (var(--gold-bg) / var(--border-gold) / var(--gold-primary)) — reusable pattern for any binary/ternary visibility-style toggle in luxury dialogs"
    - "Hidden input name='visibility' pattern — controlled React state drives the visible button pair; hidden input plumbs current value into FormData for server action consumption (avoids double-source-of-truth)"
    - "Optimistic payload thread-through: when a factory constructs an optimistic temp row, every user-facing field must be threaded as an argument — NOT hardcoded to a default (Pitfall 5: hardcoding 'team_shared' for a personal creation would flash the wrong badge pre-confirm)"
    - "aria-pressed on toggle buttons — accessibility affordance for assistive tech to announce active/inactive state on custom segmented controls (not native <input type=radio>)"
    - "Edit-mode pre-fill with legacy fallback: `persona?.visibility ?? 'team_shared'` initializer so legacy rows (pre-migration, NULL visibility) gracefully default to team_shared without UI breakage"

key-files:
  created: []
  modified:
    - src/app/[orgId]/lists/components/create-list-dialog.tsx
    - src/app/[orgId]/lists/components/lists-page-client.tsx
    - src/app/[orgId]/lists/page.tsx
    - src/app/[orgId]/personas/components/persona-form-dialog.tsx
    - src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx

key-decisions:
  - "Threaded currentUserId from lists/page.tsx → lists-page-client.tsx → CreateListDialog (reused existing supabase.auth.getUser() in page.tsx, no extra auth round-trip) rather than re-fetching in the dialog's useEffect — mirrors existing tenantId prop pattern and keeps the dialog pure-client"
  - "Used bespoke two-button segmented control (per PATTERNS.md #8 CSS token spec) instead of shadcn RadioGroup — closer match to persona-card's existing ghost/gold button pattern, gives pixel-perfect control over gold-accent active state that RadioGroup's default palette can't reproduce without extensive theming overrides"
  - "updatePersonaAction merge path unchanged — relies on Plan 44-03's partial-update semantics where formData.get('visibility') provides the value; no explicit updatePersonaVisibilityAction invocation from this dialog (D-10 second bullet: fold into existing updatePersonaAction)"
  - "Updated makeList fixture default from created_by: null to created_by: 'user-abc' so tests exercise the creator-threading path end-to-end (44-02 had left it null as a Rule 3 unblock); Task 3 acceptance criterion explicitly requires 'user-abc'"
  - "Reset visibility in PersonaFormDialog.resetForm() alongside all other filter state so the dialog correctly rewinds to the current persona's visibility (edit mode) or team_shared (create mode) when the dialog re-opens after a close"

patterns-established:
  - "Phase 44 segmented control idiom: two buttons, flex-1 layout, inline style for active gold-bg background + border-gold border + gold-primary text, h-3.5 icon, text-[12px] label — copy verbatim to any future binary visibility/mode toggles in dialogs"
  - "Optimistic factory argument extension: when extending a required field on List/Persona, ALL optimistic factories (makeTempList, test makePending) must accept that field as an argument — never hardcode. This is Pitfall 5 made concrete."
  - "Dialog state reset on close/reopen: resetForm() consolidates EVERY stateful field's reset into one place, called from onOpenChange — prevents orphaned state bleeding between dialog sessions"

requirements-completed: [VIS-UI-CREATE]

# Metrics
duration: ~4 min
completed: 2026-04-17
---

# Phase 44 Plan 04: Visibility Dialog UI Summary

**Shipped gold-accented segmented control for list + persona creation/edit dialogs; threaded real visibility + creator values into the optimistic temp row (Pitfall 5); extended reducer test suite with visibility-preservation guards.**

## Performance

- **Duration:** ~4 min (3 tasks, 3 commits)
- **Started:** 2026-04-17T12:07:42Z
- **Completed:** 2026-04-17T12:11:52Z
- **Tasks:** 3 (all `type="auto"`, `tdd="true"`)
- **Files modified:** 5 (2 in-scope dialogs + 1 test + 2 call-site updates)

## Accomplishments

### CreateListDialog (list creation)

- Gold-accented segmented control with `Users` icon (team_shared, default) and `Lock` icon (personal); hidden input `name="visibility"` plumbs state into FormData for `createListAction` (Plan 44-03 validates via `isVisibility()`)
- `makeTempList` signature extended to accept `visibility: Visibility` and `createdBy: string | null` so the optimistic temp row carries the real selected values (Pitfall 5 resolved — no more 'team_shared' badge flash for personal lists pre-confirm)
- New `currentUserId?: string | null` prop threaded from `lists/page.tsx` (uses the existing `supabase.auth.getUser()` call, no extra auth round-trip) → `lists-page-client.tsx` → `CreateListDialog`
- Both dialog call-sites in `lists-page-client.tsx` (header button + empty-state CTA) updated to pass `currentUserId`
- Active state uses CSS variable tokens (`var(--gold-bg)`, `var(--border-gold)`, `var(--gold-primary)`) per `ui-brand.md` luxury palette; inactive uses `rgba(255,255,255,0.03)` bg + ghost text; `aria-pressed` on both buttons for a11y

### PersonaFormDialog (saved search creation + edit)

- Same segmented control pattern inserted between Name/Description block and the first `<Separator />` per PATTERNS.md #11 anchor
- Create mode defaults `visibility` to `team_shared`; edit mode pre-fills from `persona?.visibility ?? "team_shared"` (legacy fallback for pre-migration rows)
- `resetForm()` extended to reset visibility alongside all other filter state — edit mode restores `persona.visibility`, create mode restores `team_shared`
- Hidden input `name="visibility"` plumbs state into FormData — both `createPersonaAction` and `updatePersonaAction` (Plan 44-03 partial-update semantics) pick it up + validate via `isVisibility()`
- No new action function needed — D-10 fold-in path re-uses the existing `updatePersonaAction` with formData
- Disabled state bound to `isPending` so the control can't be mutated mid-submit

### list-grid.optimistic.test.tsx (reducer guard)

- Added `import type { Visibility } from "@/types/visibility"`
- Updated `makeList` fixture: `created_by: "user-abc"` (was `null` from Plan 44-02 Rule 3 unblock)
- Extended `makePending` signature: accepts optional `visibility` (default `"team_shared"`) and `createdBy` (default `"user-abc"`), matching the real `makeTempList` signature from Task 1
- Added 2 new CREATE_PENDING test cases:
  1. `preserves visibility=personal from makeTempList through CREATE_PENDING (Pitfall 5)` — asserts `next[0].visibility === "personal"`, `created_by === "user-abc"`, `__pending === true`
  2. `preserves visibility=team_shared (default) through CREATE_PENDING` — asserts default threading
- All 19 tests pass (17 pre-existing + 2 new), no regressions to any existing lifecycle test

## Task Commits

1. **Task 1 — `2157e77`** `feat(44-04): add visibility segmented control to create-list-dialog + thread currentUserId`
   - 3 files changed (create-list-dialog.tsx, lists-page-client.tsx, page.tsx), 82 insertions / 10 deletions
2. **Task 2 — `66a107b`** `feat(44-04): add visibility segmented control to persona-form-dialog (create + edit)`
   - 1 file changed (persona-form-dialog.tsx), 56 insertions
3. **Task 3 — `cb9443a`** `test(44-04): extend list-grid.optimistic fixtures + add visibility-preservation tests`
   - 1 file changed (list-grid.optimistic.test.tsx), 45 insertions / 4 deletions

## Files Created/Modified

- `src/app/[orgId]/lists/components/create-list-dialog.tsx` — Added Users/Lock icons + Visibility import + currentUserId prop + visibility state + extended makeTempList + segmented control JSX
- `src/app/[orgId]/lists/components/lists-page-client.tsx` — Added currentUserId prop, threaded into both CreateListDialog call-sites
- `src/app/[orgId]/lists/page.tsx` — Passes `currentUserId={user.id}` from existing auth query to ListsPageClient
- `src/app/[orgId]/personas/components/persona-form-dialog.tsx` — Added Users/Lock icons + Visibility import + visibility state (pre-fills from persona in edit mode) + segmented control JSX + resetForm coverage
- `src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx` — Added Visibility import + updated fixture defaults + 2 new CREATE_PENDING test cases

## Decisions Made

- **Threaded currentUserId from page.tsx, not re-fetched in dialog:** `lists/page.tsx` already calls `supabase.auth.getUser()` for tenant/role — reusing `user.id` via a prop mirrors the existing `tenantId` pattern and avoids an extra auth round-trip in the dialog.
- **Bespoke two-button segmented control over shadcn RadioGroup:** per PATTERNS.md #8 CSS token spec — closer to the persona-card ghost/gold button pattern, gives pixel-perfect control over the gold-accent active state that RadioGroup's default palette can't reproduce without extensive theming overrides.
- **updatePersonaAction fold-in for edit mode (no new action):** D-10 second bullet: persona edit mode calls the existing `updatePersonaAction` with FormData containing `visibility` — Plan 44-03's partial-update semantics handle the merge. No need to invoke `updatePersonaVisibilityAction` separately from this dialog.
- **Updated makeList fixture default from null → "user-abc":** Task 3 acceptance criterion explicitly requires `created_by: "user-abc"` in fixtures; 44-02 had left it null as a Rule 3 unblock. Changing to a real id exercises the creator-threading path end-to-end in all pre-existing lifecycle tests.
- **Reset visibility on form reopen:** `PersonaFormDialog.resetForm()` now includes visibility alongside all other fields — prevents orphaned state bleeding between dialog sessions (e.g., after editing persona A as 'personal', reopening to edit persona B would retain 'personal' without this reset).

## Deviations from Plan

None - plan executed exactly as written.

The plan's optional "If caller doesn't already have user, leave currentUserId as null fallback" note did not apply — `lists/page.tsx` already has `user` from its existing `supabase.auth.getUser()` call, so the real user id was threaded without adding a new auth fetch. No Rule 2/3 deviations needed, no Rule 4 (architectural) decisions required.

## Issues Encountered

- **PreToolUse:Edit hook false-positives:** The hook asked for re-reads after files were already read in the `<files_to_read>` context block at session start. Edits still went through successfully. Not a defect; hook is overly cautious. Documented pattern matches Plan 44-03's same observation.
- **No other issues.** All 3 tasks executed first pass per plan spec.

## Acceptance Criteria Evidence

### Task 1 (create-list-dialog.tsx)

| Criterion | Evidence |
| --- | --- |
| `import type { Visibility }` | `grep -c 'import type { Visibility }' src/app/[orgId]/lists/components/create-list-dialog.tsx` → 1 |
| `name="visibility"` hidden input | `grep -c 'name="visibility"' ...create-list-dialog.tsx` → 1 |
| `aria-pressed` (accessibility) | 2 matches (one per button) |
| Gold palette tokens | `grep -c 'var(--gold-bg)' ...` → 2 |
| `createdBy` threaded | 2 matches |
| `Users` + `Lock` lucide icons | Both import + JSX usages confirmed |
| `pnpm tsc --noEmit` regression | 0 new errors; only 6 pre-existing in execute-research.test.ts (from Plan 44-02 deferred-items.md) |

### Task 2 (persona-form-dialog.tsx)

| Criterion | Evidence |
| --- | --- |
| `import type { Visibility }` | `grep -c` → 1 |
| `useState<Visibility>` | `grep -c` → 1 |
| `persona?.visibility ?? "team_shared"` edit-mode default | `grep -c` → 1 |
| `name="visibility"` hidden input | `grep -c` → 1 |
| `var(--gold-bg)` gold palette | `grep -c` → 2 |
| `import.*Lock.*from "lucide-react"` | `grep -c` → 1 |
| `aria-pressed` | `grep -c` → 2 |
| `pnpm tsc --noEmit` regression | 0 new errors |

### Task 3 (list-grid.optimistic.test.tsx)

| Criterion | Evidence |
| --- | --- |
| `import type { Visibility }` | `grep -c` → 1 |
| `visibility: "team_shared"` in fixtures | `grep -c` → 1 (makeList default; test bodies use the function default) |
| `created_by: "user-abc"` in fixtures | `grep -c` → 1 |
| `preserves visibility=personal` test title | `grep -c` → 1 |
| `preserves visibility=team_shared` test title | `grep -c` → 1 |
| `pnpm vitest run list-grid.optimistic.test.tsx` exits 0 | 19 tests pass (17 pre-existing + 2 new) |

## Final TSC Output

```
$ pnpm tsc --noEmit
src/lib/search/__tests__/execute-research.test.ts(178,12): error TS2532: Object is possibly 'undefined'.
src/lib/search/__tests__/execute-research.test.ts(178,34): error TS2493: Tuple type '[]' of length '0' has no element at index '0'.
src/lib/search/__tests__/execute-research.test.ts(180,12): error TS2532: Object is possibly 'undefined'.
src/lib/search/__tests__/execute-research.test.ts(180,36): error TS2493: Tuple type '[]' of length '0' has no element at index '0'.
src/lib/search/__tests__/execute-research.test.ts(200,24): error TS2352: Conversion of type 'undefined' to type 'ChannelParams' may be a mistake ...
src/lib/search/__tests__/execute-research.test.ts(200,46): error TS2493: Tuple type '[]' of length '0' has no element at index '0'.
```

**6 total errors, 0 in-scope errors.** Unchanged from Plan 44-02 / 44-03 baseline — documented in `deferred-items.md`.

## Final Vitest Output

```
$ pnpm vitest run src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx

 ✓ src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx (19 tests)

 Test Files  1 passed (1)
      Tests  19 passed (19)
   Duration  391ms
```

Two new tests included:
- `listsOptimisticReducer — CREATE_PENDING > preserves visibility=personal from makeTempList through CREATE_PENDING (Pitfall 5)` ✓ 0ms
- `listsOptimisticReducer — CREATE_PENDING > preserves visibility=team_shared (default) through CREATE_PENDING` ✓ 0ms

## Downstream Impact

Plan 44-05 (list-grid badges + persona-card chips + admin workspace page) can now:

- Read correctly-threaded `visibility` + `created_by` from optimistic rows — the Pitfall 5 bug is closed; badge renderers will see the right value pre-confirm
- Trust that every path (optimistic create, server create, edit update) writes the selected `visibility` into the shared state/DB — no special case for "optimistic row has wrong visibility until reconcile"

Plan 44-06 (admin workspace + reassign hook) can:

- Show creator attribution correctly — every list row carries `created_by: user.id` (or null for pre-migration legacy rows, which the 44-02 type already models)
- Verify the reassign hook via the same threading model (acting admin becomes creator → `created_by` updates → `last_refreshed_at` style mechanics)

## User Setup Required

None — all changes are client-side UI + tests. No env vars, no migrations, no dashboard config.

## Next Phase Readiness

- Wave 4 complete. Plan 44-05 (badges + admin workspace) now unblocked.
- No blockers or concerns carried forward.

## Self-Check: PASSED

**Files modified — on disk:**

- `src/app/[orgId]/lists/components/create-list-dialog.tsx` — FOUND
- `src/app/[orgId]/lists/components/lists-page-client.tsx` — FOUND
- `src/app/[orgId]/lists/page.tsx` — FOUND
- `src/app/[orgId]/personas/components/persona-form-dialog.tsx` — FOUND
- `src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx` — FOUND

**Commits verified in git log:**

- `2157e77` — FOUND (feat(44-04): add visibility segmented control to create-list-dialog + thread currentUserId)
- `66a107b` — FOUND (feat(44-04): add visibility segmented control to persona-form-dialog (create + edit))
- `cb9443a` — FOUND (test(44-04): extend list-grid.optimistic fixtures + add visibility-preservation tests)

**Success Criteria Greps (from plan prompt):**

- `grep -q "Lock" create-list-dialog.tsx` — PASS
- `grep -q "Users" create-list-dialog.tsx` — PASS
- `grep -q "visibility" persona-form-dialog.tsx` — PASS
- `grep -q "preserves visibility=personal" list-grid.optimistic.test.tsx` — PASS
- `grep -q "preserves visibility=team_shared" list-grid.optimistic.test.tsx` — PASS

**TSC in-scope:** 0 new errors. 6 pre-existing deferred errors in `execute-research.test.ts` (unchanged, from Plan 44-02 deferred-items.md).

**Vitest:** 19/19 tests pass; 2 new test cases added and green.

---
*Phase: 44-list-search-visibility*
*Plan: 04*
*Completed: 2026-04-17*
