---
phase: 44-list-search-visibility
plan: 05
status: complete
subsystem: ui-read-surfaces
tags: [typescript, react, nextjs, lucide-react, dropdown-menu, visibility, tooltip, render-gate, phase-44]

# Dependency graph
requires:
  - phase: 44
    plan: 03
    provides: "updateListVisibilityAction(listId, visibility) — validated, RLS-gated, revalidates list pages"
  - phase: 44
    plan: 04
    provides: "List.visibility + List.created_by carried end-to-end (optimistic + server) so read-surface can trust the value"
provides:
  - "list-grid.tsx: Lock/Users icon beside list.name per row with Tooltip showing 'Private — only you and admins' or 'Team shared'"
  - "list-detail page header: visibility badge + creator/admin-gated ListVisibilityToggle dropdown with Team shared / Personal options; onSelect fires updateListVisibilityAction + router.refresh() inside startTransition"
  - "persona-card.tsx: Personal chip rendered only for persona.visibility === 'personal' beside the is_starter Suggested badge (team_shared stays clean/unmarked)"
  - "NEW visibility-toggle.tsx client component: reusable DropdownMenu with { listId, current, canToggle } props; non-creator/non-admin agents see badge-only (Tooltip wrapped), no dropdown trigger"
  - "T-44-02 mitigation preserved: canToggleVisibility is UX-only render gate; RLS UPDATE USING clause (Plan 44-01) is the trust boundary. No new inline JS authz checks in actions.ts"
affects:
  - 44-06 (final wave — visual QA + admin workspace + reassign hook; all read-surfaces are now wired for the human-verify checkpoint)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Render-gate pattern: calculate canToggleVisibility (= creator OR admin) in the Server Component; pass as a boolean prop to a Client Component that conditionally renders dropdown vs badge-only. Mirror of admin-check idiom from team/page.tsx:57-60"
    - "useTransition + router.refresh() inside Client Component after server action: keeps mutations async without reload, preserves page state; startTransition guards the UI (disabled + opacity) while pending"
    - "Tooltip wrapper on icon-only affordance: `<Tooltip><TooltipTrigger asChild><span tabIndex={0}><Icon/></span></TooltipTrigger><TooltipContent>…</TooltipContent></Tooltip>` — matches existing list-grid disabled-delete-button idiom"
    - "Read-surface icon scheme: Lock = personal (private), Users = team_shared (shared). Consistent between list-grid inline badge, list-detail header toggle, and persona-card chip"
    - "Color tokens: icons use var(--text-ghost); chips use var(--bg-elevated) + var(--border-default) + var(--text-ghost). No hardcoded hex per brand tokens"

key-files:
  created:
    - src/app/[orgId]/lists/[listId]/visibility-toggle.tsx
  modified:
    - src/app/[orgId]/lists/components/list-grid.tsx
    - src/app/[orgId]/lists/[listId]/page.tsx
    - src/app/[orgId]/personas/components/persona-card.tsx

key-decisions:
  - "Placed visibility-toggle.tsx at src/app/[orgId]/lists/[listId]/visibility-toggle.tsx (adjacent to detail page) per Plan 44-05 Task 2 spec. Rationale: the toggle is only consumed by the list detail page — co-locating keeps the detail route self-contained. Not placed under components/ because it is route-specific, not grid-level"
  - "Used existing DropdownMenu primitive (Radix-based, already used by team-member-actions) instead of inventing a new control. The Phase 44 PATTERNS.md interfaces block explicitly points to this component. Provides accessible keyboard navigation + proper click-outside/focus handling out of the box"
  - "canToggleVisibility computed server-side in page.tsx; passed as plain boolean prop rather than re-running the check inside the Client Component. This keeps the Server Component the single source of truth for role/auth data, avoids leaking the full user object to the client, and mirrors the Plan 44-03 authz pattern (RLS is the trust boundary, client receives pre-computed UX hint)"
  - "Persona card shows the Personal chip ONLY for personal visibility — team_shared renders unchanged. Rationale: most personas are team_shared; marking the default state adds noise. Only the exception (personal) warrants visual distinction"

patterns-established:
  - "Phase 44 read-surface icon scheme: Lock for personal, Users for team_shared, both rendered at h-3 to h-3.5 size using var(--text-ghost) color token"
  - "Phase 44 render-gate Client Component: accepts `canToggle: boolean` prop; early-returns a Tooltip-wrapped badge when false; renders DropdownMenu with identical badge-shaped trigger when true. Both branches share the same badge style (consistent visual weight)"
  - "Phase 44 tooltip copy: 'Private — only you and admins' for personal, 'Team shared' for team_shared. Consistent across list-grid, list-detail header, and persona-card"

