---
phase: 42-server-side-role-enforcement
plan: 04
subsystem: auth
tags: [rbac, route-handlers, apollo, notes, vitest, pattern-b]
dependency_graph:
  requires:
    - 42-01 (Pattern B + locked 403 body convention)
  provides:
    - Server-side role enforcement on the 2 Route Handlers in phase scope
    - Co-located Vitest coverage for role-guard paths on both handlers
  affects:
    - src/app/api/apollo/bulk-enrich/route.ts
    - src/app/api/prospects/[prospectId]/notes/route.ts
tech_stack:
  added: []
  patterns:
    - "Pattern B inline role guard (hasMinRole(role, 'agent')) returning JSON 403 in Route Handlers"
    - "Co-located Vitest __tests__/ next to route.ts, mocking @/lib/supabase/server at the module boundary"
key_files:
  created:
    - src/app/api/apollo/bulk-enrich/__tests__/route.test.ts
    - src/app/api/prospects/[prospectId]/notes/__tests__/route.test.ts
  modified:
    - src/app/api/apollo/bulk-enrich/route.ts
    - src/app/api/prospects/[prospectId]/notes/route.ts
decisions:
  - "Followed Plan 42-01 Pattern B (inline hasMinRole) over requireRole() to avoid Route Handler 500 from Next.js redirect()."
  - "Guard placed BEFORE the Apollo rate-limiter in bulk-enrich so assistant requests cannot consume the tenant's rate budget (threat T-42-04-03)."
  - "Guard placed BEFORE prospects.update() in notes so assistant cannot reach the DB mutation (threat T-42-04-02)."
  - "Matched Task 2/4 test structure to 42-04-PLAN.md skeleton verbatim (5 tests bulk-enrich, 4 tests notes)."
metrics:
  duration: "~3 minutes"
  completed: 2026-04-15
  tasks_completed: 4
  commits: 4
  tests_added: 9
---

# Phase 42 Plan 04: Route Handler Role Enforcement Summary

Added inline `hasMinRole(role, "agent")` role guards to the 2 Route Handlers in phase 42 scope — `POST /api/apollo/bulk-enrich` and `PATCH /api/prospects/[prospectId]/notes` — using Plan 42-01's locked Pattern B, returning the byte-identical 403 JSON body, and co-locating 9 Vitest tests proving all four role paths (assistant→403, agent→200, no-session→401, hierarchy sanity) in four atomic commits.

## Guard Placement (exact line numbers post-edit)

| File | Guard line | Block span | Placement rule |
|------|-----------|-----------|----------------|
| `src/app/api/apollo/bulk-enrich/route.ts` | `if (!hasMinRole(role, "agent"))` at **line 131** | lines 125–136 (comment + role read + check + 403 return) | AFTER tenantId 401 guard (line 119-121), BEFORE `withRateLimit(apolloRateLimiter, ...)` (now line 138) |
| `src/app/api/prospects/[prospectId]/notes/route.ts` | `if (!hasMinRole(role, "agent"))` at **line 40** | lines 38–45 (comment + role read + check + 403 return) | AFTER tenantId 401 block (line 30-34), BEFORE body parse (`const { prospectId } = await context.params;`, now line 48) |

## 403 Body Byte-Identity Check

Copy-paste check confirmed the literal 403 return expression is byte-identical across both routes:

```
        { error: "Forbidden", message: "Your role does not permit this action" },
```

`diff` of the exact lines (132–134 in bulk-enrich vs. 41–43 in notes) shows zero bytes of difference in the body object, status code `403`, and `NextResponse.json(...)` call shape.

## Test Counts & Final Vitest Output

| File | Tests | Paths covered |
|------|-------|---------------|
| `src/app/api/apollo/bulk-enrich/__tests__/route.test.ts` | **5** | assistant→403 (bulkEnrich + rateLimiter never called), agent→200 mock-mode, no-session→401, no-tenantId→401, tenant_admin & super_admin→200 |
| `src/app/api/prospects/[prospectId]/notes/__tests__/route.test.ts` | **4** | assistant→403 (supabase.from never called), agent→200 `{ notes }`, no-session→401, tenant_admin & super_admin→200 |

