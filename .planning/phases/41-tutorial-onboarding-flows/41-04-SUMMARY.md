---
phase: 41-tutorial-onboarding-flows
plan: 04
subsystem: onboarding
tags: [admin-checklist, observers, pure-helper, dashboard-mount, self-healing, tdd, wave-3-coordination]
dependency_graph:
  requires:
    - src/types/onboarding.ts
    - src/app/actions/onboarding-state.ts
    - src/lib/onboarding/merge-state.ts
    - src/components/ui/card.tsx
    - src/components/ui/button.tsx
    - src/components/ui/empty-state.tsx
  provides:
    - "Progress primitive (Tailwind, no Radix)"
    - "deriveChecklist + isChecklistComplete + CHECKLIST_ITEM_KEYS pure helpers"
    - "AdminOnboardingChecklist client component"
    - "emptyStateCopy('dashboard') stub for Wave 3 coordination with Plan 41-05"
    - "4 server-side admin-checklist observers (team invite, tenant-settings, logo upload, persona create)"
  affects:
    - src/app/[orgId]/page.tsx
    - src/app/actions/team.ts
    - src/app/actions/tenant-settings.ts
    - src/app/[orgId]/personas/actions.ts
    - src/app/api/upload/logo/route.ts
    - src/app/[orgId]/personas/__tests__/actions.test.ts
tech_stack:
  added: []
  patterns:
    - "Fire-and-forget server-side observer (try/await/catch/log, never rethrow)"
    - "Self-healing derivation — flag OR observed-data fallback so stale metadata never strands a completed tenant"
    - "Dual-gate UI mount (role + incomplete) with defense-in-depth null-return inside the component"
    - "Wave 3 coordination stub — 41-04 creates the minimal `emptyStateCopy` module so the build passes; 41-05 extends"
key_files:
  created:
    - src/components/ui/progress.tsx
    - src/lib/onboarding/checklist.ts
    - src/lib/onboarding/__tests__/checklist.test.ts
    - src/components/onboarding/admin-checklist.tsx
    - src/lib/onboarding/empty-state-copy.ts
  modified:
    - src/app/[orgId]/page.tsx
    - src/app/actions/team.ts
    - src/app/actions/tenant-settings.ts
    - src/app/[orgId]/personas/actions.ts
    - src/app/api/upload/logo/route.ts
    - src/app/[orgId]/personas/__tests__/actions.test.ts
    - .planning/phases/41-tutorial-onboarding-flows/deferred-items.md
decisions:
  - "Observer for `upload_logo` wired into `/api/upload/logo/route.ts` (not the client `onUploaded` handler) — the route is the only guaranteed post-persist hook and has server auth context; the client callback is only used for preview state. Still flipped from `tenant-settings.ts` as a self-healing belt-and-braces on any subsequent save."
  - "Observer for `pick_theme` flips in `tenant-settings.ts` only when the NEW theme is non-default ('gold'). The plan also suggested flipping on oldTheme != gold but that conflates 'user has customized' with 'user is saving again' — simpler to tie to the save result."
  - "Widened the `oldTenant` select in `tenant-settings.ts` from `name, slug, theme` to include `logo_url` so the observer can flip `upload_logo` without a second query when the tenant already has a persisted logo."
  - "Component renders `null` when complete even though the parent page gates on `isChecklistComplete` — defense-in-depth against future callers that forget the gate."
  - "Dashboard no-personas empty slot swapped in `page.tsx` (replacing `PersonaPillRow` in the empty branch) rather than inside `PersonaPillRow.tsx`, to honor the plan amendment's `files_modified` list (page.tsx only, not the sub-component)."
  - "Created `src/lib/onboarding/empty-state-copy.ts` as a minimal 'dashboard'-only stub for Wave 3 coordination with Plan 41-05. The stub exports the exact signature Plan 41-05's full helper uses (EmptyStateSurface, EmptyStateCopyEntry, emptyStateCopy, EMPTY_STATE_COPY) so 41-05's executor can extend in place without a type break."
metrics:
  duration: ~20min
  tasks_completed: 3
  tests_added: 13
  completed_date: 2026-04-15
---

# Phase 41 Plan 04: Admin Onboarding Checklist Summary

Self-healing 4-item admin onboarding checklist with 4 server-side observers, shipped as a pure helper + a client card + 4 fire-and-forget wiring points, plus the absorbed dashboard EmptyState copy swap from Plan 41-05.

## What shipped

Five new files, six modified files, four commits, 13 new Vitest specs, existing 10 persona-action specs still green.

### File tree (created)

