# Phase 44: List & Saved-Search Visibility - Research

**Researched:** 2026-04-17
**Domain:** PostgreSQL RLS, Supabase, Next.js 14 App Router, React optimistic state
**Confidence:** HIGH (codebase confirmed; all library versions verified in package.json)

## Summary

Phase 44 ships per-user privacy for `lists` and `personas` wrappers via a `visibility_mode` enum, a `created_by` backfill on `lists`, and a single RLS clause that folds tenant-scope + visibility-scope + admin-override into one predicate. Child tables (`list_members`, `saved_search_prospects`) defer to parent visibility via an `EXISTS` subquery — no denormalization. The UI adds a segmented visibility control to create dialogs, a lock/users badge on list/persona cards, a creator-or-admin-only toggle dropdown, and a new `/team/workspace` admin page. A `removeTeamMember` hook reassigns orphaned rows to the acting admin. Leads remain tenant-scoped (D-01).

All architectural decisions are locked in CONTEXT.md — this research **verifies** the existing codebase supports them and **surfaces concrete risks** the planner must address. The highest-risk items are: (1) unknown dashboard-authored policies on `lists`/`list_members` that must be dropped defensively, (2) `EXISTS`-on-parent RLS perf under realistic load, and (3) migration idempotency across tables authored in the Supabase dashboard.

**Primary recommendation:** Ship in this order — (a) migration with discovery step, (b) types + query layer + `getAuthenticatedUser` role plumbing, (c) server actions, (d) optimistic UI + badges + dropdowns, (e) admin workspace view, (f) user-removal hook + RLS smoke tests. Do not combine migration with UI in a single plan — migration lands first so every subsequent plan can assume `visibility` exists.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 Visibility lives on wrappers, not leads.** Visibility is on `lists` and `personas`. `prospects` and `saved_search_prospects`/`list_members` inherit from the parent wrapper. Rationale: leads are tenant-level shared resources; making them per-user-hidden would double API spend when User B re-enriches what User A already enriched on a personal list.

**D-02 Two visibility modes.** `visibility_mode` enum: `'personal'` | `'team_shared'`. Default is `'team_shared'` (backward compatible — existing rows read as team_shared).

**D-03 Admin overrides.** Users with `app_metadata.role IN ('tenant_admin','super_admin')` see ALL lists/personas regardless of visibility setting. They can also change any list/persona's visibility.

**D-04 Migration file.** `supabase/migrations/20260417_list_search_visibility.sql`.
- `CREATE TYPE visibility_mode AS ENUM ('personal','team_shared')` wrapped in idempotent `DO $$...EXCEPTION WHEN duplicate_object THEN NULL;END$$` block
- `ALTER TABLE lists ADD COLUMN IF NOT EXISTS visibility visibility_mode NOT NULL DEFAULT 'team_shared'`
- `ALTER TABLE lists ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL` (NULLABLE so `ON DELETE SET NULL` works)
- `ALTER TABLE personas ADD COLUMN IF NOT EXISTS visibility visibility_mode NOT NULL DEFAULT 'team_shared'` (`created_by` already exists on personas per `src/lib/personas/queries.ts:49`)
- Indexes: `idx_lists_tenant_creator ON lists(tenant_id, created_by)`, `idx_personas_tenant_creator ON personas(tenant_id, created_by)`

**D-05 Visibility RLS expression.** Reused across lists + personas select/update/delete:
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

**D-06 Child-table RLS defers to parent.** `list_members` and `saved_search_prospects` policies are an `EXISTS` subquery against their parent wrapper. Same pattern for `saved_search_prospects` against `personas`. No denormalized `created_by` / `visibility` on child rows.

**D-07 Shared Visibility type location.** `src/types/visibility.ts` exports `export type Visibility = 'personal' | 'team_shared'`. Both `src/lib/lists/types.ts` and `src/lib/personas/types.ts` import from there.

**D-08 Query-layer additions.**
- `src/lib/lists/queries.ts`: extend every `.select(...)` to include `visibility, created_by`; `createList` accepts `input.visibility ?? 'team_shared'`; add `updateListVisibility(id, tenantId, visibility)`; add `getAllListsWithCreators(tenantId)` with join to `users` on `created_by` (relies on RLS to yield admins everything)
- `src/lib/personas/queries.ts`: mirror — add `updatePersonaVisibility`, `getAllPersonasWithCreators`; `seedStarterPersonas` inserts `visibility: 'team_shared'` explicitly

**D-09 Server actions.**
- `src/app/[orgId]/lists/actions.ts`: `createListAction` reads `visibility` from formData (default `team_shared`); new `updateListVisibilityAction(listId, visibility)`
- `src/app/[orgId]/personas/actions.ts`: `createPersonaAction` / `updatePersonaAction` accept `visibility`; new `updatePersonaVisibilityAction(personaId, visibility)`
- All actions call `getAuthenticatedUser()` (existing auth wrapper) and rely on RLS for authorization — no parallel client-side permission check

**D-10 Creation dialogs.**
- `src/app/[orgId]/lists/components/create-list-dialog.tsx`: visibility segmented control (Users icon = team_shared, Lock icon = personal). Default team_shared. Hidden input into form, and `makeTempList` payload includes `visibility` so optimistic grid shows correct badge pre-confirm.
- `src/app/[orgId]/personas/components/persona-form-dialog.tsx`: same control above the `Separator` near Name/Description. Also surfaces in edit mode (reuses same field for `updatePersonaVisibility`).

**D-11 Badges + per-item toggle.**
- `src/app/[orgId]/lists/components/list-grid.tsx`: lock/users icon next to `list.name`. Tooltip shows creator name (from `created_by` join) when visibility='personal'; fallback text "Private".
- `src/app/[orgId]/lists/[listId]/page.tsx`: badge in header. Dropdown that calls `updateListVisibilityAction` is rendered only when `user.id === list.created_by || role in ('tenant_admin','super_admin')`.
- `src/app/[orgId]/personas/components/persona-card.tsx`: icon chip near the `is_starter` badge position. Non-starter personas expose the visibility toggle inside the existing `PersonaFormDialog` edit mode.

**D-12 Admin workspace view.** NEW route `src/app/[orgId]/team/workspace/page.tsx`. Renders two tabs: "Lists" and "Saved Searches". Uses `getAllListsWithCreators` / `getAllPersonasWithCreators`. RLS automatically allows admins to see everything. Nav entry optional.

**D-13 User-removal reassign hook.** Inside `src/app/actions/team.ts` `removeTeamMember` (~line 432), BEFORE the `admin.from("users").delete()`, run two `admin`-client updates scoped to the already-verified `tenantId` that reassign lists/personas to the acting admin and flip visibility to `team_shared`.

**D-14 Last-admin demotion — no code change.** Already blocked by existing `changeUserRole` and `removeTeamMember`.

**D-15 Shared-list-deleted-after-copy — no code change.** `list_members` CASCADEs on parent list only.

**D-16 Sidebar count badges — no code change.** `src/app/[orgId]/layout.tsx:57-66` count queries run under user JWT, so RLS applies per-user filtering automatically.

### Claude's Discretion

- Exact shadcn primitive for the visibility toggle (RadioGroup vs. two-button SegmentedControl) — pick whichever matches existing dialog style
- Exact tooltip component (reuse the one already used elsewhere in list-grid)
- Whether to ship the optional sidebar nav entry in D-12 (default: yes, gated to tenant_admin/super_admin)
- Index strategy beyond the two required ones — add more only if EXPLAIN ANALYZE on the RLS query shows a problem
- How to render the "member count" column on the admin workspace Lists tab — can reuse existing count logic from `[orgId]/lists/page.tsx` or SELECT COUNT aggregate in `getAllListsWithCreators`

### Deferred Ideas (OUT OF SCOPE)

- Lead-level visibility / hiding — explicitly out (D-01 rationale)
- Granular per-user permissions (e.g., "share this list read-only with user X") — too complex for small teams
- Notifications when a list's visibility changes — no product need
- Credit-system / per-user quotas — separate phase (parked per STATE.md)
- Activity-log changes — already covers "who's touching what"
</user_constraints>

<phase_requirements>
## Phase Requirements

Phase 44 is not covered by existing v1 `REQUIREMENTS.md` IDs (all `LIST-*` and `PB-*` are complete). The requirements surfaced during locked planning are proposed IDs below — planner should map tasks to these.