Final combined vitest run (both files):

```
 ✓ src/app/api/prospects/[prospectId]/notes/__tests__/route.test.ts (4 tests) 6ms
 ✓ src/app/api/apollo/bulk-enrich/__tests__/route.test.ts (5 tests) 6ms

 Test Files  2 passed (2)
      Tests  9 passed (9)
   Duration  152ms
```

## Commits (4 atomic)

| # | Hash | Type | Message |
|---|------|------|---------|
| 1 | `68538c3` | feat | `feat(42-04): guard bulk-enrich POST with inline hasMinRole('agent')` |
| 2 | `0fda8b3` | test | `test(42-04): cover bulk-enrich POST role-guard paths` |
| 3 | `0b6d7e0` | feat | `feat(42-04): guard notes PATCH with inline hasMinRole('agent')` |
| 4 | `0bf5782` | test | `test(42-04): cover notes PATCH role-guard paths` |

## Verification Against Plan's `<verification>` Block

- `rg -n "hasMinRole\(role, \"agent\"\)" src/app/api/apollo/bulk-enrich/route.ts src/app/api/prospects/[prospectId]/notes/route.ts` → **2 matches** (expected 2).
- Both Vitest files green (**9/9 passing**).
- `rg -n "error: \"Forbidden\", message:" ...` → **2 matches** with byte-identical tail.

## Success Criteria

- [x] Both route files import `hasMinRole` from `@/types/auth`.
- [x] Both route files have exactly one `hasMinRole(role, "agent")` check.
- [x] Both route files return the locked 403 body verbatim.
- [x] Both test files exist with ≥4 role-path tests each (5 + 4 = 9).
- [x] `npx vitest run` on both new test files is green.
- [x] Four atomic commits landed: 2 feat + 2 test.

## Threat Model Coverage (from PLAN)

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-42-04-01 (E — resource abuse on bulk-enrich) | mitigate | Covered: assistant→403 test asserts both `bulkEnrich` and `withRateLimit` spies were never called. |
| T-42-04-02 (T — tampering on notes) | mitigate | Covered: assistant→403 test asserts `supabase.from` was never called (so `prospects.update` cannot run). |
| T-42-04-03 (D — rate budget consumption) | mitigate | Guard placed BEFORE `withRateLimit` (line 131 < line 138), verified by the same `not.toHaveBeenCalled()` assertion on `mockWithRateLimit`. |
| T-42-04-04 (I — 401 vs 403 disclosure) | accept | No mitigation required per PLAN. |

## Deviations from Plan

None — plan executed exactly as written. Guard blocks, test skeletons, mock shopping lists, commit messages, and placement lines all match 42-04-PLAN.md verbatim.

One noted environment observation (not a deviation): project-wide `tsc --noEmit` surfaces pre-existing TS errors in `src/lib/search/__tests__/execute-research.test.ts` that are unrelated to this plan's files. Per scope boundary they are out of scope and were not touched. (`tsc --noEmit` grep filtered to the two scoped route files reports zero errors.)

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries beyond what is already in the plan's `<threat_model>`.

## Known Stubs

None — no hardcoded empty arrays/objects/strings feeding UI, no placeholder text, no TODO/FIXME markers introduced.

## Self-Check: PASSED

**Files created:**
- FOUND: `src/app/api/apollo/bulk-enrich/__tests__/route.test.ts`
- FOUND: `src/app/api/prospects/[prospectId]/notes/__tests__/route.test.ts`

**Files modified:**
- FOUND: `src/app/api/apollo/bulk-enrich/route.ts` (guard at line 131)
- FOUND: `src/app/api/prospects/[prospectId]/notes/route.ts` (guard at line 40)

**Commits verified via `git log --oneline`:**
- FOUND: `68538c3` feat(42-04): guard bulk-enrich POST
- FOUND: `0fda8b3` test(42-04): cover bulk-enrich POST role-guard paths
- FOUND: `0b6d7e0` feat(42-04): guard notes PATCH
- FOUND: `0bf5782` test(42-04): cover notes PATCH role-guard paths
