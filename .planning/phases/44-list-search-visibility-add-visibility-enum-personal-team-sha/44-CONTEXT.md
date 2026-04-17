# Phase 44: List & Saved-Search Visibility - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Source:** Locked plan handed to orchestrator (treated as PRD)

<domain>
## Phase Boundary

Ship per-user privacy for `lists` and `personas` (saved searches). Today every user in a tenant sees every list and every persona. The client wants agents to mark their work-in-progress as "personal" (only creator + admins see it) or leave it "team_shared" (everyone in tenant). Admins (`tenant_admin`, `super_admin`) always see everything.

**Scope-in:**
- DB migration adding `visibility` enum + `created_by` (defensive) to `lists` and `visibility` to `personas`
- RLS policies that fold tenant-scope AND visibility-scope into a single rule on `lists`, `personas`, `list_members`, `saved_search_prospects`
- TypeScript types, query-layer helpers, server actions supporting read/create/toggle visibility
- UI creation toggles + visibility badges + per-item visibility dropdown (creator or admin only)
- Admin workspace view that lists every list + persona across the tenant with creator attribution
- `removeTeamMember` hook that reassigns orphaned rows to the acting admin as `team_shared`

**Scope-out (explicitly NOT in this phase):**
- Lead-level visibility / hiding (leads stay tenant-scoped to prevent double-enrichment)
- Read-only sharing tiers or granular per-user permissions (small teams — keep it simple)
- Changes to activity log behavior (already solves "who's touching what" at lead level)
- Notification systems for visibility changes
- Credit-system / per-user quotas

</domain>

<decisions>
## Implementation Decisions

### D-01 Visibility lives on wrappers, not leads
**Locked.** Visibility is on `lists` and `personas`. `prospects` and `saved_search_prospects`/`list_members` inherit from the parent wrapper. Rationale: leads are tenant-level shared resources; making them per-user-hidden would double API spend when User B re-enriches what User A already enriched on a personal list.

### D-02 Two visibility modes
**Locked.** `visibility_mode` enum: `'personal'` | `'team_shared'`. Default is `'team_shared'` (backward compatible — existing rows read as team_shared).

### D-03 Admin overrides
**Locked.** Users with `app_metadata.role IN ('tenant_admin','super_admin')` see ALL lists/personas regardless of visibility setting. They can also change any list/persona's visibility.

### D-04 Migration file
**Locked.** `supabase/migrations/20260417_list_search_visibility.sql`.
- `CREATE TYPE visibility_mode AS ENUM ('personal','team_shared')` wrapped in idempotent `DO $$...EXCEPTION WHEN duplicate_object THEN NULL;END$$` block
- `ALTER TABLE lists ADD COLUMN IF NOT EXISTS visibility visibility_mode NOT NULL DEFAULT 'team_shared'`
- `ALTER TABLE lists ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL` (NULLABLE so `ON DELETE SET NULL` works)
- `ALTER TABLE personas ADD COLUMN IF NOT EXISTS visibility visibility_mode NOT NULL DEFAULT 'team_shared'` (`created_by` already exists on personas per `src/lib/personas/queries.ts:49`)
- Indexes: `idx_lists_tenant_creator ON lists(tenant_id, created_by)`, `idx_personas_tenant_creator ON personas(tenant_id, created_by)`

### D-05 Visibility RLS expression
**Locked.** Reused across lists + personas select/update/delete:
```sql
tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
AND (
     visibility = 'team_shared'
  OR created_by = auth.uid()
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin','super_admin')
)
```
- Insert uses `WITH CHECK (tenant_id matches AND created_by = auth.uid())`
- Must use `DROP POLICY IF EXISTS <name> ON <table>` before every `CREATE POLICY` (Postgres has no `CREATE OR REPLACE POLICY`)
- Preserve existing `is_starter = false` guard on `personas_delete`
- Preserve existing `*_super_admin` FOR ALL catch-all policies where present
- ENABLE RLS on `lists` + `list_members` (already on `personas`)

### D-06 Child-table RLS defers to parent
**Locked.** `list_members` and `saved_search_prospects` policies are an `EXISTS` subquery against their parent wrapper:
```sql
EXISTS (
  SELECT 1 FROM lists l
  WHERE l.id = list_members.list_id
    AND l.tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (l.visibility = 'team_shared' OR l.created_by = auth.uid() OR <admin>)
)
```
Same pattern for `saved_search_prospects` against `personas`. No denormalized `created_by` / `visibility` on child rows.

### D-07 Shared Visibility type location
**Locked.** `src/types/visibility.ts` exports `export type Visibility = 'personal' | 'team_shared'`. Both `src/lib/lists/types.ts` and `src/lib/personas/types.ts` import from there.

