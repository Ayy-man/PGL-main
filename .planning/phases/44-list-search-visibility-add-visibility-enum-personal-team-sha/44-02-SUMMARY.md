---
phase: 44-list-search-visibility
plan: 02
status: complete
subsystem: types+queries
tags: [typescript, supabase-client, visibility, lists, personas, query-layer, phase-44]

# Dependency graph
requires:
  - phase: 44
    plan: 01
    provides: "visibility_mode enum + visibility/created_by columns live + shared Visibility TS type"
provides:
  - "List type with visibility: Visibility + created_by: string | null"
  - "ListWithCreator interface (admin workspace join shape)"
  - "CreateListInput with optional visibility?: Visibility"
  - "Persona type with visibility: Visibility (+ created_by relaxed to string | null)"
  - "PersonaWithCreator interface (admin workspace join shape)"
  - "CreatePersonaInput + UpdatePersonaInput with optional visibility?: Visibility"
  - "createList / createPersona default input.visibility ?? 'team_shared' on insert"
  - "seedStarterPersonas explicitly inserts visibility: 'team_shared' as const"
  - "updateListVisibility + updatePersonaVisibility (RLS-gated, no JS permission check)"
  - "getAllListsWithCreators + getAllPersonasWithCreators (admin workspace fetchers)"
affects:
  - 44-03 (UI creation dialogs — import Visibility, drive segmented control from CreateListInput.visibility)
  - 44-04 (server actions — call updateList/PersonaVisibility; compile with extended types)
  - 44-05 (admin workspace page — consumes getAllListsWithCreators + getAllPersonasWithCreators)
  - 44-06 (reassign hook — uses visibility + created_by writes; types already in shape)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Explicit .select() extension: every lists column list now enumerates visibility, created_by"
    - "Supabase embedded FK join: creator:users!created_by ( id, full_name, email ) — admin workspace shape"
    - "Insert default pattern: input.visibility ?? 'team_shared' — mirrors Postgres DEFAULT clause at query layer for defensive symmetry"
    - "Starter seed belt-and-braces: visibility: 'team_shared' as const (Pitfall 7 — never rely on DB default for seed writes)"
    - "Plan 44-02 Rule 3 unblock pattern: when extending a required field on a shared type, thread default values through downstream fixture factories (makeTempList, test makers) so TSC gate stays green for later plans to wire real values"

key-files:
  created: []
  modified:
    - src/lib/lists/types.ts
    - src/lib/lists/queries.ts
    - src/lib/personas/types.ts
    - src/lib/personas/queries.ts
    - src/app/[orgId]/lists/components/create-list-dialog.tsx        # Rule 3 unblock only — 44-03 will overhaul
    - src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx  # Rule 3 unblock only — 44-03 will overhaul

key-decisions:
  - "Relaxed Persona.created_by from 'string' to 'string | null' to match Plan 44-01's DROP NOT NULL on personas.created_by (required for ON DELETE SET NULL FK cascade)"
  - "Added default visibility: 'team_shared' + created_by: null to makeTempList (create-list-dialog.tsx) and list-grid.optimistic.test.tsx fixtures as a Rule 3 unblock — Plan 44-03 will overhaul these files to thread real selected values; these placeholders keep TSC gate green in the interim"
  - "Extended 3 explicit .select() blocks in lists/queries.ts (getLists, getListById, createList); personas/queries.ts uses .select() with no column list so auto-inherits the new visibility column (per PATTERNS.md Pattern #5) — no explicit select changes needed there"
  - "getAllListsWithCreators + getAllPersonasWithCreators do NOT filter by visibility — trust RLS admin role clause to yield all rows (D-12 + CONTEXT specifics)"

patterns-established:
  - "Phase 44 insert default symmetry: input.visibility ?? 'team_shared' at query layer even though Postgres default supplies same value — intentional belt-and-braces for seed writes + defensive symmetry"
  - "Phase 44 admin-workspace fetcher shape: *WithCreator join pattern via creator:users!created_by embedded Supabase FK join — no manual user_id→email JOIN"
  - "Plan 44-02 downstream-unblock pattern: when extending required fields, add sensible defaults to fixture factories so future plans can proceed — tag the additions with 'Plan 44-0X will thread real values' so follow-up plans remember to wire"

requirements-completed: [VIS-TYPES]

# Metrics
duration: ~4min
completed: 2026-04-17
---

# Phase 44 Plan 02: Types + Query Layer Summary

**Threaded `visibility` + `created_by` through every List/Persona read/write — 2 new types, 5 extended selects, 4 new query functions, TSC clean in-scope.**

## Performance