| ID | Description | Research Support |
|----|-------------|------------------|
| VIS-01 | `lists` and `personas` have a `visibility` column with enum `personal \| team_shared`, default `team_shared` | D-04 migration; no behavioral change for existing rows |
| VIS-02 | `lists.created_by` column exists as NULLABLE UUID FK to `auth.users(id)` with `ON DELETE SET NULL` | D-04; matches `src/lib/lists/queries.ts:96` which already writes `created_by` but column is currently dashboard-authored — migration formalizes it |
| VIS-03 | RLS policies on `lists`, `list_members`, `personas`, `saved_search_prospects` enforce tenant + visibility + admin-override | D-05, D-06; EXISTS-on-parent for child tables |
| VIS-04 | Agents can create a list/persona with visibility `personal` or `team_shared`; default is `team_shared` | D-08, D-09, D-10 |
| VIS-05 | Only the creator or an admin (`tenant_admin`/`super_admin`) can toggle visibility of an existing list/persona | D-11 render-gate + RLS USING clause |
| VIS-06 | Lists + personas show visual visibility indicator (lock/users icon) in all grid/card views | D-11 |
| VIS-07 | Admins have a `/team/workspace` page listing every list + persona in the tenant with creator attribution | D-12 |
| VIS-08 | When a team member is removed, their owned lists/personas are reassigned to the acting admin and flipped to `team_shared` | D-13 |
| VIS-09 | Optimistic create dialogs render the correct visibility badge before server confirm | D-10 `makeTempList` payload carries `visibility` |
| VIS-10 | Sidebar count badges (`savedSearchCount`, `listsCount`) reflect the caller's visibility filter automatically via RLS | D-16 confirmed in layout.tsx |
| VIS-11 | Migration is safely idempotent against dashboard-authored `lists`/`list_members`/`personas` schemas | D-04 + IF NOT EXISTS / DROP POLICY IF EXISTS pattern |
| VIS-12 | Seeded starter personas are inserted with `visibility: 'team_shared'` explicitly (not relying on default) | D-08; belt-and-braces for future seed reruns |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tenant + visibility scoping | Database (Postgres RLS) | — | Database-level RLS is the only correct place for multi-tenant + visibility isolation. Same pattern used in every prior phase (MT-01, MT-02). Application-level `.eq()` guards are belt-and-braces but not the trust boundary. |
| Visibility enum type definition | Database (Postgres) + Shared TS | — | `visibility_mode` in Postgres; `Visibility` type in `src/types/visibility.ts` (D-07). Both sides must stay in sync manually — no code generation. |
| Child-row visibility inheritance | Database (RLS via EXISTS) | — | `list_members` + `saved_search_prospects` do not store visibility; they inherit from parent wrapper via `EXISTS (SELECT 1 FROM lists l WHERE ...)` per D-06. This avoids denormalization drift. |
| Authorization decisions on writes | Database (RLS USING + WITH CHECK) | Server Actions (input validation only) | Server actions do input validation and call `getAuthenticatedUser()` (confirms auth + role floor). RLS policy enforces whether the row is writable. No parallel client permission check (CONTEXT D-09). |
| Admin override | Database (RLS clause on role JWT) | — | `(auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin','super_admin')` folds into the main USING clause. Avoids role check in application code for reads. |
| User-removal reassign | Server Action (admin client) | — | Cross-user data mutation under tenant admin's auth. Must use `createAdminClient()` to bypass RLS (admin is re-owning rows they may not already be able to see). Guards precede the mutation (last-admin block from D-14). |
| Visibility UI toggle render-gate | Frontend (React client component) | Server Action (re-validates via RLS) | Render-gate is `user.id === list.created_by || isAdmin` (UX hint only). Server enforcement comes from RLS `UPDATE USING` clause — if a non-creator non-admin somehow posts the action, RLS rejects the update. |
| Optimistic list/persona creation | Frontend (React reducer) | — | `listsOptimisticReducer` (`list-grid.tsx:47-98`) already handles CREATE/DELETE state. Visibility needs threading into `OptimisticList` + `makeTempList` — pure addition, no new reducer action. |
| Sidebar count badges | Frontend Server Component | Database (RLS) | Counts in `src/app/[orgId]/layout.tsx:57-66` run under session client → RLS applies → counts automatically filter per user. No code change (D-16). |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.2.35 | App Router, Server Actions, `revalidatePath` | Existing stack |
| Supabase JS | @supabase/supabase-js 2.95.3 | Session + admin clients | Existing stack |
| @supabase/ssr | 0.8.0 | `createClient()` for server components / actions | Existing stack — RLS runs under user JWT |
| Vitest | 4.0.18 | Test runner (node env, ESM) | Existing stack, `vitest.config.ts` |
| PostgreSQL | 15+ (Supabase default) | RLS, enum types, FKs, indexes | Existing stack |
| lucide-react | 0.563.0 | `Lock`, `Users` icons for visibility badges | Already used throughout UI |
| @radix-ui/react-tooltip | 1.2.8 | Tooltip primitive for visibility badge hover | Already used in list-grid.tsx |
| @radix-ui/react-dropdown-menu | 2.1.16 | Dropdown for visibility toggle on list detail page | Already used in team-member-actions |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | 1.1.15 | Existing dialog wrapper for create-list / persona-form | Already integrated |
| zod | 4.3.6 | FormData validation in server actions (already used in team.ts) | If planner chooses stricter action-level validation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Enum type (`visibility_mode`) | `TEXT` with CHECK constraint | Enum is stricter + self-documenting. CONTEXT D-04 locks it. Enum alter-add-value is trickier than text but we're not adding values later. |
| `DROP POLICY IF EXISTS` + `CREATE POLICY` | `CREATE POLICY IF NOT EXISTS` | Postgres **does not** support `CREATE POLICY IF NOT EXISTS`. `DROP IF EXISTS` + `CREATE` is the canonical idempotency pattern [VERIFIED: PostgreSQL 15 docs — `CREATE POLICY` has no `IF NOT EXISTS` variant; `DROP POLICY IF EXISTS` was added in PG 9.5]. |
| EXISTS subquery on child tables | Denormalize `visibility` + `created_by` onto `list_members` | Denormalization requires sync triggers. RLS planner routinely folds EXISTS into joins, and our indexes (`idx_list_members_list_tenant`) already cover the lookup. CONTEXT D-06 locks EXISTS pattern. |
| Shared type in `src/types/visibility.ts` | Co-located `export type Visibility` in `lib/lists/types.ts` | Types diverge if duplicated. Shared type ensures `lists` and `personas` use identical literal union. CONTEXT D-07 locks location. |

**Installation:** No new dependencies required. All packages verified in `package.json`.

**Version verification:**
- `next` 14.2.35 — verified in package.json
- `@supabase/supabase-js` 2.95.3 — verified
- `@supabase/ssr` 0.8.0 — verified
- `vitest` 4.0.18 — verified
- All Radix/Lucide versions match what `list-grid.tsx` and `persona-card.tsx` already import [VERIFIED: package.json + import statements grep]

## Architecture Patterns

### System Architecture Diagram