### D-08 Query-layer additions
**Locked.**
- `src/lib/lists/queries.ts`: extend every `.select(...)` to include `visibility, created_by`; `createList` accepts `input.visibility ?? 'team_shared'`; add `updateListVisibility(id, tenantId, visibility)`; add `getAllListsWithCreators(tenantId)` with join to `users` on `created_by` (relies on RLS to yield admins everything)
- `src/lib/personas/queries.ts`: mirror — add `updatePersonaVisibility`, `getAllPersonasWithCreators`; `seedStarterPersonas` inserts `visibility: 'team_shared'` explicitly

### D-09 Server actions
**Locked.**
- `src/app/[orgId]/lists/actions.ts`: `createListAction` reads `visibility` from formData (default `team_shared`); new `updateListVisibilityAction(listId, visibility)`
- `src/app/[orgId]/personas/actions.ts`: `createPersonaAction` / `updatePersonaAction` accept `visibility`; new `updatePersonaVisibilityAction(personaId, visibility)`
- All actions call `getAuthenticatedUser()` (existing auth wrapper) and rely on RLS for authorization — no parallel client-side permission check

### D-10 Creation dialogs
**Locked.**
- `src/app/[orgId]/lists/components/create-list-dialog.tsx`: visibility segmented control (Users icon = team_shared, Lock icon = personal). Default team_shared. Hidden input into form, and `makeTempList` payload includes `visibility` so optimistic grid shows correct badge pre-confirm.
- `src/app/[orgId]/personas/components/persona-form-dialog.tsx`: same control above the `Separator` near Name/Description. Also surfaces in edit mode (reuses same field for `updatePersonaVisibility`).

### D-11 Badges + per-item toggle
**Locked.**
- `src/app/[orgId]/lists/components/list-grid.tsx`: lock/users icon next to `list.name`. Tooltip shows creator name (from `created_by` join) when visibility='personal'; fallback text "Private".
- `src/app/[orgId]/lists/[listId]/page.tsx`: badge in header. Dropdown that calls `updateListVisibilityAction` is rendered only when `user.id === list.created_by || role in ('tenant_admin','super_admin')`.
- `src/app/[orgId]/personas/components/persona-card.tsx`: icon chip near the `is_starter` badge position. Non-starter personas expose the visibility toggle inside the existing `PersonaFormDialog` edit mode.

### D-12 Admin workspace view
**Locked.** NEW route `src/app/[orgId]/team/workspace/page.tsx`. Renders two tabs: "Lists" and "Saved Searches". Each tab shows a table with columns: name, creator (`full_name` + email), visibility badge, member count (for lists) / filter count (for personas), `updated_at`, toggle-visibility action. Uses `getAllListsWithCreators` / `getAllPersonasWithCreators`. RLS automatically allows admins to see everything.
- `src/app/[orgId]/team/page.tsx` header adds link "View team workspace →"
- `src/components/layout/nav-items.tsx` — optional admin-only entry (acceptable to ship or skip per reviewer call)

### D-13 User-removal reassign hook
**Locked.** Inside `src/app/actions/team.ts` `removeTeamMember` (~line 432), BEFORE the `admin.from("users").delete()`, run two `admin`-client updates scoped to the already-verified `tenantId`:
```ts
await admin.from("lists").update({ visibility: "team_shared", created_by: user.id })
  .eq("tenant_id", tenantId).eq("created_by", userId);
await admin.from("personas").update({ visibility: "team_shared", created_by: user.id })
  .eq("tenant_id", tenantId).eq("created_by", userId);
```
Acting admin becomes the new owner; rows become team_shared so nobody loses access. FK `ON DELETE SET NULL` from D-04 is belt-and-braces. No changes to `revokeInvite` (pending users have no rows).

### D-14 Last-admin demotion
**Locked — no code change.** Already blocked by existing `changeUserRole` (`src/app/actions/team.ts:343`) and `removeTeamMember:404-415`. Note in plans for reviewer visibility.

### D-15 Shared-list-deleted-after-copy
**Locked — no code change.** `list_members` CASCADEs on parent list only. A lead copied into a personal list stays on the personal list even if the source shared list is later deleted.

### D-16 Sidebar count badges
**Locked — no code change.** `src/app/[orgId]/layout.tsx:57-66` count queries run under user JWT, so RLS applies per-user filtering automatically.

### Claude's Discretion

- Exact shadcn primitive for the visibility toggle (RadioGroup vs. two-button SegmentedControl) — pick whichever matches existing dialog style
- Exact tooltip component (reuse the one already used elsewhere in list-grid)
- Whether to ship the optional sidebar nav entry in D-12 (default: yes, gated to tenant_admin/super_admin)
- Index strategy beyond the two required ones — add more only if EXPLAIN ANALYZE on the RLS query shows a problem
- How to render the "member count" column on the admin workspace Lists tab — can reuse existing count logic from `[orgId]/lists/page.tsx` or SELECT COUNT aggregate in `getAllListsWithCreators`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### RLS patterns (already in repo)
- `supabase/migrations/20260412_rls_activity_log_personas.sql` — existing pattern for JWT-claim-based tenant-scope policies using `((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)`. New policies must match this idiom exactly.