- **Duration:** ~4 min (4 tasks, 4 commits)
- **Started:** 2026-04-17T11:51:53Z
- **Completed:** 2026-04-17T11:55:33Z
- **Tasks:** 4 (all `type="auto"`, `tdd="false"`)
- **Files modified:** 6 (4 in-scope plan targets + 2 Rule 3 unblocks)

## Accomplishments

- `List` type carries `visibility: Visibility` + `created_by: string | null`; new `ListWithCreator` extends it with creator join shape
- `Persona` type carries `visibility: Visibility`; `created_by` relaxed to `string | null` to match migration; new `PersonaWithCreator` extends it
- `CreateListInput` / `CreatePersonaInput` / `UpdatePersonaInput` all accept optional `visibility?: Visibility`
- Every `.select()` in `lists/queries.ts` now enumerates `visibility, created_by` (3 explicit blocks: `getLists`, `getListById`, `createList`; 11 total `visibility` occurrences)
- `createList` + `createPersona` insert payloads both pass `input.visibility ?? 'team_shared'` — defensive symmetry with Postgres DEFAULT
- `seedStarterPersonas` explicitly inserts `visibility: 'team_shared' as const` (Pitfall 7 — belt-and-braces even though DB default would supply same value)
- Two new update functions: `updateListVisibility(id, tenantId, visibility)` + `updatePersonaVisibility(id, tenantId, visibility)` — RLS-gated, no parallel JS check (D-09)
- Two new admin-workspace fetchers: `getAllListsWithCreators(tenantId)` + `getAllPersonasWithCreators(tenantId)` — embed `creator:users!created_by ( id, full_name, email )`, trust RLS for admin-see-all (D-12)

## Task Commits

1. **Task 1 — `8c54061`** `feat(44-02): extend List types with visibility + created_by`
   - Added `import type { Visibility } from "@/types/visibility"`
   - Added `visibility: Visibility` + `created_by: string | null` to `List`
   - Added optional `visibility?: Visibility` to `CreateListInput`
   - Added new `ListWithCreator` interface
2. **Task 2 — `30065ea`** `feat(44-02): thread visibility + created_by through lists query layer`
   - Extended 3 `.select()` blocks in `src/lib/lists/queries.ts` (lines ~34-46, ~60-68, ~99-107)
   - `createList` insert payload now threads `input.visibility ?? 'team_shared'`
   - Added `updateListVisibility` + `getAllListsWithCreators` at end of file
   - [Rule 3 unblock] Added default `visibility: "team_shared"` + `created_by: null` to `makeTempList` (`create-list-dialog.tsx`) and to `makeList`/`makePending` fixtures in `list-grid.optimistic.test.tsx`
   - Logged pre-existing `execute-research.test.ts` TSC errors to `deferred-items.md`
3. **Task 3 — `f714c5b`** `feat(44-02): extend Persona types with visibility + PersonaWithCreator`
   - Added `import type { Visibility } from "@/types/visibility"`
   - Added `visibility: Visibility` to `Persona`
   - Relaxed `created_by` to `string | null` to match 44-01 migration DROP NOT NULL
   - Added optional `visibility?: Visibility` to `CreatePersonaInput` + `UpdatePersonaInput`
   - Added new `PersonaWithCreator` interface
4. **Task 4 — `14ffdf1`** `feat(44-02): thread visibility + created_by through personas query layer`
   - `createPersona` insert payload threads `input.visibility ?? 'team_shared'`
   - `updatePersona` merges `input.visibility` when provided
   - `seedStarterPersonas` inserts `visibility: 'team_shared' as const`
   - Added `updatePersonaVisibility` + `getAllPersonasWithCreators` at end of file

## .select() Sites Modified in lists/queries.ts

All three explicit column-enumerating select blocks extended to include `visibility, created_by`:

| Line (pre-edit) | Function | Selects |
| --- | --- | --- |
| 34-44 | `getLists` | id, tenant_id, name, description, **visibility**, **created_by**, member_count, created_at, updated_at |
| 60-70 | `getListById` | id, tenant_id, name, description, **visibility**, **created_by**, member_count, created_at, updated_at |
| 99-107 (chained on createList insert) | `createList` | id, tenant_id, name, description, **visibility**, **created_by**, member_count, created_at, updated_at |

Selects on `list_members` / embedded `prospects` intentionally left alone — visibility enforcement there is via RLS EXISTS-on-parent (D-06), no column changes needed on child tables.

`personas/queries.ts` uses `.select()` with no explicit column list (auto-inherits new columns) per PATTERNS.md Pattern #5 — no select-site modifications needed.

## Defaults Confirmation