```
                                                                    │
  ┌─────────────────────────────────────────────────────────────────┼───────────────┐
  │                          Browser (React Client)                 │               │
  │                                                                 │               │
  │  create-list-dialog ──┐                list-grid.tsx            │               │
  │   (visibility select) │                 (badge + tooltip)       │               │
  │                       ▼                                         │               │
  │              makeTempList({visibility})                         │               │
  │                       │  optimisticCreate                       │               │
  │                       ▼                                         │               │
  │              listsOptimisticReducer  ◄──── real list ──── back  │               │
  │                       │                                         │               │
  │                       │ FormData POST (Server Action RPC)       │               │
  └───────────────────────┼─────────────────────────────────────────┼───────────────┘
                          │                                         │
  ┌───────────────────────┼─────────────────────────────────────────┼───────────────┐
  │  Next.js (Server)     ▼                                         │               │
  │                                                                 │               │
  │   createListAction(formData)                                    │               │
  │     │                                                           │               │
  │     ├──► getAuthenticatedUser()  ── reads JWT.app_metadata      │               │
  │     │      └─► requireRole("agent")                             │               │
  │     │                                                           │               │
  │     ├──► createList(tenantId, userId, {..., visibility})        │               │
  │     │      └─► supabase(session).from("lists").insert({...})    │               │
  │     │                                                           │               │
  │     └──► revalidatePath("/[orgId]/lists", "page")               │               │
  │                                                                 │               │
  │   updateListVisibilityAction(id, visibility)  ── same pattern   │               │
  │                                                                 │               │
  │   removeTeamMember(userId) [admin client — bypasses RLS]        │               │
  │     ├─► reassign lists  (tenant_id=X, created_by=userId)        │               │
  │     ├─► reassign personas                                       │               │
  │     └─► delete public.users + auth.users                        │               │
  └───────────────────────┼─────────────────────────────────────────┼───────────────┘
                          │
  ┌───────────────────────▼─────────────────────────────────────────────────────────┐
  │  Postgres (Supabase)                                                            │
  │                                                                                 │
  │  ┌──────────┐       ┌──────────┐       ┌──────────────┐       ┌──────────────┐  │
  │  │  lists   │       │ personas │       │ list_members │       │saved_search_ │  │
  │  │          │       │          │       │              │       │  prospects   │  │
  │  │tenant_id │       │tenant_id │       │  list_id ────┼──►    │persona_id ──┼──►│
  │  │created_by│◄──┐   │created_by│◄──┐   │tenant_id     │       │tenant_id    │  │
  │  │visibility│   │   │visibility│   │   │              │       │             │  │
  │  └──────────┘   │   └──────────┘   │   └──────────────┘       └──────────────┘  │
  │        ▲        │         ▲        │          ▲                     ▲           │
  │        │        │         │        │          │                     │           │
  │   RLS policy    │    RLS policy    │    RLS via EXISTS       RLS via EXISTS    │
  │   (tenant       │    (tenant       │    against lists        against personas  │
  │    + vis        │    + vis         │    parent                parent            │
  │    + admin)     │    + admin)      │                                            │
  │                 │                  │                                            │
  │    FK created_by (ON DELETE SET NULL) ──► auth.users                            │
  │                                                                                 │
  └─────────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
supabase/migrations/
└── 20260417_list_search_visibility.sql   # NEW

src/types/
└── visibility.ts                         # NEW (D-07)

src/lib/lists/
├── queries.ts                            # EXTEND .select(), add updateListVisibility, getAllListsWithCreators
└── types.ts                              # EXTEND List, OptimisticList, CreateListInput

src/lib/personas/
├── queries.ts                            # EXTEND .select(), add updatePersonaVisibility, getAllPersonasWithCreators, seedStarterPersonas
└── types.ts                              # EXTEND Persona, CreatePersonaInput, UpdatePersonaInput

src/app/[orgId]/lists/
├── actions.ts                            # EXTEND createListAction (visibility formData); NEW updateListVisibilityAction
├── [listId]/page.tsx                     # ADD badge + toggle dropdown (creator-or-admin only)
└── components/
    ├── create-list-dialog.tsx            # ADD segmented visibility control; makeTempList threads visibility
    └── list-grid.tsx                     # ADD badge + tooltip; OptimisticList + reducer unchanged shape

src/app/[orgId]/personas/
├── actions.ts                            # EXTEND createPersonaAction + updatePersonaAction; NEW updatePersonaVisibilityAction
└── components/
    ├── persona-form-dialog.tsx           # ADD segmented visibility control
    └── persona-card.tsx                  # ADD visibility chip near is_starter badge

src/app/[orgId]/team/workspace/           # NEW route
└── page.tsx                              # Admin-gated; tabs for Lists + Saved Searches

src/app/actions/
└── team.ts                               # EXTEND removeTeamMember (reassign hook, ~line 432)

src/types/
└── visibility.ts                         # NEW (D-07)

# Tests
src/lib/lists/__tests__/
└── lists-visibility.test.ts              # NEW (query-layer branch coverage, optional if reducer tests cover)

src/app/[orgId]/lists/components/__tests__/
└── list-grid.optimistic.test.tsx         # EXTEND: CREATE_PENDING carries visibility

src/app/[orgId]/personas/components/__tests__/
└── persona-optimistic.test.ts            # NEW: mirror list-grid pattern if personas gain a pure reducer

supabase/tests/                           # NEW directory (if approved by planner)
└── rls_visibility.sql                    # pgTAP-style smoke test (or JS harness)
```

### Pattern 1: Idempotent Postgres Migration Against Dashboard-Authored Schema

**What:** The `lists`, `personas`, and `list_members` tables were authored in the Supabase dashboard, not in migration files. Any migration must assume:
- Tables already exist (use `IF EXISTS` on ALTER)
- Columns may or may not exist (use `IF NOT EXISTS` on ADD COLUMN)
- Policies may or may not exist (use `DROP POLICY IF EXISTS` before every `CREATE POLICY`)
- Enum type may not exist (wrap `CREATE TYPE` in `DO $$...EXCEPTION WHEN duplicate_object THEN NULL;END$$`)

**When to use:** Every migration in this project. The pattern is already established in `20260412_rls_activity_log_personas.sql`.

**Example:**
```sql
-- Source: supabase/migrations/20260412_rls_activity_log_personas.sql
-- Enum creation — duplicate_object safe
DO $$ BEGIN
  CREATE TYPE visibility_mode AS ENUM ('personal', 'team_shared');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Column additions — idempotent
ALTER TABLE IF EXISTS lists
  ADD COLUMN IF NOT EXISTS visibility visibility_mode NOT NULL DEFAULT 'team_shared';

ALTER TABLE IF EXISTS lists
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS personas
  ADD COLUMN IF NOT EXISTS visibility visibility_mode NOT NULL DEFAULT 'team_shared';

-- Index additions — idempotent
CREATE INDEX IF NOT EXISTS idx_lists_tenant_creator
  ON lists(tenant_id, created_by);

CREATE INDEX IF NOT EXISTS idx_personas_tenant_creator
  ON personas(tenant_id, created_by);

-- RLS enable — idempotent
ALTER TABLE IF EXISTS lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS list_members ENABLE ROW LEVEL SECURITY;
-- personas already has RLS enabled per 20260412 migration

-- Policy recreation — DROP IF EXISTS + CREATE (no CREATE OR REPLACE POLICY in PG)
DROP POLICY IF EXISTS lists_tenant_visibility_select ON lists;
CREATE POLICY lists_tenant_visibility_select ON lists
  FOR SELECT TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (
         visibility = 'team_shared'
      OR created_by = auth.uid()
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
    )
  );
```

### Pattern 2: EXISTS-on-Parent RLS for Child Tables

**What:** Child tables (`list_members`, `saved_search_prospects`) don't duplicate `visibility`/`created_by`. Their RLS policy does an EXISTS subquery against the parent wrapper.

**When to use:** Whenever a child table's authorization is purely derived from its parent. Avoids denormalization and sync triggers.

**Example:**
```sql
-- Source: pattern derived from CONTEXT.md D-06
DROP POLICY IF EXISTS list_members_visibility_select ON list_members;
CREATE POLICY list_members_visibility_select ON list_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists l
      WHERE l.id = list_members.list_id
        AND l.tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
        AND (
             l.visibility = 'team_shared'
          OR l.created_by = auth.uid()
          OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
        )
    )
  );

-- INSERT variant: use the same EXISTS for WITH CHECK
DROP POLICY IF EXISTS list_members_visibility_insert ON list_members;
CREATE POLICY list_members_visibility_insert ON list_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists l
      WHERE l.id = list_members.list_id
        AND l.tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
        AND (
             l.visibility = 'team_shared'
          OR l.created_by = auth.uid()
          OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
        )
    )
  );
```

**Perf note:** The `idx_list_members_list_tenant` index already exists (`20260412_performance_indexes.sql`). The RLS planner will use it for the EXISTS lookup. For `saved_search_prospects`, `idx_ssp_search_id` covers the lookup.

### Pattern 3: Inline Admin Role Check (NOT `requireRole`) in Route Handlers

**What:** For pages/route handlers that require `tenant_admin` OR `super_admin` (not just a minimum role), use an inline check against `user.app_metadata.role` — not `requireRole()`.

**When to use:** New admin-only pages (e.g., `/team/workspace/page.tsx`) and new admin-only API routes. Matches Phase 04 locked decision + `src/app/[orgId]/team/page.tsx:57-60`.

**Example:**
```typescript
// Source: src/app/[orgId]/team/page.tsx:57-60
const role = user.app_metadata?.role as string | undefined;
if (role !== "tenant_admin" && role !== "super_admin") {
  redirect(`/${orgId}/dashboard`);
}
```

**Why not `requireRole("tenant_admin")`:** `requireRole()` uses `hasMinRole` which means `super_admin` passes (good) but also means `agent` + `assistant` are redirected to login (bad — they should go to dashboard). Inline check redirects to tenant dashboard, preserving the logged-in session. Also per STATE.md Phase 04: "Inline super_admin auth check in Route Handlers (not requireSuperAdmin) to avoid redirect() 500 in Route Handler context."

### Pattern 4: `getAuthenticatedUser` Wrapper in Server Actions