### Query + type layer
- `src/lib/lists/queries.ts` — current list CRUD (shows the `.select(...)` shape to extend and the insert path at ~line 96 that already writes `created_by`)
- `src/lib/lists/types.ts` — `List` type + `CreateListInput` shape to extend
- `src/lib/personas/queries.ts` — current persona CRUD (insert at ~line 49 already writes `created_by`; `seedStarterPersonas` is the starter-template seed)
- `src/lib/personas/types.ts` — `Persona` type + `CreatePersonaInput` / `UpdatePersonaInput` shapes

### Server action patterns
- `src/app/[orgId]/lists/actions.ts` — existing `createListAction` pattern with `getAuthenticatedUser()`
- `src/app/[orgId]/personas/actions.ts` — existing `createPersonaAction` / `updatePersonaAction` pattern
- `src/app/actions/team.ts` — `removeTeamMember` (~line 432) where reassign hook inserts; `changeUserRole` (~line 343) for last-admin block reference

### UI analogs
- `src/app/[orgId]/lists/components/create-list-dialog.tsx` — current list creation dialog + optimistic `makeTempList`
- `src/app/[orgId]/lists/components/list-grid.tsx` — current list grid (where badge goes)
- `src/app/[orgId]/lists/[listId]/page.tsx` — list header (badge + toggle dropdown)
- `src/app/[orgId]/personas/components/persona-form-dialog.tsx` — current persona create/edit dialog
- `src/app/[orgId]/personas/components/persona-card.tsx` — current persona card (where badge + is_starter live)
- `src/app/[orgId]/team/page.tsx:57-60` — existing team RBAC redirect pattern for the new workspace route
- `src/app/[orgId]/layout.tsx:57-66` — sidebar count queries (verify RLS handles filtering)

### Design system
- `@$HOME/.claude/get-shit-done/references/ui-brand.md` — dark luxury aesthetic, gold accents, CSS variable tokens (established in Phase 05). New visibility icons must respect `var(--text-ghost)` / `var(--gold-primary)` palette.

### Role / auth
- `src/types/auth.ts` — role enum (`tenant_admin`, `super_admin`, `agent`)
- `getAuthenticatedUser()` wrapper — already enforces `requireRole("agent")`; admin checks via JWT `app_metadata.role`

</canonical_refs>

<specifics>
## Specific Ideas

- **Migration idempotency triple-check:** The original `lists` and `personas` tables were authored in the Supabase dashboard, not in a migration file. Every `ALTER TABLE` and `CREATE POLICY` in `20260417_list_search_visibility.sql` must tolerate these pre-existing schemas via `IF EXISTS` / `IF NOT EXISTS` / `DROP POLICY IF EXISTS` — a migration that assumes clean slate will fail.

- **`list_members` existing policies:** The dashboard may already have RLS policies on `list_members` that conflict with the new EXISTS-on-parent policy. Migration must `DROP POLICY IF EXISTS` any existing `list_members_*` policies before creating the new one. Check via `SELECT polname FROM pg_policy WHERE polrelid = 'list_members'::regclass` during dry-run.

- **`created_by` nullability on `lists`:** Must be NULLABLE for the `ON DELETE SET NULL` FK behavior. Do NOT add `NOT NULL`. If any legacy `lists` rows exist with NULL `created_by`, they'll be visible to admins (via role clause) and to anyone looking at team_shared lists (via visibility clause) — acceptable behavior.

- **Optimistic payload in create-list-dialog:** `makeTempList` must set `visibility` to the selected value — otherwise the grid flashes a "team_shared" badge for a personal list pre-confirm.

- **Visibility toggle target gating:** The dropdown is only rendered for creator or admin. Non-creator agents looking at a shared list must NOT see the toggle — it's not their call. Use `user.id === list.created_by || ['tenant_admin','super_admin'].includes(role)` as the render gate.

- **Admin workspace RLS reliance:** `getAllListsWithCreators` does not filter by visibility — it just trusts RLS. This is the point; admins see everything. Do not add a defensive `is_admin` check in the query — that duplicates logic and risks drift.

- **Starter persona seed:** `seedStarterPersonas` must explicitly insert `visibility: 'team_shared'` even though the column default would supply it — protects against future seed reruns on tables where default might drift.

- **Tests:** Add unit tests for `listsOptimisticReducer` and persona optimistic reducer picking up `visibility`. Add an RLS smoke test harness that uses `set_config('request.jwt.claims', ...)` to flip identities and assert select-count results.

</specifics>

<deferred>
## Deferred Ideas

- Lead-level visibility / hiding — explicitly out (D-01 rationale)
- Granular per-user permissions (e.g., "share this list read-only with user X") — too complex for small teams
- Notifications when a list's visibility changes — no product need
- Credit-system / per-user quotas — separate phase (parked per STATE.md)
- Activity-log changes — already covers "who's touching what"

</deferred>

---

*Phase: 44-list-search-visibility*
*Context gathered: 2026-04-17 from locked plan spec handed to orchestrator*