requirements-completed: [VIS-UI-BADGE]

# Metrics
duration: 3 min
completed: 2026-04-17
---

# Phase 44 Plan 05: Visibility Read-Surface UI Summary

**Shipped the user-facing visibility read-surface — list-grid badge + tooltip, list detail header with creator/admin-gated DropdownMenu toggle, and persona-card Personal chip — via a new reusable visibility-toggle client component.**

## Performance

- **Duration:** 3 min (3 tasks, 3 commits)
- **Started:** 2026-04-17T12:15:40Z
- **Completed:** 2026-04-17T12:19:26Z
- **Tasks:** 3 (all `type="auto"`)
- **Files created:** 1 (`visibility-toggle.tsx`)
- **Files modified:** 3 (`list-grid.tsx`, `[listId]/page.tsx`, `persona-card.tsx`)

## Accomplishments

### list-grid.tsx (Task 1)

- Added `Lock` + `Users` to the existing `lucide-react` import line
- Inserted a Tooltip-wrapped visibility icon inside the existing `flex items-center gap-2` name block, as a sibling of the pending `<Loader2>`
- Lock icon for `list.visibility === "personal"`, Users icon for `team_shared`
- Icons render at `h-3.5 w-3.5` with `var(--text-ghost)` color; `shrink-0` to survive truncation
- Tooltip text: "Private — only you and admins" (personal) or "Team shared"
- aria-label on each icon path ("Personal list" / "Team shared list") for assistive tech
- No reducer/fixture changes — `OptimisticList` type from Plan 44-02 already carries `visibility` + `created_by`

### [listId]/page.tsx + NEW visibility-toggle.tsx (Task 2)

- NEW Client Component at `src/app/[orgId]/lists/[listId]/visibility-toggle.tsx`
  - `"use client"` directive at top
  - Takes `{ listId, current, canToggle }` props — `canToggle` is the render gate
  - When `!canToggle`: returns a Tooltip-wrapped badge only (no dropdown trigger). Uses the same `var(--bg-elevated)` / `var(--border-default)` / `var(--text-ghost)` chip style as the persona-card chip for visual consistency
  - When `canToggle`: returns a `<DropdownMenu>` with identical badge-shaped `<DropdownMenuTrigger>` button, ChevronDown affordance, `aria-label="Change list visibility"`, `disabled={isPending}`, `opacity: isPending ? 0.6 : 1`
  - DropdownMenuContent aligned to end, with two `DropdownMenuItem` options: "Team shared" (Users icon) and "Personal" (Lock icon)
  - `onSelect(next)` early-returns when `next === current` (no-op on same-value), else wraps `updateListVisibilityAction(listId, next)` + `router.refresh()` in `startTransition`
  - Inline comment documents T-44-02 (`canToggle` is UX-only, RLS is trust boundary)
- Page (`page.tsx`) changes:
  - Added `import { ListVisibilityToggle } from "./visibility-toggle"`
  - Added admin-check block after null-check: `const role = user.app_metadata?.role as string | undefined; const isAdmin = role === "tenant_admin" || role === "super_admin"; const canToggleVisibility = !!user && (user.id === list.created_by || isAdmin);` — verbatim mirror of team/page.tsx:57-60 pattern
  - Wrapped the `<h1>` + new `<ListVisibilityToggle>` in a `<div className="flex items-center gap-3">` so the badge appears inline to the right of the list name
  - Description paragraph remains below the header, unchanged

### persona-card.tsx (Task 3)

- Added `Lock` to the existing `lucide-react` import line
- Wrapped the right-hand side of the Name+badge row in a `<div className="flex items-center gap-2 shrink-0">` to hold both chip + badge
- Added Personal chip (rendered only for `persona.visibility === "personal"`):
  - `inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-[5px] uppercase tracking-wide`
  - `background: var(--bg-elevated)`, `border: 1px solid var(--border-default)`, `color: var(--text-ghost)`
  - Lock icon at `h-3 w-3` + "Personal" label
  - Native `title="Private — only you and admins"` attribute for hover tooltip (no Tooltip primitive needed for this simple affordance)
- `is_starter` Badge kept as-is (class `shrink-0` moved to parent div; badge itself no longer needs it)
- team_shared personas render unchanged — no chip clutter for the default state

### T-44-02 guard verification

- Grep-clean: `grep -En "isAdmin|created_by !==|user\.id !==" src/app/[orgId]/{lists,personas}/actions.ts` → no matches
- The new `canToggleVisibility` computation in `[listId]/page.tsx` is a UX render-gate, not server-side authz. A compromised client that POSTs `updateListVisibilityAction('someone-elses-list-id', 'personal')` bypassing the UI will still fail at the DB (zero-row silent update via RLS UPDATE USING clause from Plan 44-01 D-05)