- `createList` (`src/lib/lists/queries.ts`) insert payload contains `visibility: input.visibility ?? 'team_shared'` — confirmed via grep.
- `createPersona` (`src/lib/personas/queries.ts`) insert payload contains `visibility: input.visibility ?? 'team_shared'` — confirmed via grep.
- `seedStarterPersonas` `.map(...)` return object contains `visibility: 'team_shared' as const` — confirmed via grep.

## Final TSC Output

```
$ pnpm tsc --noEmit
src/lib/search/__tests__/execute-research.test.ts(178,12): error TS2532: Object is possibly 'undefined'.
src/lib/search/__tests__/execute-research.test.ts(178,34): error TS2493: Tuple type '[]' of length '0' has no element at index '0'.
src/lib/search/__tests__/execute-research.test.ts(180,12): error TS2532: Object is possibly 'undefined'.
src/lib/search/__tests__/execute-research.test.ts(180,36): error TS2493: Tuple type '[]' of length '0' has no element at index '0'.
src/lib/search/__tests__/execute-research.test.ts(200,24): error TS2352: Conversion of type 'undefined' to type 'ChannelParams' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/lib/search/__tests__/execute-research.test.ts(200,46): error TS2493: Tuple type '[]' of length '0' has no element at index '0'.
```

**6 total errors, 0 in-scope errors.** All remaining errors live in `src/lib/search/__tests__/execute-research.test.ts` (Phase 26 test file, unrelated to Phase 44). Verified pre-existing via `git stash && pnpm tsc --noEmit` before Task 2 — errors present even with all Plan 44-02 changes stashed. Logged to `.planning/phases/44-list-search-visibility-.../deferred-items.md` per GSD scope boundary rule.

## Acceptance Criteria Evidence

| Criterion | Evidence |
| --- | --- |
| `List.visibility: Visibility + created_by: string | null` | `grep "visibility: Visibility" src/lib/lists/types.ts` + `grep "created_by: string | null"` both pass |
| `Persona.visibility: Visibility` | `grep "visibility: Visibility" src/lib/personas/types.ts` passes |
| `CreateListInput / CreatePersonaInput / UpdatePersonaInput` have optional `visibility` | 3 separate `visibility?: Visibility` grep matches across the two types files |
| Every `.select()` on `lists` includes `visibility, created_by` | Verified by inspecting 3 select blocks + createList chained select; `grep -c "visibility" src/lib/lists/queries.ts` returns 11 |
| `updateListVisibility + getAllListsWithCreators` exported | Both grep-confirmed in lists/queries.ts |
| `updatePersonaVisibility + getAllPersonasWithCreators` exported | Both grep-confirmed in personas/queries.ts |
| `seedStarterPersonas` inserts `visibility: 'team_shared' as const` | Grep-confirmed |
| `createList` / `createPersona` default to `input.visibility ?? 'team_shared'` | Both grep-confirmed |
| `pnpm tsc --noEmit` exits 0 in scope | Zero errors in `src/lib/lists/**`, `src/lib/personas/**`, `src/types/**`; 6 pre-existing errors in out-of-scope `src/lib/search/__tests__/execute-research.test.ts` documented in deferred-items.md |
| `ListWithCreator / PersonaWithCreator` exported | Both grep-confirmed with `export interface ...WithCreator extends ...` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Type Correctness] Relaxed Persona.created_by from `string` to `string | null`**
- **Found during:** Task 3
- **Issue:** Plan 44-01's migration dropped NOT NULL on `personas.created_by` to enable `ON DELETE SET NULL` FK cascade (see 44-01-SUMMARY.md decision #1). Leaving the TS type as non-nullable `string` creates a silent lie — queries returning a row with `created_by=null` (e.g., after a user deletion FK cascade) would violate the runtime shape.
- **Fix:** Changed `Persona.created_by: string` to `Persona.created_by: string | null` to match actual DB nullability.
- **Files modified:** `src/lib/personas/types.ts`
- **Commit:** `f714c5b`
- **Impact:** No callers broke — the only in-tree readers of `persona.created_by` will be added in plan 44-03 (dialog render-gate) and 44-05 (admin workspace), both of which will already handle null per the plan spec.

**2. [Rule 3 - Blocking TSC Gate] Added default visibility + created_by to pre-existing optimistic fixtures**
- **Found during:** Task 2 (tsc run)
- **Issue:** Extending `List` with two new required fields (`visibility: Visibility`, `created_by: string | null`) immediately broke 3 downstream sites that construct `List` / `OptimisticList` literals:
  - `src/app/[orgId]/lists/components/create-list-dialog.tsx:47` (`makeTempList` factory)
  - `src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx:23` (`makeList` fixture)
  - `src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx:36` (`makePending` fixture)
