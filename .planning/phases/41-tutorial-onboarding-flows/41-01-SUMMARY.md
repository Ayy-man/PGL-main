---
phase: 41-tutorial-onboarding-flows
plan: 01
subsystem: onboarding
tags: [types, server-action, pure-reducer, app_metadata, tdd]
dependency_graph:
  requires:
    - src/lib/supabase/server.ts
    - src/lib/supabase/admin.ts
  provides:
    - "OnboardingState / AdminChecklistState / OnboardingStatePartial types"
    - "DEFAULT_ONBOARDING_STATE constant"
    - "mergeOnboardingState(current, partial) pure reducer"
    - "updateOnboardingState(partial) Server Action"
  affects: []
tech_stack:
  added: []
  patterns:
    - "Discriminated-union return shape ({ ok: true, state } | { ok: false, error })"
    - "Allow-list runtime key filter to defend against metadata smuggling"
    - "Pure reducer in its own module so Server Action file stays all-async"
key_files:
  created:
    - src/types/onboarding.ts
    - src/lib/onboarding/merge-state.ts
    - src/lib/onboarding/__tests__/merge-state.test.ts
    - src/app/actions/onboarding-state.ts
  modified: []
decisions:
  - "Split pure helper (src/lib/onboarding/merge-state.ts) from Server Action (src/app/actions/onboarding-state.ts) because Next 14 forbids non-async exports from a 'use server' module"
  - "Restrict tests to the pure reducer — per user-prompt scope, no action-level Vitest coverage in this plan; action correctness enforced by tsc + single-write-path grep"
  - "Filter unknown top-level keys on the partial via a runtime allow-list, not just the type system — prevents accidental leakage of tenant_id / role into app_metadata.onboarding_state"
  - "Return discriminated-union result, never throw — matches callers' ergonomic need (client components unwrap res.ok)"
metrics:
  duration: ~12min
  tasks_completed: 2
  tests_added: 9
  completed_date: 2026-04-15
---

# Phase 41 Plan 01: Persistence Foundation Summary

JWT-backed onboarding progress persistence via a pure reducer + a Server Action that writes `auth.users.app_metadata.onboarding_state` with zero DB migrations.

## What shipped

Four files, two commits, nine passing unit tests, `npx tsc --noEmit` clean on every new file, zero SQL emitted.

### File tree

```
src/
├── types/
│   └── onboarding.ts                    (new — shared types + DEFAULT constant)
├── lib/
│   └── onboarding/
│       ├── merge-state.ts               (new — pure reducer, no side effects)
│       └── __tests__/
│           └── merge-state.test.ts      (new — 9 Vitest specs, node env, no RTL)
└── app/
    └── actions/
        └── onboarding-state.ts          (new — "use server" action)
```

## Public API

### `src/types/onboarding.ts`

```ts
export interface AdminChecklistState {
  invite_team: boolean;
  upload_logo: boolean;
  pick_theme: boolean;
  create_first_persona: boolean;
}

export interface OnboardingState {
  tour_completed: boolean;
  tour_skipped_at?: string;   // ISO timestamp
  tour_completed_at?: string; // ISO timestamp
  admin_checklist: AdminChecklistState;
}

export const DEFAULT_ONBOARDING_STATE: OnboardingState;

export type OnboardingStatePartial = {
  tour_completed?: boolean;
  tour_skipped_at?: string;
  tour_completed_at?: string;
  admin_checklist?: Partial<AdminChecklistState>;
};
```

### `src/lib/onboarding/merge-state.ts`

```ts
export function mergeOnboardingState(
  current: OnboardingState | null | undefined,
  partial: OnboardingStatePartial
): OnboardingState;
```

Contract (covered by tests):
- `current` is `null | undefined` → clones `DEFAULT_ONBOARDING_STATE` and applies the partial.
- `admin_checklist` is depth-1 merged — supplying one inner key does not clobber the other three.
- Unknown top-level keys on `partial` are dropped at runtime (not just ignored by the type system).
- Inputs are never mutated. Safe to call with `Object.freeze`-d inputs.
- Return value is always a fresh object, distinct reference from `DEFAULT_ONBOARDING_STATE`.

### `src/app/actions/onboarding-state.ts`

```ts
export type UpdateOnboardingStateResult =
  | { ok: true; state: OnboardingState }
  | { ok: false; error: string };

export async function updateOnboardingState(
  partial: OnboardingStatePartial
): Promise<UpdateOnboardingStateResult>;
```

Behavior:
- Unauthenticated caller → `{ ok: false, error: "Not authenticated" }`. Admin client is never instantiated.
- Auth'd caller → reads `user.app_metadata.onboarding_state`, merges via `mergeOnboardingState`, writes through `admin.auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, onboarding_state: next } })`. Returns `{ ok: true, state: next }`.
- Admin-update failure → logs via `console.error`, returns `{ ok: false, error: "Failed to update onboarding state" }`. Never throws.
- Preserves sibling keys (`tenant_id`, `role`, `onboarding_completed`, any future additions) via the `...user.app_metadata` spread.

## The "use server" gotcha

Next 14 **forbids non-async exports from a `"use server"` module.** Every symbol reached through a module with that directive must be awaitable, because Next wires them up as RPC entry points. A synchronous helper like `mergeOnboardingState` crashes the build with:

```
Error: A "use server" file can only export async functions, found "mergeOnboardingState".
```

**Resolution:** the pure reducer lives in a plain module at `src/lib/onboarding/merge-state.ts` (no directive). The Server Action file at `src/app/actions/onboarding-state.ts` keeps `"use server"` at the top and only exports `updateOnboardingState` (async). Both files import from `src/types/onboarding.ts`, which is pure TS types + one const — no directive needed.