**What:** Existing pattern in `lists/actions.ts:16-36`. Wraps auth + tenant + role-floor check. New visibility actions use the same wrapper.

**When to use:** Every new `updateListVisibilityAction` / `updatePersonaVisibilityAction`.

**Example:**
```typescript
// Source: src/app/[orgId]/lists/actions.ts:16-36 (existing)
async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Not authenticated");
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    throw new Error("No tenant ID found in session");
  }

  // Phase 42 role floor — rejects assistant, allows agent/tenant_admin/super_admin
  await requireRole("agent");

  return { userId: user.id, tenantId };
}

// New action follows the same pattern
export async function updateListVisibilityAction(listId: string, visibility: Visibility) {
  try {
    const { tenantId } = await getAuthenticatedUser();
    await updateListVisibility(listId, tenantId, visibility);
    revalidatePath(`/[orgId]/lists`, "page");
    revalidatePath(`/[orgId]/lists/[listId]`, "page");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed" };
  }
}
```

**Authorization trust boundary:** Role floor is `agent`. The "creator or admin" check is enforced by **RLS** in the UPDATE USING clause — if a non-creator non-admin posts the action, the query updates zero rows and the function returns success with a no-op (or the planner can choose to error-on-zero-rows, but that's outside CONTEXT scope).

### Pattern 5: Optimistic Reducer with Visibility Threading

**What:** `listsOptimisticReducer` (`list-grid.tsx:47-98`) is a pure state machine. `OptimisticList = List & { __pending?: boolean }` — adding `visibility` to `List` automatically flows into `OptimisticList`. `makeTempList` in `create-list-dialog.tsx:45-57` must accept and thread `visibility` into the temp row so the badge renders correctly pre-confirm.

**When to use:** Every optimistic UI that currently renders a `List` field.

**Example:**
```typescript
// EXTEND: src/app/[orgId]/lists/components/create-list-dialog.tsx:45
function makeTempList(
  name: string,
  description: string | null,
  tenantId: string,
  visibility: Visibility,        // NEW — threaded from form state
  createdBy: string              // NEW — threaded from auth context
): OptimisticList {
  const now = new Date().toISOString();
  return {
    id: `temp-${crypto.randomUUID()}`,
    tenant_id: tenantId,
    name,
    description,
    visibility,                  // NEW
    created_by: createdBy,       // NEW — badge tooltip shows creator
    member_count: 0,
    created_at: now,
    updated_at: now,
    __pending: true,
  };
}
```

### Anti-Patterns to Avoid

- **Hand-rolling authorization in application code:** Do NOT add `if (user.id !== list.created_by && !isAdmin)` checks in query functions. RLS is the trust boundary. Application checks duplicate logic and drift.
- **Denormalizing visibility on child tables:** Do NOT add `visibility` or `created_by` to `list_members`. Sync triggers are a liability. CONTEXT D-06 locks EXISTS pattern.
- **Using admin client for user-facing reads:** Admin client bypasses RLS. Only use it for cross-user mutations (user removal reassign in D-13) or system operations (enrichment pipeline). Reads must use the session client.
- **`NOT NULL` on `lists.created_by`:** The column must be nullable so `ON DELETE SET NULL` works. Legacy rows with `NULL` created_by are acceptable — they're visible to admins via the role clause and to everyone if `visibility='team_shared'`.
- **Forgetting the starter persona seed override:** `seedStarterPersonas` must insert `visibility: 'team_shared'` explicitly, even though the column default supplies it. Protects against future seed reruns if default drifts (per CONTEXT specifics).
- **Late-binding visibility in optimistic create:** If `makeTempList` forgets `visibility`, the grid flashes the default team_shared badge for 300ms, then snaps to personal when the server responds. UX regression. Thread it through from the form.
- **Skipping `DROP POLICY IF EXISTS`:** Postgres has no `CREATE OR REPLACE POLICY`. Running the migration twice without DROP IF EXISTS errors with "policy already exists".

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-tenant isolation + per-user visibility | Per-query `.eq("created_by", userId).or("visibility.eq.team_shared")` chains | Postgres RLS policy (D-05) | RLS is the only trust boundary that survives bugs in application code. Supabase PostgREST respects it automatically. App-level filter drift will bite you. |
| Enum type safety | String literals scattered across files | `src/types/visibility.ts` shared type (D-07) + Postgres enum | Single source of truth; TypeScript catches typos; Postgres rejects invalid values at write time. |
| Role check for admin override | `if (role === "tenant_admin" \|\| role === "super_admin")` in every query | Inline the role check into the RLS USING clause (D-05) | Keeps application code role-agnostic for reads. Admins and agents execute the same query; RLS decides what they see. |
| Creator attribution lookup | Separate `getUser()` call per row in a loop | Supabase embedded select join: `.select("*, creator:users!created_by(full_name, email)")` | One round-trip, RLS-scoped, standard PostgREST pattern. |
| Cascade-on-user-delete behavior | Custom trigger to null out `created_by` | `REFERENCES auth.users(id) ON DELETE SET NULL` on the FK | Postgres FK actions are declarative and survive schema migrations. |
| Test harness for RLS | Hand-spinning Supabase admin clients with fake JWTs | `set_config('request.jwt.claims', '<json>', true)` in a psql session or pgTAP migration | Native Postgres way to simulate a JWT. Works in `supabase db query` or migration tests. |
| Optimistic UI state machine | Ad-hoc `setState` in dialog | Existing `listsOptimisticReducer` pure function (`list-grid.tsx:47-98`) — just pass visibility through | Already unit-tested. Phase 40 CONTEXT locks the pattern. |

**Key insight:** Every capability in this phase has a standard Postgres/Supabase/React primitive. The locked CONTEXT explicitly chose the standard primitives — research confirms no custom mechanism is warranted.

## Common Pitfalls

### Pitfall 1: Unknown dashboard-authored policies on `lists` / `list_members`

**What goes wrong:** The original `lists` + `list_members` tables were authored in the Supabase dashboard. They likely already have RLS policies (tenant-scope). Running `CREATE POLICY lists_tenant_visibility_select` without first dropping the existing `lists_tenant_select` (or whatever it's named) either (a) fails if the name collides, or (b) succeeds but leaves two policies stacked, where the OLD policy's USING clause remains additive/restrictive and overrides our visibility filter.

**Why it happens:** Supabase's default RLS policies generated from the dashboard use Supabase's own naming scheme. Our migration doesn't know those names.

**How to avoid:**
- **Discovery step (manual, before migration):** Run this query in Supabase SQL editor:
  ```sql
  SELECT schemaname, tablename, policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE tablename IN ('lists', 'list_members', 'personas', 'saved_search_prospects')
  ORDER BY tablename, policyname;
  ```
- Document every existing policy name in the plan, then add `DROP POLICY IF EXISTS <name> ON <table>;` for each before our new CREATE POLICY.
- Our new migration names should be unique and descriptive (e.g., `lists_tenant_visibility_select`, `lists_tenant_visibility_insert`, `lists_tenant_visibility_update`, `lists_tenant_visibility_delete`, `lists_super_admin_all`) to avoid collisions with unknown dashboard names.

**Warning signs:** After migration, an agent can still see another agent's `personal` list → extra policy is allowing it. Run `SELECT * FROM pg_policies WHERE tablename = 'lists'` to see all active policies. Expected count: 4 (select/insert/update/delete) + 1 super_admin catch-all = 5.

### Pitfall 2: `CREATE OR REPLACE POLICY` does not exist

**What goes wrong:** Planner writes `CREATE OR REPLACE POLICY` assuming Postgres supports it. Migration fails with syntax error.

**Why it happens:** Postgres has `CREATE OR REPLACE FUNCTION/VIEW/TRIGGER` but NOT `CREATE OR REPLACE POLICY`. [VERIFIED: PostgreSQL 15 docs `CREATE POLICY` synopsis has no `OR REPLACE`]

**How to avoid:** Always `DROP POLICY IF EXISTS <name> ON <table>;` before `CREATE POLICY <name> ON <table>`. Pattern is already canonical in `20260412_rls_activity_log_personas.sql`.

**Warning signs:** Migration error `syntax error at or near "REPLACE"`.

### Pitfall 3: `ON DELETE SET NULL` requires nullable column

**What goes wrong:** Planner writes `created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL`. When the referenced user is deleted, Postgres tries to set `created_by = NULL` which violates NOT NULL → DELETE fails.

**Why it happens:** Easy to conflate "most rows should have a creator" with "the column is never null". `ON DELETE SET NULL` is exactly the case where it MUST be nullable.

**How to avoid:** `lists.created_by` must be declared `UUID` (no NOT NULL) per D-04. Code paths that read `created_by` must handle `null` (e.g., admin workspace renders "—" for creator when null; visibility badge falls back to "Private" tooltip).

**Warning signs:** Removing a user fails with `null value in column "created_by" violates not-null constraint`.

### Pitfall 4: EXISTS subquery perf on large tenants

**What goes wrong:** A tenant with 100k+ `list_members` rows runs `SELECT * FROM list_members WHERE list_id = X` and the RLS planner evaluates the EXISTS for each row, doing a sequential scan on `lists` for every row.

**Why it happens:** Poorly indexed EXISTS clauses are row-by-row killers.

**How to avoid:**
- `idx_list_members_list_tenant` exists (`20260412_performance_indexes.sql:35`) — the EXISTS is looking up one row in `lists` by PK (indexed).
- The Postgres planner is smart enough to hoist EXISTS subqueries with correlated columns into a semi-join.
- If EXPLAIN ANALYZE shows a seq scan on `lists` inside the EXISTS, add a covering index: `CREATE INDEX idx_lists_id_visibility_creator ON lists(id) INCLUDE (tenant_id, visibility, created_by);` — but CONTEXT Claude's Discretion says do not speculatively add indexes.

**Warning signs:** List detail page load time increases from 120ms to 2s+ after migration. `EXPLAIN ANALYZE` shows `Seq Scan on lists` under the `SubPlan`.

### Pitfall 5: Optimistic `makeTempList` omits `visibility`

**What goes wrong:** User toggles "personal" → clicks "Create List" → dialog closes → grid flashes a "team_shared" badge for ~200ms → server confirms → badge snaps to "personal". Visible UX regression.

**Why it happens:** The temp row needs every field the real `List` type has. CONTEXT D-10 + Specifics explicitly call this out.

**How to avoid:** `makeTempList` signature adds `visibility: Visibility` and `createdBy: string` parameters. Dialog reads the visibility radio state AND the current user id (from a prop or `useUser` hook) and passes both. The `OptimisticList` type already extends `List` so no separate type work is needed if `List` gains `visibility` first.

**Warning signs:** Manual QA: toggle personal → create → see team_shared badge flash.

### Pitfall 6: `createAdminClient` bypasses RLS — critical for `removeTeamMember` reassign

**What goes wrong:** The acting admin (e.g., `tenant_admin`) is trying to reassign lists owned by a removed agent. With a session client, if a list is `personal` and created by the removed agent, the admin CAN see it (via the admin role clause) — so update would work. But if the implementation accidentally uses a session client and the admin is `super_admin` on a tenant they haven't scoped to, the RLS tenant_id filter would kick in and return zero rows silently.

**Why it happens:** Cross-user mutation where the caller may not be in the same tenant scope.

**How to avoid:** Use `createAdminClient()` for the reassign. This is explicit in CONTEXT D-13 (`admin.from("lists").update(...)`). The guards preceding the mutation (verified `tenantId`, target tenant check) constrain the blast radius.

**Warning signs:** After removing an agent, their `personal` lists still show their UUID as `created_by` and are invisible to everyone. Check: `SELECT id, name, created_by, visibility FROM lists WHERE tenant_id = 'X' AND created_by = '<removed-user-id>'` — should return zero rows if reassign fired.

### Pitfall 7: Starter personas skip visibility default

**What goes wrong:** If a future seed rerun drops/alters the `visibility` default, `seedStarterPersonas` silently inserts `NULL` which then fails NOT NULL, or inserts an unintended default. Starter personas become invisible or wrongly shared.

**Why it happens:** `seedStarterPersonas` currently doesn't set `visibility` and relies on the column default.

**How to avoid:** Per CONTEXT.md specifics — explicitly insert `visibility: 'team_shared'` in `seedStarterPersonas`. Belt-and-braces.

**Warning signs:** After a schema change, new tenants have missing starter personas.

### Pitfall 8: Sidebar counts leaking across users

**What goes wrong:** If `src/app/[orgId]/layout.tsx:57-66` used `createAdminClient()` instead of the session client, count queries would bypass RLS and show counts of lists/personas the user shouldn't see.

**Why it happens:** Copy-paste from admin routes.

**How to avoid:** **VERIFIED** in codebase — `src/app/[orgId]/layout.tsx:57-66` uses `supabase` (session client from `createClient()`). RLS applies. No change needed per D-16. [VERIFIED: read `src/app/[orgId]/layout.tsx` line 57-66]

**Warning signs:** Agent A sees "5 lists" in sidebar but only 3 in the grid.

### Pitfall 9: `getListMembers` inner join invisibility

**What goes wrong:** `getListMembers` in `queries.ts:131` does `.select("..., prospects(...)")` — an embedded select. If a `list_member` row points to a `prospect` that RLS filters out (e.g., wrong tenant), the join returns `prospects: []` and the caller's null-guard at line 201 kicks in. But if an admin is viewing a team-shared list that contains prospects from a different tenant (edge case — shouldn't happen, but check), the admin sees the member row with `prospect: null`.

**Why it happens:** Embedded joins respect RLS independently per table.

**How to avoid:** Not a change this phase introduces — `list_members.tenant_id = list.tenant_id` is an invariant. Flag for the verifier: confirm that when an admin views a shared list, all members render with prospect data.

**Warning signs:** Members appear in table with blank "Name" / "Company" columns.

### Pitfall 10: JWT claim path mismatch

**What goes wrong:** Policy uses `((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)` but the JWT actually carries `tenant_id` at the top level, not under `app_metadata`. Policy evaluates to NULL → tenant filter fails → user sees nothing.

**Why it happens:** Supabase JWTs have two places for custom claims: `app_metadata` (admin-controlled, immutable from client) and `user_metadata` (user-controlled). This project uses `app_metadata` per STATE.md Phase 1 decisions ("Role and tenant_id from app_metadata (immutable, server-side only)").

**How to avoid:** Match the existing idiom from `20260412_rls_activity_log_personas.sql` EXACTLY: `((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)` and `(auth.jwt() -> 'app_metadata' ->> 'role')`. CONTEXT D-05 locks this.

**Warning signs:** All queries return zero rows for authenticated users immediately after migration.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None found.** `lists` and `personas` rows exist in Postgres — they'll pick up the `team_shared` default via `ALTER TABLE … DEFAULT 'team_shared'`. No cache keys or Redis entries reference visibility. No mem0/vector store involvement. | No migration of existing rows needed beyond column default. Existing rows become `team_shared` automatically (correct — preserves status quo). |
| Live service config | **None.** No Inngest workflow or external service has `visibility` encoded in its configuration. The Inngest `enrich-prospect` function reads `lists`/`personas` but doesn't filter by visibility — that's correct (admin-equivalent system context). | None. |
| OS-registered state | **None.** No OS-level registrations reference the tables or columns being changed. | None. |
| Secrets / env vars | **None.** No env vars reference visibility or list ownership. `SUPABASE_SERVICE_ROLE_KEY` is used by `createAdminClient` (unchanged). | None. |
| Build artifacts / installed packages | **None.** TypeScript types are source-only; no generated artifacts. Next.js `.next` cache rebuilds on next deploy. | After merge + deploy, restart any long-running dev servers so `visibility` field on types is picked up. |

**Canonical question answered:** After every file in the repo is updated, **the only external runtime state that changes is Postgres schema** (new columns, new indexes, new policies, new FK) — and that's done by the migration itself. No downstream service needs reconfiguration.

## Code Examples

### RLS policy block for `lists` (select/insert/update/delete)

```sql
-- Source: derived from CONTEXT D-05 + existing 20260412_rls_activity_log_personas.sql idiom
ALTER TABLE IF EXISTS lists ENABLE ROW LEVEL SECURITY;

-- SELECT — tenant + visibility + admin override
DROP POLICY IF EXISTS lists_tenant_visibility_select ON lists;
CREATE POLICY lists_tenant_visibility_select ON lists
  FOR SELECT TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (
         visibility = 'team_shared'
      OR created_by = auth.uid()
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
    )
  );

-- INSERT — tenant + creator must be self (admin can still create team_shared for others by overriding created_by, but that's a separate flow)
DROP POLICY IF EXISTS lists_tenant_visibility_insert ON lists;
CREATE POLICY lists_tenant_visibility_insert ON lists
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND created_by = auth.uid()
  );

-- UPDATE — only creator or admin can update (RLS-enforced)
DROP POLICY IF EXISTS lists_tenant_visibility_update ON lists;
CREATE POLICY lists_tenant_visibility_update ON lists
  FOR UPDATE TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (
         created_by = auth.uid()
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  );

-- DELETE — only creator or admin
DROP POLICY IF EXISTS lists_tenant_visibility_delete ON lists;
CREATE POLICY lists_tenant_visibility_delete ON lists
  FOR DELETE TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (
         created_by = auth.uid()
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
    )
  );

-- Super-admin FOR ALL catch-all (matches existing 20260412 pattern)
DROP POLICY IF EXISTS lists_super_admin ON lists;
CREATE POLICY lists_super_admin ON lists
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );
```

### Getting lists with creator name (admin workspace)

```typescript
// NEW: src/lib/lists/queries.ts — getAllListsWithCreators
export async function getAllListsWithCreators(tenantId: string): Promise<ListWithCreator[]> {
  const supabase = await createClient();

  // Embedded select using FK constraint name. Supabase PostgREST infers
  // the relationship from lists.created_by -> users.id.
  const { data, error } = await supabase
    .from("lists")
    .select(`
      id,
      tenant_id,
      name,
      description,
      visibility,
      created_by,
      member_count,
      created_at,
      updated_at,
      creator:users!created_by (
        id,
        full_name,
        email
      )
    `)
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch all lists with creators: ${error.message}`);
  }

  return data as unknown as ListWithCreator[];
}
```

**RLS trust:** This function does NOT filter by visibility. It relies on the admin role clause in the RLS policy to yield all rows for admins. For a non-admin caller, RLS would filter — but the admin workspace route is gated with the role check before this function is even called.

### RLS smoke test harness (JS)

```typescript
// NEW: supabase/tests/rls_visibility.test.ts (or .claude skip path adjusted)
// Uses the admin client to switch JWT claims between calls.
// Requires a seed fixture: 2 agents + 1 admin + 1 personal list per agent + 1 team_shared list.