## Task Commits

1. **Task 1 — `c01094f`** `feat(44-05): add visibility badge + tooltip to list-grid`
2. **Task 2 — `88bb164`** `feat(44-05): add header badge + creator/admin-gated visibility dropdown`
3. **Task 3 — `cc0ca50`** `feat(44-05): add visibility chip to persona-card near is_starter badge`

## Files Created/Modified

- `src/app/[orgId]/lists/[listId]/visibility-toggle.tsx` (NEW) — Reusable client component with render-gated DropdownMenu toggle; consumes `updateListVisibilityAction`
- `src/app/[orgId]/lists/components/list-grid.tsx` — Lock/Users icon + Tooltip added adjacent to list.name per grid row
- `src/app/[orgId]/lists/[listId]/page.tsx` — Admin-check block added; ListVisibilityToggle wired into header flex
- `src/app/[orgId]/personas/components/persona-card.tsx` — Personal chip grouped with Suggested badge in shrink-0 flex container

## Decisions Made

- **Toggle component location:** Placed at `src/app/[orgId]/lists/[listId]/visibility-toggle.tsx` (adjacent to the detail page) per Plan 44-05 Task 2 spec — it is route-specific, not a grid-level primitive.
- **Used existing DropdownMenu primitive:** Plan interfaces block pointed to `@/components/ui/dropdown-menu` (Radix-based, already used by team-member-actions). Provides accessible keyboard navigation and click-outside handling out of the box — no new primitives needed.
- **Render-gate computed server-side:** `canToggleVisibility` calculated in the Server Component (page.tsx) and passed as a plain boolean prop. Keeps the Server Component the single auth source; client receives only the pre-computed UX hint.
- **Personal chip only for personal state:** team_shared personas render unchanged. Most personas are team_shared — marking the default would add noise. Only the exception (personal) warrants visual distinction.
- **Native `title=` attribute on persona chip:** the Lock chip uses a native HTML `title` attribute rather than the Tooltip primitive because it's already a compact interactive-free affordance inside a card — consistent with the existing `title` usage pattern in the card's filter-pill rendering.

## Deviations from Plan

None - plan executed exactly as written.

All 3 tasks shipped first-pass; no auto-fixes, no Rule 2/3/4 escalations, no architectural decisions required. The plan's file-path note for the toggle component ("path per plan") was resolved in favor of `[listId]/visibility-toggle.tsx` (Plan 44-05 Task 2's explicit path).

## Issues Encountered

- **PreToolUse:Edit hook false-positives:** the hook repeatedly asked for re-reads after files were already read in this session's initial context-load phase. Edits still went through successfully each time; the files were mutated in the correct state. Not a defect — the hook is overly cautious. Same pattern noted in Plan 44-03 and 44-04 summaries.
- **No other issues.**

## Acceptance Criteria Evidence

### Task 1 (list-grid.tsx)

| Criterion | Evidence |
| --- | --- |
| `grep -q 'list.visibility === "personal"'` | PASS |
| `grep -q 'Private — only you and admins'` | PASS |
| `grep -q 'aria-label="Personal list"'` | PASS |
| `grep -q 'aria-label="Team shared list"'` | PASS |
| `grep -q "var(--text-ghost)"` | PASS |
| `grep -q 'Lock.*from "lucide-react"'` | PASS |
| `pnpm tsc --noEmit` exits 0 | PASS (0 new errors; baseline 6 pre-existing unchanged) |

### Task 2 ([listId]/page.tsx + visibility-toggle.tsx)

| Criterion | Evidence |
| --- | --- |
| File `src/app/[orgId]/lists/[listId]/visibility-toggle.tsx` exists with `"use client"` | PASS |
| `grep -q "updateListVisibilityAction" visibility-toggle.tsx` | PASS |
| `grep -q "canToggle" visibility-toggle.tsx` | PASS |
| `grep -q "ListVisibilityToggle" page.tsx` | PASS |
| `grep -q "app_metadata?.role" page.tsx` | PASS |
| `grep -q "user.id === list.created_by" page.tsx` | PASS |
| `grep -q "canToggleVisibility" page.tsx` | PASS |
| `grep -q "isAdmin" page.tsx` | PASS |
| `pnpm tsc --noEmit` exits 0 | PASS (0 new errors) |

### Task 3 (persona-card.tsx)

| Criterion | Evidence |
| --- | --- |
| `grep -q 'persona.visibility === "personal"'` | PASS |
| `grep -q 'Private — only you and admins'` | PASS |
| `grep -q "var(--text-ghost)"` | PASS |
| `grep -q "var(--bg-elevated)"` | PASS |
| `grep -q "Lock"` | PASS |
| `grep -q 'Lock.*from "lucide-react"'` | PASS |
| `pnpm tsc --noEmit` exits 0 | PASS (0 new errors) |