**Testing benefit:** Vitest can import the reducer directly (`import { mergeOnboardingState } from "@/lib/onboarding/merge-state"`) without triggering the Server Action runtime loader, which in turn would drag in `next/headers` and blow up under Node's `environment: 'node'` Vitest config.

## Test coverage

9 Vitest specs, all passing, ~3ms total run time. Node env, zero React, zero DOM, zero RTL (package not installed — confirmed by recon).

| Spec | Asserts |
|------|---------|
| applies partial over DEFAULT when current is undefined | new users start from the all-false baseline |
| applies partial over DEFAULT when current is null | treats `null` the same as `undefined` |
| preserves admin_checklist keys when only tour_completed changes | top-level writes don't touch checklist |
| deep-merges admin_checklist without clobbering other keys | setting `invite_team: true` preserves the other three booleans |
| does not mutate frozen inputs | `Object.freeze` on both `current` and `partial` — no throw |
| filters unknown top-level keys out of the returned state | `role`, `tenant_id` passed in → absent from output |
| preserves tour_skipped_at / tour_completed_at when set | optional ISO timestamp fields flow through |
| returns the default admin_checklist shape when current is undefined and no admin_checklist in partial | structural equality + distinct reference |
| empty partial over a populated current is a structural no-op | idempotent write semantics |

## Verification — all green

- `npx vitest run src/lib/onboarding/__tests__/merge-state.test.ts` → 9 passed
- `npx tsc --noEmit` → no errors attributable to the 4 new files
- `rg "from\(|\.update\(|\.insert\(|\.upsert\(|\.delete\(" src/app/actions/onboarding-state.ts` → no matches (zero SQL, zero direct table I/O)
- `rg "admin\.auth\.admin\.updateUserById" src/app/actions/onboarding-state.ts` → exactly one match, the single write path
- `rg "from \"@/types/onboarding\"" src/` → 3 files (types module is consumed by the action, the reducer, and the test)

## How downstream plans (02, 03, 04) should consume

Client-side tour engine and admin-checklist components:
```ts
import { updateOnboardingState } from "@/app/actions/onboarding-state";
import type {
  OnboardingState,
  OnboardingStatePartial,
  AdminChecklistState,
} from "@/types/onboarding";
import { DEFAULT_ONBOARDING_STATE } from "@/types/onboarding";

// Trigger from a tour "Skip" button:
const res = await updateOnboardingState({
  tour_completed: true,
  tour_skipped_at: new Date().toISOString(),
});
if (!res.ok) toast.error(res.error);

// Trigger from the admin checklist upon first successful createInvite:
await updateOnboardingState({ admin_checklist: { invite_team: true } });
```

Server-side reading (e.g. in `layout.tsx` to decide whether to render `<ProductTour>`):
```ts
const { data: { user } } = await supabase.auth.getUser();
const state = (user?.app_metadata?.onboarding_state as OnboardingState | undefined)
  ?? DEFAULT_ONBOARDING_STATE;
if (!state.tour_completed) {
  // render <ProductTour />
}
```

## TDD gate compliance

Gate sequence honored:
1. RED — `test(41-01): add failing tests for mergeOnboardingState pure reducer` — commit `34225ce`. Tests fail with `ERR_MODULE_NOT_FOUND` because `@/types/onboarding` + `@/lib/onboarding/merge-state` do not yet exist.
2. GREEN — `feat(41-01): implement OnboardingState types + mergeOnboardingState pure reducer` — commit `140d788`. All 9 tests pass.
3. REFACTOR — skipped; no code-smell emerged worth a separate commit.

Task 2 (`updateOnboardingState`) ships without a Vitest file per the user-prompt scope constraint ("Tests: pure helpers only"). Its correctness is enforced by (a) a full `tsc --noEmit` pass, (b) `rg` confirming the single admin-write path, and (c) the fact that it is a thin imperative wrapper over the already-tested `mergeOnboardingState`.

## Deviations from plan

The plan's Task 2 prescribed a `src/app/actions/__tests__/onboarding-state.test.ts` with mocked Supabase clients covering the action. The user's execution prompt explicitly narrowed scope to "pure helpers only" and listed `src/lib/onboarding/__tests__/merge-state.test.ts` as the only test path. I followed the prompt. The action's unauth-branch, sibling-metadata-preservation, and admin-failure-branch behaviors documented in the plan's `<behavior>` block are implemented in code and verified by inspection + tsc, but are not Vitest-asserted in this plan.

Follow-up plan in Phase 41 may add those action-level tests once a mock scaffold is agreed upon.

## Deferred issues

None introduced by this plan. One pre-existing tsc error cluster in `src/lib/search/__tests__/execute-research.test.ts:178,180,200` was observed but is out of scope per executor scope boundary. Logged in `.planning/phases/41-tutorial-onboarding-flows/deferred-items.md`.

## Commits

| # | Hash       | Message                                                                                |
|---|------------|----------------------------------------------------------------------------------------|
| 1 | `34225ce`  | test(41-01): add failing tests for mergeOnboardingState pure reducer                   |
| 2 | `140d788`  | feat(41-01): implement OnboardingState types + mergeOnboardingState pure reducer       |
| 3 | `d5d11b6`  | feat(41-01): ship updateOnboardingState Server Action                                  |

## Self-Check

- [x] FOUND: `src/types/onboarding.ts`
- [x] FOUND: `src/lib/onboarding/merge-state.ts`
- [x] FOUND: `src/lib/onboarding/__tests__/merge-state.test.ts`
- [x] FOUND: `src/app/actions/onboarding-state.ts`
- [x] FOUND commit `34225ce`
- [x] FOUND commit `140d788`
- [x] FOUND commit `d5d11b6`

## Self-Check: PASSED