```
src/
├── components/
│   ├── ui/
│   │   └── progress.tsx                     (new — Tailwind progress bar)
│   └── onboarding/
│       └── admin-checklist.tsx              (new — client card)
└── lib/
    └── onboarding/
        ├── checklist.ts                     (new — pure helpers)
        ├── empty-state-copy.ts              (new — Wave 3 coord stub)
        └── __tests__/
            └── checklist.test.ts            (new — 13 specs)
```

### Files modified

```
src/app/[orgId]/page.tsx                       (mount + EmptyState absorb)
src/app/actions/team.ts                         (invite_team observer)
src/app/actions/tenant-settings.ts              (pick_theme + upload_logo observers)
src/app/api/upload/logo/route.ts                (upload_logo observer, first-upload path)
src/app/[orgId]/personas/actions.ts             (create_first_persona observer)
src/app/[orgId]/personas/__tests__/actions.test.ts   (mock the new import)
.planning/.../deferred-items.md                 (logged pre-existing popover.tsx error)
```

## Observer wiring — exact call sites

| Key | File | Line range | Branch |
|-----|------|-----------|--------|
| `invite_team` | `src/app/actions/team.ts` | 145–150 | After `inviteUserByEmail` + profile insert + `logActivity` + `revalidatePath`, before `return { success: true }` |
| `pick_theme` | `src/app/actions/tenant-settings.ts` | 96–113 | After `tenants.update` success + `logActivity`, flips iff `newValues.theme !== "gold"` |
| `upload_logo` (self-heal on re-save) | `src/app/actions/tenant-settings.ts` | 96–113 | Same block; flips whenever `oldTenant.logo_url` is non-null |
| `upload_logo` (first-upload path) | `src/app/api/upload/logo/route.ts` | 135–142 | After `tenants.update({ logo_url })` success, before the 200 response |
| `create_first_persona` | `src/app/[orgId]/personas/actions.ts` | 91–101 | After `createPersona(...)` resolves, before `revalidatePath` and the persona return |

All five call sites follow the same pattern:

```ts
try {
  await updateOnboardingState({ admin_checklist: { <key>: true } });
} catch (err) {
  console.error("[onboarding] <key> observer failed:", err);
}
```

The observer is idempotent — `mergeOnboardingState` (Plan 01) depth-1 merges the checklist, so calling it on every successful invocation is safe and cheap. Failures are logged, never rethrown, never surfaced to the user; the primary action's return value is unaffected.

## Self-healing derivation — why `deriveChecklist` reads tenant data

The four checklist items' `complete` flags OR together the observer flag and an observed-data fallback:

| Key | Formula |
|-----|---------|
| `invite_team` | `state.admin_checklist.invite_team === true` |
| `upload_logo` | `cl.upload_logo === true \|\| tenant.logo_url != null` |
| `pick_theme` | `cl.pick_theme === true \|\| (tenant.theme != null && tenant.theme !== "gold")` |
| `create_first_persona` | `cl.create_first_persona === true \|\| personaCount > 0` |

Rationale:

- **Pre-existing tenants.** If Maggie already uploaded her logo before this phase shipped, `app_metadata.onboarding_state.admin_checklist.upload_logo` is `false` (default). But `tenants.logo_url` is non-null — self-healing reads that and marks the item complete. No backfill migration needed.
- **Observer miss paths.** If a future code path writes `tenants.logo_url` without calling the observer (e.g., an admin-side script, a data-import job), the checklist still reflects reality because the derivation reads the ground truth.
- **Pure, testable, zero env reads.** All four rules live in a single pure function covered by 13 Vitest specs — every branch (flag-set, flag-missing-but-observed, both-false, null/undefined state, null theme).

## Dashboard mount condition

Two gates must hold for the checklist card to render:

```ts
const isTenantAdmin = role === "tenant_admin";
const showChecklist =
  isTenantAdmin &&
  !isChecklistComplete({
    state: onboardingState,
    tenant: checklistTenant,
    personaCount: personas.length,
    orgId,
  });
```

- **Role gate** — only `tenant_admin` sees the checklist. Agents, assistants, and super_admins are excluded. Super_admins don't see it because they land on a different (tenant-agnostic) dashboard flow; for the per-tenant `[orgId]` dashboard, only the tenant's own admin should be nudged through setup.
- **Completeness gate** — once all 4 items are complete, the card disappears. Per CONTEXT tilt ("reduce surface area"), there is no celebration row that lingers for 24h — once done, it is gone.

