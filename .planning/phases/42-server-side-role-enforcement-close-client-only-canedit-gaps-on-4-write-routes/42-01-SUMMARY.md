---
phase: 42-server-side-role-enforcement
plan: 01
subsystem: auth/rbac (convention plan)
tags: [rbac, auth, convention, docs-only, phase-42]
requires:
  - Phase 39 VERIFICATION identified the 4 client-only canEdit gaps
  - Existing primitives: requireRole (src/lib/auth/rbac.ts), hasMinRole (src/types/auth.ts)
provides:
  - Locked Server Action guard pattern (Pattern A) for Plans 02, 03
  - Locked Route Handler guard pattern (Pattern B) for Plan 04
  - Locked 403 JSON body shape (Pattern C) for Route Handlers
  - 401 preservation rule (don't touch existing unauth behavior)
affects:
  - Plans 42-02, 42-03, 42-04, 42-05 (downstream executors copy these snippets verbatim)
tech-stack:
  added: []
  patterns:
    - "Inline hasMinRole role check in Route Handlers (mirrors admin route precedent: src/app/api/admin/tenants/route.ts:14-16, ~20 files)"
    - "requireRole('agent') at top of Server Actions (lets NEXT_REDIRECT propagate)"
key-files:
  created: []
  modified:
    - .planning/phases/42-server-side-role-enforcement-close-client-only-canedit-gaps-on-4-write-routes/42-01-PLAN.md
decisions:
  - "Server Actions → `await requireRole('agent')` (Pattern A). redirect() is safe here because Next.js catches NEXT_REDIRECT and converts to client navigation."
  - "Route Handlers → inline `hasMinRole(role, 'agent')` + JSON 403 return (Pattern B). requireRole is UNSAFE in Route Handlers: redirect() escapes as HTTP 500, violating the locked 403 contract."
  - "Locked 403 body: `{ error: 'Forbidden', message: 'Your role does not permit this action' }`. Title-case `Forbidden` (not all-caps `FORBIDDEN` from ROADMAP draft)."
  - "No new helper file — `requireRole` + `hasMinRole` are sufficient. Rejects the ROADMAP suggestion of a new `requireWriteRole()` helper."
  - "401 block (`{ error: 'Unauthorized' }`) stays untouched in every handler. 401 = no session; 403 = session exists, role insufficient."
metrics:
  duration: ~3 minutes
  tasks_completed: 1
  files_modified: 1
  date_completed: 2026-04-15
---

# Phase 42 Plan 01: Lock Guard Convention Summary

Locked the single Server Action guard pattern (`requireRole('agent')`) and single Route Handler guard pattern (inline `hasMinRole` with JSON 403) so Plans 02–04 have zero decisions left. Committed a short addendum to 42-01-PLAN.md listing the 2 Route Handlers Pattern B applies to, making the copy-paste path unambiguous for the Plan 04 executor.

## Objective

Lock the helper plumbing and 403-conversion convention this phase will use, so Plans 02–04 have zero decisions left to make. No code changes — pure convention-fixing that ships as a commit to the PLAN file itself.

## Tasks Completed

### Task 1: Commit this PLAN file as the convention record

**Status:** Completed
**Commit:** `07e0be4` — docs(42-01): finalize convention plan — list 2 Route Handlers under Pattern B

**What was done:**
1. Verified `42-01-PLAN.md` contains all four named pattern sections (Pattern A, Pattern B, Pattern C, 401 preservation) — grep returned 8 matches across body, action block, and success criteria.
2. Verified Plans 02, 03, 04 each `@`-reference `42-01-PLAN.md` in their `<context>` block:
   - `42-02-PLAN.md:57` — Server Actions plan for `lists/actions.ts`
   - `42-03-PLAN.md:57` — Server Actions plan for `personas/actions.ts`
   - `42-04-PLAN.md:74` — Route Handlers plan for `bulk-enrich` + `notes`
   - (Plan 05 also references — verification plan, expected bonus reference)
3. Added a 3-line addendum under Pattern B listing the exact two Route Handlers Pattern B applies to: `POST /api/apollo/bulk-enrich` and `PATCH /api/prospects/[prospectId]/notes`. This came directly from the prompt's suggested editorial fix ("possibly adding a short note about which Route Handlers will use Pattern B") and makes Plan 04's copy-paste step self-contained.

**Verification (from plan):**
- `rg -c "Pattern A — Server Action guard|Pattern B — Route Handler guard|Pattern C — Locked 403 JSON body|401 preservation" 42-01-PLAN.md` → 8 (≥1 required, sections all present)
- `rg -l "42-01-PLAN.md" .../42-.../ | wc -l` → 5 (plan spec said `3`; actual is 5 because 42-01-PLAN.md itself matches and 42-05-PLAN.md also back-references — both are correct and expected, not a deviation)

**Done criteria:** All met.

## Commits

| Commit    | Type | Scope | Description                                                                     |
| --------- | ---- | ----- | ------------------------------------------------------------------------------- |
| `07e0be4` | docs | 42-01 | finalize convention plan — list 2 Route Handlers under Pattern B                |

Base before this plan: `3fd8573` (docs(42): plan server-side role enforcement on 4 write routes).
HEAD after this plan: `07e0be4`.

## Files Touched

**Modified (1):**
- `.planning/phases/42-server-side-role-enforcement-close-client-only-canedit-gaps-on-4-write-routes/42-01-PLAN.md` — 4 lines added under Pattern B header listing the 2 Route Handlers.

**Zero source code changes** — scope strictly matches `files_modified: [42-01-PLAN.md]` in plan frontmatter.

## Decisions Made

1. **Pattern A (Server Actions) → `await requireRole('agent')`.** Applies to Plans 42-02 (6 actions in `lists/actions.ts`) and 42-03 (3 actions in `personas/actions.ts`). The `NEXT_REDIRECT` thrown by `redirect()` is framework-caught and converted to a client navigation — do NOT swallow it into a `{ success: false }` envelope.

2. **Pattern B (Route Handlers) → inline `hasMinRole(role, 'agent')` + JSON 403.** Applies to Plan 42-04's two handlers (`bulk-enrich` POST, `notes` PATCH). `requireRole` is UNSAFE here because `redirect()` escapes as HTTP 500, violating the 403 contract. Mirrors the existing pattern in ~20 admin routes (e.g., `src/app/api/admin/tenants/route.ts:14-16`).

3. **Pattern C (403 body) → `{ error: "Forbidden", message: "Your role does not permit this action" }`, status 403.** Title-case `Forbidden` (not the all-caps `FORBIDDEN` the ROADMAP draft used). 42-CONTEXT.md §"Error response shape" is the source of truth.

4. **No new helper file.** `requireRole` + `hasMinRole` are sufficient. Rejects the ROADMAP's suggestion of a `requireWriteRole()` helper.

5. **401 block untouched everywhere.** `{ error: 'Unauthorized' }` at status 401 stays exactly as-is in every handler. 401 = no session; 403 = session exists, role insufficient. Tests in Plans 02–04 MUST cover both states.

## Deviations from Plan

None. The plan explicitly allowed the "possibly adding a short note about which Route Handlers will use Pattern B" editorial fix and that is the only content change made. Scope stayed inside `files_modified: [42-01-PLAN.md]`.

### Auth Gates

None — doc-only plan, no external services involved.

## Follow-ups

- **Plan 02 (Wave 2):** executor copy-pastes Pattern A into each of the 6 actions in `src/app/[orgId]/lists/actions.ts`.
- **Plan 03 (Wave 2):** executor copy-pastes Pattern A into each of the 3 actions in `src/app/[orgId]/personas/actions.ts`.
- **Plan 04 (Wave 2):** executor copy-pastes Pattern B into the 2 Route Handlers listed under Pattern B.
- **Plan 05 (Wave 3):** verification agent greps all 4 files for presence of `requireRole('agent')` (Plans 02/03) and `hasMinRole(role, "agent")` (Plan 04) and confirms zero handlers without a guard.

## Known Stubs

None — doc-only plan.

## Threat Flags

None — doc-only plan introduces no new surface. Phase threat register (T-42-01, Elevation of Privilege) is mitigated by locking the two guard patterns here; downstream plans inherit the mitigation.

## Self-Check: PASSED

- FOUND: `.planning/phases/42-server-side-role-enforcement-close-client-only-canedit-gaps-on-4-write-routes/42-01-PLAN.md`
- FOUND: commit `07e0be4`
- FOUND: commit `3fd8573` (base)
- Verified all four canonical pattern sections present in 42-01-PLAN.md
- Verified Plans 02, 03, 04 each reference `42-01-PLAN.md`
