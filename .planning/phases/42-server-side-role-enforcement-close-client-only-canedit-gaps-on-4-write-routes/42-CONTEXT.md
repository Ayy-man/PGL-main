# Phase 42: Server-Side Role Enforcement — Context

**Gathered:** 2026-04-15
**Status:** Ready for planning
**Source:** ROADMAP entry + Explore agent recon (2026-04-15)

<domain>
## Phase Boundary

Close the server-side authorization gap surfaced by Phase 39 VERIFICATION: 11 mutating handlers across 4 files enforce the Assistant read-only role only on the client via the `canEdit` prop. An authenticated user with `role: 'assistant'` can bypass the UI and POST directly — delete lists, mutate personas, write notes, or burn Apollo credits via `/api/apollo/bulk-enrich`. This phase adds server-side role guards to every mutating handler in the 4 in-scope files so the server honors the same contract the client UI already enforces.

**Scope is strictly the 4 files identified in the audit** — do not expand to re-audit the entire API surface (that's a separate phase). No UI changes (Phase 39-03 already threads `canEdit` client-side). No new DB columns. No new auth helpers — the existing `requireRole(minimumRole)` in `src/lib/auth/rbac.ts:10` is sufficient.

</domain>

<decisions>
## Implementation Decisions

### Helper choice (LOCKED)
- **Use existing `requireRole('agent')` from `src/lib/auth/rbac.ts:10`.** Do NOT create a new `requireWriteRole()` helper. The ROADMAP entry mentioned one as a candidate, but recon confirms `requireRole(minimumRole)` with the existing hierarchy (assistant=0, agent=1, tenant_admin=2, super_admin=3) already does the job — calling `requireRole('agent')` passes for agent/tenant_admin/super_admin and throws for assistant.
- `requireRole()` returns `SessionUser`; it throws or redirects per its internal contract — match existing consumers' error-handling pattern.

### Handlers to guard (LOCKED — exactly 11)
- `src/app/[orgId]/lists/actions.ts` — 6 Server Actions: `createListAction`, `deleteListAction`, `updateMemberStatusAction`, `updateMemberNotesAction`, `removeFromListAction`, `addToListAction`
- `src/app/[orgId]/personas/actions.ts` — 3 Server Actions: `createPersonaAction`, `updatePersonaAction`, `deletePersonaAction`
- `src/app/api/apollo/bulk-enrich/route.ts` — 1 Route Handler: `POST`
- `src/app/api/prospects/[prospectId]/notes/route.ts` — 1 Route Handler: `PATCH`

### Guard placement (LOCKED)
- **Server Actions**: call `await requireRole('agent')` immediately after the existing auth/tenant resolution (e.g., inside or right after `getAuthenticatedUser()` in `lists/actions.ts`) and before any DB write.
- **Route Handlers**: call `await requireRole('agent')` at the top of the handler, after the existing session lookup that returns 401 for unauthenticated users. Convert any thrown auth error into a `403 { error: 'Forbidden', message: 'Your role does not permit this action' }` JSON response (see Error shape below) — do NOT let it propagate as a 500.

### Error response shape (LOCKED)
- **Status:** 403
- **JSON body:** `{ error: 'Forbidden', message: 'Your role does not permit this action' }`
- **Preserve 401 for unauthenticated** — do not change the existing `{ error: 'Unauthorized' }` / 401 behavior. 401 means no session; 403 means session exists but role is insufficient.
- Server Actions typically throw instead of returning JSON — match the existing action's error semantic (throw a Next.js error or return `{ error: 'Forbidden' }` if the action already returns a discriminated union). Planner decides per action based on its current return type.

### Tests (LOCKED)
- **Framework**: Vitest (existing `vitest.config.ts`; pattern mirrors `src/lib/apollo/__tests__/client.test.ts` and `src/inngest/functions/__tests__/enrich-prospect.test.ts`).
- **Coverage target**: every one of the 11 handlers gets at minimum these three tests:
  1. `assistant` role → 403 (Route Handler) or throws/returns error (Server Action)
  2. `agent` role → 200 / success
  3. No session → 401 (preserve existing behavior)
- **Optional**: `tenant_admin` → 200, `super_admin` → 200 (hierarchy sanity — can be one shared test).
- **Mock strategy**: mock `requireRole` OR mock `getCurrentUser` at the Supabase client layer; pick whichever matches the existing test pattern in this codebase. Do not invent a new mocking strategy.

### Grep-zero verification (LOCKED)
After implementation, a ripgrep over the 4 scoped files for mutating handler bodies MUST show zero handlers without a `requireRole` call on the first few lines. Planner produces the exact grep invocation; executor confirms zero matches in the verification task.

### Claude's Discretion
- Task decomposition (one task per file vs. one task for helper-plumbing then one per file — planner's call based on readability)
- Exact placement line within each handler (before/after existing auth resolution — planner picks idiomatic spot)
- Whether to consolidate the 11 tests into 2–3 test files or keep one per handler file (planner's call; lean toward co-locating tests with the file under test)
- Whether `requireRole('agent')` wrapping needs a try/catch to convert thrown errors into the 403 JSON shape for Route Handlers — planner inspects `requireRole`'s exact throw behavior and decides

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth infrastructure (read all three)
- `src/lib/auth/rbac.ts` — defines `requireRole(minimumRole)`, `requireSuperAdmin()`, and the hierarchy. **THE primary helper for this phase.**
- `src/lib/auth/session.ts` — defines `getCurrentUser()`, `requireAuth()`, `requireTenantUser(orgId)`. Context for where `requireRole` fits.
- `src/types/auth.ts` — `UserRole` type union + `ROLE_PERMISSIONS` matrix. Defines valid role strings.

### In-scope files (the 4)
- `src/app/[orgId]/lists/actions.ts` — 6 Server Actions
- `src/app/[orgId]/personas/actions.ts` — 3 Server Actions
- `src/app/api/apollo/bulk-enrich/route.ts` — POST handler
- `src/app/api/prospects/[prospectId]/notes/route.ts` — PATCH handler

### Client-side contract (read-only — already enforces canEdit correctly)
- `src/app/[orgId]/lists/page.tsx:27-28` + `components/lists-page-client.tsx` — shows the `canEdit` contract server must uphold
- `src/app/[orgId]/personas/page.tsx:32-33` — same

### Test references
- `vitest.config.ts` — Vitest config (node env, @ alias)
- `src/lib/apollo/__tests__/client.test.ts` — closest test pattern to copy
- `src/inngest/functions/__tests__/enrich-prospect.test.ts` — second reference for mocking supabase

### Phase 39 provenance
- `.planning/phases/39-ux-polish-pass-luxury-consistency-and-keystone-primitives/39-VERIFICATION.md` — "Pre-existing Issues Confirmed" section: the specific gap this phase closes

</canonical_refs>

<specifics>
## Specific Ideas

- Pattern to mirror: existing `requireSuperAdmin()` inline calls in admin Route Handlers (per Phase 04 locked decision — "inline super_admin auth check in Route Handlers (not requireSuperAdmin) to avoid redirect() 500 in Route Handler context"). Review how that's done in admin routes and mirror the pattern: call `requireRole('agent')` at the top, wrap in try/catch if needed to convert to JSON 403.
- Grep verification command to include in plan:
  ```bash
  rg -n "export (async function|const).*(POST|PATCH|DELETE|Action)" \
     src/app/[orgId]/lists/actions.ts \
     src/app/[orgId]/personas/actions.ts \
     src/app/api/apollo/bulk-enrich/route.ts \
     src/app/api/prospects/[prospectId]/notes/route.ts | \
     wc -l
  # Expect: 11

  rg -n "requireRole" \
     src/app/[orgId]/lists/actions.ts \
     src/app/[orgId]/personas/actions.ts \
     src/app/api/apollo/bulk-enrich/route.ts \
     src/app/api/prospects/[prospectId]/notes/route.ts | \
     wc -l
  # Expect: ≥ 11 (one per handler, possibly more if any share a helper)
  ```

</specifics>

<deferred>
## Deferred Ideas

- **Full API surface re-audit** — many other routes likely have the same gap. NOT in this phase. Possible Phase 44 after Maggie demo. ROADMAP entry explicitly says: *"do not expand to re-audit the entire API surface (that's a separate phase)."*
- **Per-route permission matrix** (beyond `canEdit`) — e.g., separate `canDelete`, `canExport`. Current `ROLE_PERMISSIONS` has these but the 4 in-scope files only need the `agent`-or-higher gate. Finer-grained matrix enforcement deferred.
- **Audit log for 403 denials** — useful for detecting probe attempts, but not pre-demo-blocker. Defer.
- **Client-side error UX for 403 responses** — today the client shouldn't hit 403 because the UI buttons are disabled. If a race condition or stale session produces one, surfacing a friendly toast is a nice-to-have. Defer.

</deferred>

---

*Phase: 42-server-side-role-enforcement-close-client-only-canedit-gaps-on-4-write-routes*
*Context gathered: 2026-04-15 — Explore recon pre-baked; planner can skip codebase re-exploration*