import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Helper: create a session-like client using a crafted JWT.
// In practice, use admin.auth.admin.createUser + getSession; omitted for brevity.

describe("RLS: lists visibility", () => {
  it("agent A sees team_shared + own personal, not agent B's personal", async () => {
    const clientA = createClient(url, anonKey, { auth: { persistSession: false } });
    // ...sign in as agent A (same tenant)...
    const { data } = await clientA.from("lists").select("id, visibility, created_by");
    const visibilities = data!.map((l) => l.visibility);
    expect(visibilities).toContain("team_shared");
    // Zero rows with created_by=agent-B-uuid and visibility=personal
    expect(data!.filter((l) => l.visibility === "personal" && l.created_by !== AGENT_A_ID)).toHaveLength(0);
  });

  it("admin sees all lists regardless of visibility", async () => {
    const clientAdmin = createClient(url, anonKey, { auth: { persistSession: false } });
    // ...sign in as tenant_admin...
    const { data } = await clientAdmin.from("lists").select("id, visibility");
    // Expect both personal lists + team_shared
    expect(data!.length).toBeGreaterThanOrEqual(3);
  });
});
```

**Alternative (pgTAP-style):** Write the test as a `.sql` file invoked via `supabase db query`:
```sql
-- supabase/tests/rls_visibility.sql
BEGIN;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"<agent-a-uuid>","app_metadata":{"tenant_id":"<tenant-uuid>","role":"agent"}}',
  true
);
SELECT plan(1);
SELECT results_eq(
  $$ SELECT count(*)::int FROM lists WHERE visibility = 'personal' AND created_by != '<agent-a-uuid>' $$,
  ARRAY[0],
  'agent A cannot see agent B personal lists'
);
SELECT * FROM finish();
ROLLBACK;
```

### User-removal reassign hook

```typescript
// EXTEND: src/app/actions/team.ts removeTeamMember — insert BEFORE line 432
// "admin.from('users').delete().eq('id', userId)"