Defense-in-depth: `AdminOnboardingChecklist` itself returns `null` when `completed === items.length`, so a future caller that forgets the gate still renders nothing.

## Observer resilience pattern

Every observer call is a fire-and-forget `try { await ... } catch { console.error }`. Design constraints driving this:

1. **Never block the primary action.** Inviting a teammate must succeed even if the onboarding-state write fails (e.g., Supabase admin quota, transient network). The user already sees "invitation sent" — the checklist can stay stale for one render cycle and heal on the next save or via the self-healing derivation.
2. **Log, don't swallow silently.** `console.error` with a tagged prefix (`[onboarding] <key> observer failed:`) so the error surfaces in Vercel runtime logs and the Supabase `error_log` pipeline (see memory note) if it ever repeatedly fires.
3. **Idempotent writes.** The server action's `mergeOnboardingState` is a pure reducer — calling it twice with the same partial is a no-op on the second call. This means we never need to check "has this already been flipped?" before firing; the observer is cheap and safe on every success.

## Wave 3 coordination with Plan 41-05 — `empty-state-copy.ts`

Plan 04 and Plan 05 both execute in Wave 3 and both needed to modify `src/app/[orgId]/page.tsx`. Rather than serialize the two plans, the 41-05 planning pass handed file ownership of `page.tsx` to Plan 04 and listed "dashboard EmptyState copy swap uses `emptyStateCopy('dashboard')`" in Plan 04's must-haves truths. To make that import resolve at build time, Plan 04 creates a **minimal stub** of `src/lib/onboarding/empty-state-copy.ts` exporting:

- `EmptyStateSurface` type (all 4 future keys in the union)
- `EmptyStateCopyEntry` interface (title/body/ctaLabel/ctaHref(orgId))
- `emptyStateCopy(surface)` returning the concrete dashboard entry or a safe fallback
- `EMPTY_STATE_COPY` map keyed by surface (only `"dashboard"` populated in 41-04)

Plan 41-05's executor can now extend the map in place by adding the `lists`, `personas`, and `activity` keys + tightening `EMPTY_STATE_COPY` from `Partial<Record<…>>` to `Record<…>` — no breaking API change needed. The fallback in 41-04's stub ensures `emptyStateCopy("not-a-real-surface")` returns a sane object until 41-05 lands.

**Dashboard copy (shipped in 41-04):**

| Field | Value |
|-------|-------|
| `title` | "Welcome — create your first saved search" |
| `body` | "Start with a saved search — describe who you want to reach in plain English, then enrich for contacts and wealth signals." |
| `ctaLabel` | "New saved search" |
| `ctaHref(orgId)` | `/${orgId}/personas` |

Plan 41-05 may rewrite any of the above when it extends the module; 41-04's implementation only guarantees the signature.

## Verification — all green

- `npx vitest run src/lib/onboarding/__tests__/checklist.test.ts` → **13 passed** (4 self-healing branches, 2 null/undefined state branches, orgId substitution, label non-empty, `isChecklistComplete` true/false, 3-of-4 partial).
- `npx vitest run src/app/\[orgId\]/personas/__tests__/actions.test.ts` → **10 passed** (the pre-existing suite, with the new `updateOnboardingState` mock preventing `next/headers` import in node env).
- `npx vitest run src/lib/onboarding/` → **58 passed** across 4 files (checklist + merge-state + tour-navigation + video-url).
- `npx tsc --noEmit` → clean modulo two pre-existing errors tracked in `deferred-items.md`:
  1. `src/components/ui/popover.tsx:4:35` — missing `@radix-ui/react-popover` dep (confirmed pre-existing by stashing against base `61fe0b4`).
  2. `src/lib/search/__tests__/execute-research.test.ts:178,180,200` — tuple-access issues logged by Plan 41-01.
- Plan verification gates:
  - `rg 'updateOnboardingState' src/app/actions/team.ts src/app/actions/tenant-settings.ts src/app/\[orgId\]/personas/actions.ts | wc -l` → **6** (import + call per file; plan wants ≥ 3).
  - `rg 'AdminOnboardingChecklist' src/app/\[orgId\]/page.tsx | wc -l` → **2** (import + mount; plan wants ≥ 1).

## Deviations from plan

### Auto-added (Rule 2 — missing critical functionality)

**1. [Rule 2 - Additional observer] Wired `upload_logo` into `/api/upload/logo/route.ts` as well as `tenant-settings.ts`**