- **Fix:** Added explicit `visibility: "team_shared"` + `created_by: null` defaults to all three factories, tagged with inline comment noting Plan 44-03 will thread real values from the dialog's segmented control. These are Rule 3 unblocks — minimum needed to keep tsc gate green so later plans can proceed.
- **Files modified:** `src/app/[orgId]/lists/components/create-list-dialog.tsx`, `src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx`
- **Commit:** `30065ea`
- **Impact:** Plan 44-03 must remember to remove these placeholders (grep for the Rule 3 marker comment) and wire the selected `Visibility` + current user id into the factories.

**3. [Rule 2 - Deferred Scope] Logged pre-existing execute-research.test.ts TSC errors**
- **Found during:** Task 2 (first tsc run after initial edits)
- **Issue:** 6 TSC errors in `src/lib/search/__tests__/execute-research.test.ts` (Phase 26 test file). Verified pre-existing via `git stash && pnpm tsc --noEmit` — errors present even with all Plan 44-02 changes stashed.
- **Fix:** Documented in `.planning/phases/44-list-search-visibility-.../deferred-items.md` per GSD scope boundary rule. Not fixed here because (a) out of scope for Plan 44-02 (test file unrelated to visibility), (b) errors are in test-only code, (c) plan's tsc gate is scoped to `src/lib/lists/**` + `src/types/**` which are clean.
- **Files modified:** `.planning/phases/.../deferred-items.md` (added)
- **Commit:** `30065ea`
- **Impact:** None on Phase 44 progress. Recommend follow-up quick task to tighten optional-tuple access in execute-research.test.ts.

**Total deviations:** 3 auto-fixed (1 Rule 2 type correctness, 1 Rule 3 TSC unblock, 1 Rule 2 deferred log). No Rule 4 (architectural) deviations. No user decisions required.

## Issues Encountered

- **TSC cascade from new required fields (Task 2):** Adding `visibility: Visibility` as a required (non-optional) field on `List` cascaded to 3 downstream factories. Expected and pre-empted by the plan (implicit in every "add required field" type change); handled inline via Rule 3 minimum-defaults. Not a plan defect — downstream wiring lives in Plan 44-03.
- **No other issues.** All 4 tasks executed first pass per plan spec.

## Downstream Impact

Plan 44-03 (UI creation dialogs) can now:
- `import type { Visibility } from "@/types/visibility"` everywhere it needs the literal type
- Read `list.visibility` / `persona.visibility` / `list.created_by` / `persona.created_by` from query results with full type safety
- Drive `CreateListInput.visibility` and `CreatePersonaInput.visibility` from a segmented control
- Call `updateListVisibility` + `updatePersonaVisibility` from new action functions (plan 44-04)
- Use `getAllListsWithCreators` + `getAllPersonasWithCreators` in the admin workspace page (plan 44-05)

**44-03 reminder:** remove the placeholder `visibility: "team_shared"` + `created_by: null` defaults in `makeTempList` + optimistic test fixtures; thread real selected values from the segmented control + `currentUserId` prop.

## User Setup Required

None. All changes are TypeScript-only; no env vars, no migrations, no user action.

## Next Phase Readiness

- Wave 2 in progress. Plans 44-03 (UI) and 44-04 (server actions) now unblocked — both depend on the types + query functions landed here.
- No blockers or concerns carried forward.

## Self-Check: PASSED

**Files modified — on disk:**
- `src/lib/lists/types.ts` — FOUND
- `src/lib/lists/queries.ts` — FOUND
- `src/lib/personas/types.ts` — FOUND
- `src/lib/personas/queries.ts` — FOUND
- `src/app/[orgId]/lists/components/create-list-dialog.tsx` — FOUND (Rule 3 unblock)
- `src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx` — FOUND (Rule 3 unblock)
- `.planning/phases/44-list-search-visibility-add-visibility-enum-personal-team-sha/deferred-items.md` — FOUND

**Commits verified in git log:**
- `8c54061` — FOUND (feat(44-02): extend List types with visibility + created_by)
- `30065ea` — FOUND (feat(44-02): thread visibility + created_by through lists query layer)
- `f714c5b` — FOUND (feat(44-02): extend Persona types with visibility + PersonaWithCreator)
- `14ffdf1` — FOUND (feat(44-02): thread visibility + created_by through personas query layer)

**TSC in-scope:** 0 errors in `src/lib/lists/**`, `src/lib/personas/**`, `src/types/**`, `src/app/[orgId]/lists/components/**`.

---
*Phase: 44-list-search-visibility*
*Plan: 02*
*Completed: 2026-04-17*