// Reassign lists + personas owned by the removed user to the acting admin.
// Flip to team_shared so nothing becomes inaccessible.
// Admin client is required because cross-user mutation; tenantId was already
// verified in the guard above.
const { error: listReassignError } = await admin
  .from("lists")
  .update({ visibility: "team_shared", created_by: user.id })
  .eq("tenant_id", tenantId)
  .eq("created_by", userId);

if (listReassignError) {
  console.error("[removeTeamMember] list reassign failed:", listReassignError);
  return { error: `Failed to reassign lists: ${listReassignError.message}` };
}

const { error: personaReassignError } = await admin
  .from("personas")
  .update({ visibility: "team_shared", created_by: user.id })
  .eq("tenant_id", tenantId)
  .eq("created_by", userId);

if (personaReassignError) {
  console.error("[removeTeamMember] persona reassign failed:", personaReassignError);
  return { error: `Failed to reassign personas: ${personaReassignError.message}` };
}

// then fall through to the existing admin.from("users").delete().eq("id", userId)
```

**Belt-and-braces:** The FK `ON DELETE SET NULL` from D-04 ensures that if the reassign step fails (or is skipped in some future code path), the auth.users delete still succeeds and `created_by` becomes `NULL`. Admins would still see the rows (via role clause). Agents would lose visibility on personal rows owned by the deleted user — acceptable since their owner is gone.

### Visibility segmented control (Claude's discretion — example with two Buttons)

```tsx
// INSIDE: src/app/[orgId]/lists/components/create-list-dialog.tsx
// Above the name input in the dialog

import { Users, Lock } from "lucide-react";
import type { Visibility } from "@/types/visibility";

const [visibility, setVisibility] = useState<Visibility>("team_shared");

<div className="space-y-2">
  <Label>Visibility</Label>
  <input type="hidden" name="visibility" value={visibility} />
  <div className="flex gap-2">
    <button
      type="button"
      onClick={() => setVisibility("team_shared")}
      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[8px] text-[12px] cursor-pointer transition-all`}
      style={{
        background: visibility === "team_shared" ? "var(--gold-bg)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${visibility === "team_shared" ? "var(--border-gold)" : "rgba(255,255,255,0.08)"}`,
        color: visibility === "team_shared" ? "var(--gold-primary)" : "var(--text-secondary)",
      }}
    >
      <Users className="h-3.5 w-3.5" />
      Team shared
    </button>
    <button
      type="button"
      onClick={() => setVisibility("personal")}
      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[8px] text-[12px] cursor-pointer transition-all`}
      style={{
        background: visibility === "personal" ? "var(--gold-bg)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${visibility === "personal" ? "var(--border-gold)" : "rgba(255,255,255,0.08)"}`,
        color: visibility === "personal" ? "var(--gold-primary)" : "var(--text-secondary)",
      }}
    >
      <Lock className="h-3.5 w-3.5" />
      Personal
    </button>
  </div>
  <p className="text-xs text-muted-foreground">
    {visibility === "personal"
      ? "Only you and admins can see this list."
      : "Everyone on the team can see this list."}
  </p>