- **Found during:** Task 2 recon for the logo-upload write path.
- **Issue:** `updateTenantSettings` does not own `tenants.logo_url` — the logo URL is persisted by the API route at `src/app/api/upload/logo/route.ts`, which is the only guaranteed post-persist hook for the first-upload path. If we only wired the observer into `tenant-settings.ts`, a user who uploads a logo but never touches the name/slug form never flips `upload_logo`, and the checklist permanently lies (until self-healing kicks in via `tenant.logo_url` read in the next render).
- **Fix:** Added the observer directly into the route at the point where `tenants.update({ logo_url })` succeeds. Kept the observer in `tenant-settings.ts` too as a belt-and-braces self-heal for the re-save path. Both calls are idempotent so the double-fire is harmless.
- **Files modified:** `src/app/api/upload/logo/route.ts` (line 4 import, lines 135–142 observer).
- **Commit:** `f48711a`.

**2. [Rule 2 - Widened select] Added `logo_url` to the `oldTenant` select in `tenant-settings.ts`**

- **Found during:** Task 2 implementation.
- **Issue:** The existing select was `name, slug, theme`. The observer needs `logo_url` to decide whether to flip `upload_logo`. Without this, the observer would need a second query (cost + race condition) to read logo_url.
- **Fix:** Added `logo_url` to the select column list. No schema change, no new query.
- **Files modified:** `src/app/actions/tenant-settings.ts` (line 54–58).
- **Commit:** `f48711a`.

### Test scaffold change (not a deviation — prescribed by the plan)

- Added `vi.mock("@/app/actions/onboarding-state", () => ({ updateOnboardingState: vi.fn().mockResolvedValue({ ok: true }) }))` to `src/app/[orgId]/personas/__tests__/actions.test.ts`. Without it the test file would import the `"use server"` module, which drags in `next/headers` and crashes under Vitest's `environment: 'node'`. This mock was explicitly called for in Task 2's `<action>` block.

### No user permission needed, no Rule 4 architectural changes

No new abstractions, no new tables, no new env vars, no new dependencies. The entire plan rides on primitives that already existed (`Card`, `Button`, `EmptyState`, `lucide-react` icons) plus a hand-rolled Tailwind `Progress` (per plan — no Radix).

## Deferred issues

- `src/components/ui/popover.tsx:4:35` — missing `@radix-ui/react-popover`. Pre-existing on base commit `61fe0b4` (confirmed by stashing Plan 04's diff and re-running tsc). Out of scope. Tracked in `deferred-items.md` under `## Plan 41-04`.
- `src/lib/search/__tests__/execute-research.test.ts` — tracked by Plan 41-01.

## Commits

| # | Hash      | Message                                                                                  |
|---|-----------|------------------------------------------------------------------------------------------|
| 1 | `d7889f5` | test(41-04): add failing tests for deriveChecklist pure helper                           |
| 2 | `c1040d3` | feat(41-04): ship Progress primitive + pure deriveChecklist helper                       |
| 3 | `f48711a` | feat(41-04): wire 4 admin-checklist observers into server action paths                   |
| 4 | `7b3047f` | docs(41-04): log pre-existing popover.tsx missing-dep tsc error                          |
| 5 | `7431aa0` | feat(41-04): AdminOnboardingChecklist + dashboard mount + EmptyState absorb              |

## TDD gate compliance

Gate sequence honored on Task 1 (the only task with a new test file):

1. **RED** — `d7889f5` — test file added, imports fail with `ERR_MODULE_NOT_FOUND` because `../checklist` does not yet exist.
2. **GREEN** — `c1040d3` — `checklist.ts` + `progress.tsx` land; all 13 specs pass.
3. **REFACTOR** — skipped; no code smell emerged.

Tasks 2 and 3 are observer/UI wiring with no new test files per the locked phase test strategy ("Pure helpers only. No RTL."). Their correctness is enforced by (a) a `tsc --noEmit` pass, (b) the plan verification grep (observer call sites ≥ 3, mount ≥ 1), and (c) the fact that the existing 10 persona-action tests still pass against the updated code.

## Self-Check

- [x] FOUND: `src/components/ui/progress.tsx`
- [x] FOUND: `src/lib/onboarding/checklist.ts`
- [x] FOUND: `src/lib/onboarding/__tests__/checklist.test.ts`
- [x] FOUND: `src/components/onboarding/admin-checklist.tsx`
- [x] FOUND: `src/lib/onboarding/empty-state-copy.ts` (Wave 3 stub)
- [x] FOUND commit `d7889f5`
- [x] FOUND commit `c1040d3`
- [x] FOUND commit `f48711a`
- [x] FOUND commit `7b3047f`
- [x] FOUND commit `7431aa0`

## Self-Check: PASSED