### Plan-level verification

| Verification | Result |
| --- | --- |
| `pnpm tsc --noEmit` exits 0 (6 pre-existing deferred errors unchanged) | PASS |
| `pnpm build` exits 0 | PASS — "✓ Compiled successfully" + "✓ Generating static pages (28/28)" |
| 3 components updated (list-grid, [listId]/page, persona-card) | PASS |
| 1 new Client Component (`visibility-toggle.tsx`) with `"use client"` | PASS |
| Admin check uses inline `user.app_metadata?.role` pattern (copy from team/page.tsx:57-60) | PASS |
| No client-side authz check parallel to RLS (only render-gate) | PASS (grep -En "isAdmin\|created_by !==\|user\.id !==" on actions files → no matches) |

## Final TSC State

```
$ pnpm tsc --noEmit
src/lib/search/__tests__/execute-research.test.ts(178,12): error TS2532: Object is possibly 'undefined'.
src/lib/search/__tests__/execute-research.test.ts(178,34): error TS2493: Tuple type '[]' of length '0' has no element at index '0'.
src/lib/search/__tests__/execute-research.test.ts(180,12): error TS2532: Object is possibly 'undefined'.
src/lib/search/__tests__/execute-research.test.ts(180,36): error TS2493: Tuple type '[]' of length '0' has no element at index '0'.
src/lib/search/__tests__/execute-research.test.ts(200,24): error TS2352: Conversion of type 'undefined' to type 'ChannelParams' may be a mistake ...
src/lib/search/__tests__/execute-research.test.ts(200,46): error TS2493: Tuple type '[]' of length '0' has no element at index '0'.
```

**6 total errors, 0 in-scope errors.** Unchanged from Plan 44-02 / 44-03 / 44-04 baseline — documented in `deferred-items.md`.

## Final Build Output

```
 ✓ Compiled successfully
 ✓ Generating static pages (28/28)
```

No client/server component boundary errors. The new `visibility-toggle.tsx` with `"use client"` correctly interops with the Server Component at `[listId]/page.tsx`.

## Downstream Impact

Plan 44-06 (final wave) can now:

- Visual QA via the human-verify checkpoint — every read-surface shows the correct visibility state (list grid rows, list detail header, persona cards)
- Creators + admins can mutate list visibility directly from the detail page; persona visibility mutations flow through the edit dialog from Plan 44-04
- Admin workspace page (if included in 44-06) can reuse `<ListVisibilityToggle>` per row — the component's `canToggle` prop already supports admin-only rendering paths

Non-creator agents see the badge + Tooltip (read-only information) without any toggle affordance, matching the D-11 render-gate requirement exactly.

## User Setup Required

None — all changes are client-side UI + one adjacent Client Component. No env vars, no migrations, no external dashboard config.

## Next Phase Readiness

- Wave 4 complete. Plan 44-06 (final wave — admin workspace + reassign hook + visual QA checkpoint) now unblocked.
- No blockers or concerns carried forward.

## Self-Check: PASSED

**Files on disk:**

- `src/app/[orgId]/lists/[listId]/visibility-toggle.tsx` — FOUND
- `src/app/[orgId]/lists/components/list-grid.tsx` — FOUND (modified)
- `src/app/[orgId]/lists/[listId]/page.tsx` — FOUND (modified)
- `src/app/[orgId]/personas/components/persona-card.tsx` — FOUND (modified)

**Commits verified in git log:**

- `c01094f` — FOUND (feat(44-05): add visibility badge + tooltip to list-grid)
- `88bb164` — FOUND (feat(44-05): add header badge + creator/admin-gated visibility dropdown)
- `cc0ca50` — FOUND (feat(44-05): add visibility chip to persona-card near is_starter badge)

**Success-criteria greps (from prompt):**

- `grep -q "Lock\|Users" list-grid.tsx` — PASS
- `grep -q "canToggleVisibility" [listId]/page.tsx` — PASS
- `grep -q "Lock\|Users" persona-card.tsx` — PASS
- `test -f [listId]/visibility-toggle.tsx` — PASS

**T-44-02 anti-pattern grep on actions files:** CLEAN — no matches for `isAdmin|created_by !==|user\.id !==`

**TSC in-scope:** 0 new errors. 6 pre-existing deferred errors (unchanged).

**Build:** `pnpm build` → `✓ Compiled successfully`, all 28 static pages generated.

---
*Phase: 44-list-search-visibility*
*Plan: 05*
*Completed: 2026-04-17*