</div>
```

**Note:** This pattern matches `persona-card.tsx` + `create-list-dialog.tsx` style (inline-style CSS variables, gold accent on active state). Claude's discretion per D-11.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Every list/persona is tenant-wide | `visibility` flag toggles per-user scope | Phase 44 | Backward compatible — existing rows default to `team_shared` |
| `created_by` on personas only | `created_by` on both personas and lists | Phase 44 migration | Lists can now attribute ownership for reassign |
| Dashboard-authored RLS for lists | Migration-authored RLS for lists | Phase 44 migration | Brings `lists` RLS into version control, consistent with `20260412` pattern |
| App-level tenant filtering only (`.eq("tenant_id", ...)`) | RLS + app-level belt-and-braces | Gradual (established in Phase 1) | Phase 44 uses RLS as trust boundary for visibility per D-09 |

**Deprecated/outdated:**
- **None for this phase.** Visibility is additive.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `list_members` table exists in database even though CONTEXT says "ENABLE RLS on lists + list_members" (implying it may not have RLS yet) | Pitfall 1, Code Examples | Migration `ALTER TABLE IF EXISTS list_members ENABLE ROW LEVEL SECURITY` is idempotent-safe either way; if table doesn't exist, ALTER is a no-op [VERIFIED: `list_members` referenced in `src/lib/lists/queries.ts:131-165` as a real table] |
| A2 | Supabase JWT carries `app_metadata.role` (not `user_metadata.role`) | Pattern 3 | [VERIFIED: `src/app/[orgId]/team/page.tsx:57`, `src/app/[orgId]/layout.tsx:73`, and existing `20260412` migration all use `app_metadata` path. LOW risk.] |
| A3 | `auth.uid()` returns the authenticated user's UUID under Supabase Auth + RLS | RLS code examples | [VERIFIED: this is Supabase's documented primitive. HIGH confidence, no risk.] |
| A4 | The `saved_search_prospects` table exists with `persona_id` column | EXISTS-on-parent pattern | [VERIFIED: `supabase/migrations/20260405_saved_search_prospects.sql:6` — confirmed as `saved_search_id UUID NOT NULL REFERENCES personas(id)`. Note: column is `saved_search_id`, NOT `persona_id` — migration must use `saved_search_id` in the EXISTS subquery.] |
| A5 | `personas.created_by` is already NULLABLE (dashboard-authored) | Pitfall 3 | Dashboard-authored column nullability is unknown without inspection. Plan should include a defensive check: `SELECT is_nullable FROM information_schema.columns WHERE table_name='personas' AND column_name='created_by';`. If NOT NULL, migration must `ALTER COLUMN created_by DROP NOT NULL;`. Reassign in `removeTeamMember` SETS a new value, so this only matters for the FK cascade — if the FK doesn't have `ON DELETE SET NULL`, we need to align it. [MEDIUM risk — needs planner discovery step] |
| A6 | Existing `lists` table has a `tenant_id` column | Migration + RLS | [VERIFIED: `src/lib/lists/queries.ts:17,44,70,93` all filter by `tenant_id`. HIGH confidence.] |
| A7 | The EXISTS-on-parent pattern's performance will be acceptable at current scale | Pitfall 4 | Current tenants are small (single-digit users, <10k leads). Risk is LOW today. If tenants grow past 100k `list_members`, may need EXPLAIN ANALYZE review. [ASSUMED based on project scale] |
| A8 | `saved_search_prospects` RLS policies are authored in Supabase dashboard (per migration comment) | Pitfall 1 | [VERIFIED: `20260405_saved_search_prospects.sql:27-32` explicitly states "RLS policies configured in Supabase dashboard per project convention"] — discovery step needs to enumerate these exact policies. |
| A9 | No existing pgTAP / RLS test harness in repo | Validation Architecture | [VERIFIED: grep for `set_config\('request.jwt.claims'` returned 0 matches except CONTEXT.md. No prior harness — Wave 0 must build from scratch.] |
| A10 | User-removal reassign races are not a concern at current user-removal frequency | D-13 hook | User removal is rare (admin action, not automated). Race with concurrent writes is theoretical. [ASSUMED — flag for verifier if it's an issue] |

**Action for planner:** The migration plan MUST include a discovery step (manual SQL query against Supabase dashboard) BEFORE writing the policy DROPs. Capture A5 and A8 findings in a pre-migration artifact.

## Open Questions (RESOLVED)

1. **What are the exact existing policy names on `lists`, `list_members`, `saved_search_prospects`?**
   - **RESOLVED:** Deferred to runtime discovery in Plan 44-01 Task 1 (pg_policies query before migration authored; task is `checkpoint:human-action gate=blocking`).
   - What we know: CONTEXT states these were authored in the dashboard. Migration `20260412` only handles `personas` and `activity_log`.
   - What's unclear: Policy names that must be dropped before our `CREATE POLICY` calls.
   - Recommendation: Plan 01 (migration) includes a mandatory pre-step: run `SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('lists','list_members','saved_search_prospects')` against production/staging Supabase and record results in the plan file. Then the DROP IF EXISTS list is explicit, not speculative.

2. **Is `personas.created_by` currently NULLABLE?**
   - **RESOLVED:** Deferred to runtime discovery in Plan 44-01 Task 1 (information_schema.columns query; task is `checkpoint:human-action gate=blocking`).
   - What we know: `src/lib/personas/queries.ts:49` always supplies a value (`userId`). So no existing rows have NULL. But the column nullability is unknown.
   - What's unclear: Whether the FK action on `auth.users` delete is set to `SET NULL`, `CASCADE`, or `RESTRICT`.
   - Recommendation: Plan 01 includes `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='personas' AND column_name='created_by';` and `SELECT constraint_name, delete_rule FROM information_schema.referential_constraints WHERE constraint_name LIKE '%personas%created_by%';`. If either differs from D-04 expectations, add `ALTER COLUMN ... DROP NOT NULL` + `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT ... REFERENCES auth.users(id) ON DELETE SET NULL`.

3. **What component does the list detail page header use for the visibility toggle dropdown?**
   - **RESOLVED:** Planner picks shadcn `DropdownMenu` per CONTEXT Claude's Discretion #1.
   - What we know: CONTEXT D-11 says "Dropdown that calls `updateListVisibilityAction`". Codebase has `@radix-ui/react-dropdown-menu` in package.json + `src/components/ui/dropdown-menu.tsx`.
   - What's unclear: Whether to render inline radios or a proper dropdown menu.
   - Recommendation: Use the existing `DropdownMenu` component from `@/components/ui/dropdown-menu` — matches `team-member-actions` pattern. Trigger is the visibility badge itself (click-to-toggle).

4. **Should the optional sidebar nav entry for the admin workspace (D-12) ship in this phase?**
   - **RESOLVED:** Shipping the nav entry per recommendation; gated to tenant_admin/super_admin in Plan 44-06 Task 2.
   - What we know: CONTEXT Claude's Discretion says "acceptable to ship or skip per reviewer call. Default: yes, gated to tenant_admin/super_admin".
   - Recommendation: Ship it — it's a 10-line change to `nav-items.tsx`. Without it, admins have to know the URL.

5. **Do we need a `personas-optimistic.test.ts` analog to `list-grid.optimistic.test.tsx`?**
   - **RESOLVED:** Deferred; personas use in-place state updates (no reducer). Regression for `persona.visibility` flow covered by Plan 44-06 admin workspace action test.
   - What we know: `PersonaCardGrid` uses plain `setState` (no pure reducer) for optimistic create/delete.
   - What's unclear: Whether Phase 44 should refactor to a reducer or stay with the ad-hoc approach.
   - Recommendation: Do NOT refactor this phase. The visibility field threads cleanly into `PersonaCardGrid`'s existing state. Add visibility-threading assertions if a reducer is extracted later.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL 15+ | Migration (enum, RLS, FK) | ✓ (Supabase default) | 15+ | — |
| `@supabase/ssr` session client | Server actions + admin role checks | ✓ | 0.8.0 | — |
| `@supabase/supabase-js` admin client | `removeTeamMember` reassign | ✓ | 2.95.3 | — |
| `vitest` | Reducer unit tests + RLS smoke tests | ✓ | 4.0.18 | — |
| Supabase CLI / SQL editor for `pg_policies` discovery | Pre-migration audit | ✓ (manual via dashboard) | — | Ask user to run the SQL in Supabase SQL editor |
| `SUPABASE_SERVICE_ROLE_KEY` env var | `createAdminClient()` in reassign hook | ✓ in Vercel, ✗ locally (per MEMORY.md) | — | Use Vercel preview deploy for E2E; or ask user to provide fresh service role key for `.env.local` |
| Test user fixtures (two agents + one admin in same tenant) | RLS smoke tests | ✗ (must seed) | — | Add fixture setup in `supabase/tests/seed-visibility.sql` or skip E2E RLS tests for this phase and rely on manual QA |

**Missing dependencies with no fallback:** None blocking — every required tool is available.

**Missing dependencies with fallback:**
- Local `SUPABASE_SERVICE_ROLE_KEY` is stale (per user MEMORY.md). For any test that needs the admin client locally, either (a) use the error log admin UI route to verify side effects, or (b) ship and verify on Vercel preview. Do NOT block implementation on this.
- RLS smoke tests require seeded test users. Either seed in `supabase/tests/seed-visibility.sql` or do manual QA with real user accounts on a staging tenant. Recommendation: start with manual QA (Maggie-style acceptance test) and add automated pgTAP tests only if reviewer requires.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 (node environment, ESM) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- --run src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx` |
| Full suite command | `pnpm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIS-01 | `visibility` column present with correct default | migration verification | `supabase db diff` or manual SQL query after migrate | Manual verification step in migration plan |
| VIS-02 | `lists.created_by` nullable FK with `ON DELETE SET NULL` | migration verification | `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='lists' AND column_name='created_by'` + `information_schema.referential_constraints` | Manual SQL |
| VIS-03 | RLS policies enforce tenant + visibility + admin | RLS smoke test | `pnpm test -- --run src/lib/lists/__tests__/rls-visibility.test.ts` | ❌ Wave 0 (new file) |
| VIS-04 | createListAction accepts + persists visibility | integration | `pnpm test -- --run src/app/[orgId]/lists/__tests__/actions-visibility.test.ts` | ❌ Wave 0 (new file; optional if manual QA acceptable) |
| VIS-05 | updateListVisibilityAction rejects non-creator non-admin | RLS smoke test | Same as VIS-03 | ❌ Wave 0 |
| VIS-06 | Visibility badge renders lock/users icon correctly | manual-only (visual QA) | Open list grid, toggle visibility, observe icon | Manual |
| VIS-07 | Admin workspace renders all tenant lists + personas | integration (smoke) | Navigate to `/team/workspace` as admin | Manual |
| VIS-08 | removeTeamMember reassigns ownership | integration | `pnpm test -- --run src/app/actions/__tests__/team-remove-reassign.test.ts` | ❌ Wave 0 |
| VIS-09 | Optimistic badge shows correct visibility pre-confirm | unit (reducer) | `pnpm test -- --run src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx` | ✅ EXTEND existing |
| VIS-10 | Sidebar counts respect visibility | manual-only | Open sidebar as agent A, verify counts match visible rows | Manual — no automated test; visual regression |
| VIS-11 | Migration idempotent (run twice) | migration verification | Run migration SQL twice; second run is no-op (no errors) | Manual |
| VIS-12 | `seedStarterPersonas` inserts with visibility | unit | `pnpm test -- --run src/lib/personas/__tests__/seed-starter.test.ts` | ❌ Wave 0 (new file) |

### Sampling Rate

- **Per task commit:** `pnpm test -- --run src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx` (existing suite must remain green while visibility threads through)
- **Per wave merge:** `pnpm test -- --run` (full suite) + manual QA pass on two-agent tenant
- **Phase gate:** Full suite green + manual RLS verification on Vercel preview (create personal list as Agent A → confirm invisible to Agent B → admin sees both)

### Wave 0 Gaps

- [ ] `src/types/visibility.ts` — covers D-07 shared type (MUST exist before any query/type edits)
- [ ] `src/lib/lists/__tests__/rls-visibility.test.ts` — covers VIS-03, VIS-05 (RLS smoke harness)
- [ ] `src/lib/personas/__tests__/seed-starter.test.ts` — covers VIS-12
- [ ] `src/app/actions/__tests__/team-remove-reassign.test.ts` — covers VIS-08
- [ ] Test fixture setup helper — shared utility for seeding two-agents + one-admin tenant (if reviewer requires automation instead of manual)
- [ ] Manual QA checklist document in plan — covers VIS-06, VIS-07, VIS-10, VIS-11 (visual/migration items that don't automate well)

**Wave 0 minimum viable:** `src/types/visibility.ts` + the migration discovery SQL output captured in the plan. Everything else can be iterative.

## Security Domain

`security_enforcement` is not set to `false` in `.planning/config.json` — treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (existing); no changes |
| V3 Session Management | yes | JWT + cookie via `@supabase/ssr` (existing) |
| V4 Access Control | **yes — primary focus** | Postgres RLS on `lists`, `list_members`, `personas`, `saved_search_prospects`. Role-based admin override via JWT `app_metadata.role`. Inline role check in new `/team/workspace` route. |
| V5 Input Validation | yes | Visibility enum values validated at DB level (Postgres enum rejects invalid). Server actions should guard against malformed formData but RLS is the trust boundary. |
| V6 Cryptography | no | No new crypto in this phase |
| V8 Data Protection | yes | Visibility enforces per-user data scoping. Leads stay tenant-wide per D-01 (no data protection regression). |

### Known Threat Patterns for {Supabase + Next.js + RLS} stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| JWT tampering to claim admin role | Spoofing / EoP | `app_metadata` is server-only, cannot be modified by client. Existing control. [VERIFIED: STATE.md Phase 1 locked decision] |
| SQL injection in policy expressions | Tampering | Parameterized values (`auth.uid()`, `auth.jwt()`) are safe. No string interpolation in policies. |
| Privilege escalation via admin-client misuse | EoP | `createAdminClient` only called in server actions with verified role guards; never imported in client components (file comment warning). [VERIFIED: `src/lib/supabase/admin.ts`] |
| RLS bypass via misused embedded select | Info Disclosure | PostgREST applies RLS per table in embedded selects. `getListMembers` inner join correctly filters at each layer. |
| Missing DROP POLICY IF EXISTS leaves stale policy | Info Disclosure | Explicit migration pattern (Pitfall 1 + Pattern 1) |
| FK cascade behavior leaks identity | Info Disclosure | `ON DELETE SET NULL` removes `created_by` link when user deleted. No other row data leaks. |
| Cross-tenant row injection via WITH CHECK bypass | Tampering | INSERT policy enforces `tenant_id = JWT claim AND created_by = auth.uid()`. User cannot insert rows for other tenants or falsely claim another user's authorship. |
| Admin workspace shows rows from another tenant | Info Disclosure | `super_admin` policy gives all-tenant access (intentional for platform admins). `tenant_admin` only sees their tenant via the tenant-scope clause. No cross-tenant leak. |

## Sources

### Primary (HIGH confidence)

- `supabase/migrations/20260412_rls_activity_log_personas.sql` — canonical RLS idiom (JWT claim extraction, DROP/CREATE policy pattern, is_starter preservation, super_admin catch-all)
- `supabase/migrations/20260405_saved_search_prospects.sql` — confirms `saved_search_prospects` table schema, parent FK is `saved_search_id` (not `persona_id`), dashboard-authored RLS
- `supabase/migrations/20260412_performance_indexes.sql` — confirms existing indexes on `lists`, `list_members`, `personas` that affect EXISTS perf
- `src/lib/lists/queries.ts` — current CRUD shape, `.select()` patterns to extend, `createList` writes `created_by`
- `src/lib/personas/queries.ts` — `seedStarterPersonas` pattern at line 118-156
- `src/app/[orgId]/lists/actions.ts` — `getAuthenticatedUser` wrapper pattern at lines 16-36, used by all 6 existing actions
- `src/app/[orgId]/personas/actions.ts` — parallel persona action pattern
- `src/app/[orgId]/team/page.tsx:57-60` — inline admin role check pattern
- `src/app/[orgId]/layout.tsx:57-66` — session-client count queries (verified RLS-compatible)
- `src/app/actions/team.ts` — `removeTeamMember` at lines 372-438 with existing last-admin guard
- `src/app/[orgId]/lists/components/list-grid.tsx:47-98` — `listsOptimisticReducer` pure state machine
- `src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx` — existing reducer test pattern
- `src/app/[orgId]/lists/components/create-list-dialog.tsx:45-57` — `makeTempList` helper
- `src/types/auth.ts` — `UserRole` enum + permissions matrix
- `src/lib/supabase/admin.ts` — admin client warning + implementation
- `package.json` — verified versions of all dependencies
- `vitest.config.ts` — node environment, ESM, excludes `.claude/**`
- `.planning/STATE.md` — Phase 04 locked decision: inline admin check vs `requireRole`

### Secondary (MEDIUM confidence)

- PostgreSQL docs (training knowledge): `CREATE POLICY` has no `IF NOT EXISTS` / `OR REPLACE` variant — requires `DROP POLICY IF EXISTS` + `CREATE POLICY` [CITED: PostgreSQL 15 DDL reference, supported by existing migration idiom in repo]
- Supabase docs (training knowledge): `auth.uid()` and `auth.jwt()` are provided SQL functions inside RLS policies [CITED: Supabase RLS guide, supported by `20260412` migration usage]
- React optimistic update pattern (Phase 40 STATE.md): `listsOptimisticReducer` is pure and unit-testable, `OptimisticList = List & { __pending?: boolean }` [VERIFIED in codebase]

### Tertiary (LOW confidence / flagged for validation)

- **Policy-existence on `lists` / `list_members` / `saved_search_prospects` tables:** Assumed dashboard-authored policies exist. Not verified — migration plan MUST include a discovery step to enumerate via `pg_policies`.
- **`personas.created_by` nullability and FK cascade behavior:** Not verified in migrations (dashboard-authored). Migration plan MUST include discovery step.
- **EXISTS subquery perf at >100k rows:** Assumed acceptable based on current tenant scale. Not benchmarked.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package verified in `package.json`, every architectural primitive (RLS, FK, optimistic reducer) already in repo
- Architecture: HIGH — CONTEXT.md locks every major decision; research verified the codebase supports them
- Pitfalls: HIGH for codebase-visible pitfalls; MEDIUM for dashboard-authored state (requires discovery step)
- Validation: MEDIUM — no existing RLS smoke test harness in repo; Wave 0 must build from scratch
- Security: HIGH — RLS is the standard mitigation for every applicable threat

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (30 days — stable stack, no fast-moving deps)
