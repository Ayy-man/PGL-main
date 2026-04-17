# Phase 44: List & Saved-Search Visibility — Pattern Map

**Mapped:** 2026-04-17
**Files analyzed:** 19 (5 new, 14 modified)
**Analogs found:** 19 / 19 (all have concrete in-repo analogs)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/20260417_list_search_visibility.sql` | migration (DDL + RLS) | schema-mutation | `supabase/migrations/20260412_rls_activity_log_personas.sql` | exact — same JWT idiom, DROP IF EXISTS + CREATE pattern |
| `src/types/visibility.ts` | shared type | n/a (pure type) | `src/types/auth.ts` | role-match (tiny shared literal-union file) |
| `src/lib/lists/types.ts` (MOD) | type | n/a | itself (extend `List`, `CreateListInput`) | self-extension |
| `src/lib/lists/queries.ts` (MOD) | query (DB access) | CRUD (Supabase session client) | itself + `src/lib/personas/queries.ts:42-63` for embedded FK join pattern | self-extension + sibling pattern |
| `src/lib/personas/types.ts` (MOD) | type | n/a | itself | self-extension |
| `src/lib/personas/queries.ts` (MOD) | query | CRUD | itself + mirror of `src/lib/lists/queries.ts` | self-extension |
| `src/app/[orgId]/lists/actions.ts` (MOD) | server action | request-response | itself + `createListAction` at L38-64 as template | self-extension |
| `src/app/[orgId]/personas/actions.ts` (MOD) | server action | request-response | itself | self-extension |
| `src/app/[orgId]/lists/components/create-list-dialog.tsx` (MOD) | client UI (dialog) | optimistic create | itself — extend `makeTempList` + add segmented control | self-extension |
| `src/app/[orgId]/lists/components/list-grid.tsx` (MOD) | client UI (grid) | optimistic state | itself + `persona-card.tsx` for `is_starter` badge pattern | self-extension |
| `src/app/[orgId]/lists/[listId]/page.tsx` (MOD) | server component (page) | request-response | itself + `src/app/[orgId]/team/page.tsx:57-60` for admin role check | self-extension + sibling |
| `src/app/[orgId]/personas/components/persona-form-dialog.tsx` (MOD) | client UI (dialog) | create/update | itself | self-extension |
| `src/app/[orgId]/personas/components/persona-card.tsx` (MOD) | client UI (card) | render | itself — extend badge row | self-extension |
| `src/app/[orgId]/team/workspace/page.tsx` (NEW) | server component (admin page) | read + list | `src/app/[orgId]/team/page.tsx` | exact — same inline admin check, same admin-table chrome |
| `src/app/[orgId]/team/page.tsx` (MOD) | server component | render | itself (header area, just add link) | self-extension |
| `src/app/actions/team.ts` (MOD) | server action (admin client) | cross-user mutation | itself — insert hook inside `removeTeamMember` at L431 before `admin.from("users").delete()` | self-extension |
| `src/components/layout/nav-items.tsx` (MOD — optional) | client UI (nav) | render | itself — copy `Team` entry pattern at L42 | self-extension |
| `src/app/[orgId]/lists/__tests__/actions.test.ts` (MOD) | test (Vitest node) | mock-and-assert | itself — extend; template at L100-340 | self-extension |
| `src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx` (MOD) | test (pure reducer) | state transitions | itself — extend `makePending` fixture + assertions | self-extension |
| `src/app/[orgId]/personas/__tests__/actions.test.ts` (MOD) | test (Vitest node) | mock-and-assert | itself | self-extension |
| `src/app/actions/__tests__/team.test.ts` (NEW) | test (Vitest node) | mock-and-assert | `src/app/[orgId]/lists/__tests__/actions.test.ts` | role-match (same Vitest mock pattern, different SUT) |

---

## Pattern Assignments

### 1. `supabase/migrations/20260417_list_search_visibility.sql` (NEW — migration)

**Analog:** `supabase/migrations/20260412_rls_activity_log_personas.sql`

**Header comment + idempotent ALTER pattern** (analog L1-10, 38-52):
```sql
-- Phase: Broken Actions Audit — Group A (Missing RLS Policies)
-- Uses DROP IF EXISTS + CREATE for idempotency (PG < 15 compat).

ALTER TABLE IF EXISTS personas ENABLE ROW LEVEL SECURITY;
```
Phase 44 variant: prepend `DO $$ BEGIN CREATE TYPE visibility_mode AS ENUM ('personal','team_shared'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;` and add idempotent `ALTER TABLE IF EXISTS lists ADD COLUMN IF NOT EXISTS visibility ... DEFAULT 'team_shared'` / `created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`.

**JWT-claim tenant-scope idiom** (analog L41-45, copy verbatim):
```sql
DROP POLICY IF EXISTS personas_tenant_select ON personas;
CREATE POLICY personas_tenant_select ON personas
  FOR SELECT TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  );
```
New policy extends the USING clause with the visibility predicate per D-05:
```sql
USING (
  tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  AND (
       visibility = 'team_shared'
    OR created_by = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin','super_admin')
  )
);
```

**INSERT WITH CHECK pattern** (analog L47-52):
```sql
DROP POLICY IF EXISTS personas_tenant_insert ON personas;
CREATE POLICY personas_tenant_insert ON personas
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  );
```
Phase 44 variant: append `AND created_by = auth.uid()`.

**Super-admin FOR ALL catch-all** (analog L72-77 — copy verbatim, rename):
```sql
DROP POLICY IF EXISTS personas_super_admin ON personas;
CREATE POLICY personas_super_admin ON personas
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );
```

**Preserve existing `is_starter = false` delete guard** (analog L64-70):
```sql
DROP POLICY IF EXISTS personas_tenant_delete ON personas;
CREATE POLICY personas_tenant_delete ON personas
  FOR DELETE TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND is_starter = false
  );
```
Phase 44 DELETE policy must keep `is_starter = false` (per CONTEXT D-05) and AND it with the creator/admin clause.

---

### 2. `src/types/visibility.ts` (NEW — shared type)

**Analog:** `src/types/auth.ts`

**Imports pattern** (analog L1 — literal union + helper):
```typescript
export type UserRole = 'super_admin' | 'tenant_admin' | 'agent' | 'assistant';
```

**Phase 44 equivalent:**
```typescript
// src/types/visibility.ts
export type Visibility = 'personal' | 'team_shared';

export const VISIBILITY_VALUES: readonly Visibility[] = ['personal', 'team_shared'] as const;

export function isVisibility(v: string): v is Visibility {
  return v === 'personal' || v === 'team_shared';
}
```
Rationale: `src/types/auth.ts` is the canonical precedent for a tiny literal-union type co-located under `src/types/`. Same file size, same role (shared across `lists` + `personas` modules).

---

### 3. `src/lib/lists/types.ts` (MOD — extend `List` + `CreateListInput`)

**Analog:** itself (self-extension) + `src/lib/personas/types.ts:13-26`

**Existing `List` shape** (analog L3-11):
```typescript
export interface List {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
  updated_at: string;
}
```

**Extension:**
```typescript
import type { Visibility } from "@/types/visibility";

export interface List {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  member_count: number;
  visibility: Visibility;          // NEW
  created_by: string | null;       // NEW — nullable per D-04 ON DELETE SET NULL
  created_at: string;
  updated_at: string;
}

export interface CreateListInput {
  name: string;
  description?: string;
  visibility?: Visibility;         // NEW — default 'team_shared' in createList()
}

// NEW: for getAllListsWithCreators (admin workspace join)
export interface ListWithCreator extends List {
  creator: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}
```
Persona type already carries `created_by: string` (L20) — mirror pattern but lists uses `string | null` for FK SET NULL tolerance.

---

### 4. `src/lib/lists/queries.ts` (MOD — extend selects + add 2 functions)

**Analog:** itself (L31-115 for existing pattern) + `src/lib/personas/queries.ts:42-63` for created_by insert

**Existing select shape** (analog L34-46 — extend with visibility + created_by):
```typescript
const { data, error } = await supabase
  .from("lists")
  .select(`
    id,
    tenant_id,
    name,
    description,
    member_count,
    created_at,
    updated_at
  `)
  .eq("tenant_id", tenantId)
  .order("updated_at", { ascending: false });
```
Every `.select(...)` in lines 34-46, 60-68, 99-107, 252-277, 425-430 must add `visibility, created_by`.

**Existing createList signature** (analog L83-115 — extend with visibility):
```typescript
export async function createList(
  tenantId: string,
  userId: string,
  input: CreateListInput
): Promise<List> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lists")
    .insert({
      tenant_id: tenantId,
      name: input.name,
      description: input.description || null,
      created_by: userId,
      member_count: 0
    })
    .select(`id, tenant_id, name, description, member_count, created_at, updated_at`)
    .single();
  if (error) throw new Error(`Failed to create list: ${error.message}`);
  return data as List;
}
```
Extension: add `visibility: input.visibility ?? 'team_shared'` to insert payload; add `visibility, created_by` to select list.

**NEW `updateListVisibility` pattern** (mirror of analog L104-115 `updateMemberStatus` at L379-397):
```typescript
export async function updateListVisibility(
  id: string,
  tenantId: string,
  visibility: Visibility
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lists")
    .update({ visibility, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(`Failed to update list visibility: ${error.message}`);
}
```
RLS on the UPDATE policy (D-05) is the trust boundary — caller does NOT check creator/admin in JS.

**NEW `getAllListsWithCreators` pattern** (mirror `getListsForProspect` embedded join at analog L417-450 combined with 44-RESEARCH.md:700-734):
```typescript
export async function getAllListsWithCreators(tenantId: string): Promise<ListWithCreator[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lists")
    .select(`
      id, tenant_id, name, description, visibility, created_by,
      member_count, created_at, updated_at,
      creator:users!created_by ( id, full_name, email )
    `)
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch all lists with creators: ${error.message}`);
  return data as unknown as ListWithCreator[];
}
```
**RLS trust**: function does not filter by visibility; relies on admin-role clause in RLS policy (per CONTEXT specifics "Admin workspace RLS reliance").

---

### 5. `src/lib/personas/queries.ts` (MOD — mirror lists)

**Analog:** itself (L42-63 createPersona) + mirror of `src/lib/lists/queries.ts` additions

**Existing createPersona insert pattern** (analog L45-56 — already writes `created_by`):
```typescript
const { data, error } = await supabase
  .from("personas")
  .insert({
    tenant_id: tenantId,
    created_by: userId,
    name: input.name,
    description: input.description || null,
    filters: input.filters,
    is_starter: false
  })
  .select()
  .single();
```
Extension: add `visibility: input.visibility ?? 'team_shared'` to insert payload. `.select()` (no explicit column list) auto-returns all columns including new `visibility` — no select changes needed for personas.

**Starter seed override** (analog L118-156 — MUST add `visibility: 'team_shared'` explicitly per CONTEXT specifics):
```typescript
const personasToInsert = STARTER_PERSONAS
  .filter(persona => !existingNames.has(persona.name))
  .map(persona => ({
    tenant_id: tenantId,
    created_by: userId,
    name: persona.name,
    description: persona.description || null,
    filters: persona.filters,
    is_starter: true,
    visibility: 'team_shared' as const,   // NEW — belt-and-braces per CONTEXT specifics
  }));
```

**NEW `updatePersonaVisibility` + `getAllPersonasWithCreators`** — mirror the lists additions above, same signatures and RLS-trust philosophy.

---

### 6. `src/app/[orgId]/lists/actions.ts` (MOD — extend createListAction + add updateListVisibilityAction)

**Analog:** itself (L16-36 `getAuthenticatedUser` wrapper, L38-64 `createListAction`)

**Auth wrapper pattern** (analog L16-36 — copy verbatim, already exists):
```typescript
async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) throw new Error("No tenant ID found in session");
  await requireRole("agent");   // phase 42 role floor
  return { userId: user.id, tenantId };
}
```

**Existing createListAction** (analog L38-64):
```typescript
export async function createListAction(formData: FormData) {
  try {
    const { userId, tenantId } = await getAuthenticatedUser();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;
    if (!name || name.trim().length === 0) throw new Error("List name is required");
    const list = await createList(tenantId, userId, {
      name: name.trim(),
      description: description?.trim() || undefined
    });
    revalidatePath(`/[orgId]/lists`, "page");
    return { success: true, list };
  } catch (error) {
    console.error("Failed to create list:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create list" };
  }
}
```
Extension: read `visibility` from formData, validate against `isVisibility(...)` from `@/types/visibility`, pass into `createList` call.

**NEW updateListVisibilityAction** (follow the `deleteListAction` shape at L66-82):
```typescript
export async function updateListVisibilityAction(listId: string, visibility: Visibility) {
  try {
    const { tenantId } = await getAuthenticatedUser();
    if (!isVisibility(visibility)) throw new Error("Invalid visibility value");
    await updateListVisibility(listId, tenantId, visibility);
    revalidatePath(`/[orgId]/lists`, "page");
    revalidatePath(`/[orgId]/lists/[listId]`, "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to update list visibility:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed" };
  }
}
```
**Trust boundary:** creator/admin check is RLS (D-05 UPDATE USING), NOT JS.

---

### 7. `src/app/[orgId]/personas/actions.ts` (MOD — mirror lists)

**Analog:** itself (L14-106 `createPersonaAction`, L108-175 `updatePersonaAction`)

**Difference vs lists/actions:** persona actions use inline `supabase.auth.getUser()` (L17-26) instead of a shared `getAuthenticatedUser` helper. Visibility plumbing: read `formData.get("visibility")`, validate via `isVisibility`, default to `'team_shared'`, merge into `CreatePersonaInput` / `UpdatePersonaInput`. New `updatePersonaVisibilityAction` follows same shape as new `updateListVisibilityAction` above, with `revalidatePath("/[orgId]/personas")`.

---

### 8. `src/app/[orgId]/lists/components/create-list-dialog.tsx` (MOD — segmented control + optimistic thread)

**Analog:** itself (L45-57 `makeTempList`, L59-163 dialog body)

**Existing `makeTempList`** (analog L45-57):
```typescript
function makeTempList(name: string, description: string | null, tenantId: string): OptimisticList {
  const now = new Date().toISOString();
  return {
    id: `temp-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
    tenant_id: tenantId,
    name,
    description,
    member_count: 0,
    created_at: now,
    updated_at: now,
    __pending: true,
  };
}
```
Extension (per CONTEXT D-10 + RESEARCH.md Pattern 5):
```typescript
function makeTempList(
  name: string,
  description: string | null,
  tenantId: string,
  visibility: Visibility,   // NEW
  createdBy: string | null, // NEW (from auth context or prop)
): OptimisticList {
  const now = new Date().toISOString();
  return {
    id: `temp-${...}`,
    tenant_id: tenantId,
    name,
    description,
    member_count: 0,
    visibility,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
    __pending: true,
  };
}
```

**Segmented visibility control** (copy from RESEARCH.md:832-880 — inline-style, gold-accent, matches `persona-card.tsx` ghost/gold button pattern at `persona-card.tsx:222-231`):
```tsx
import { Users, Lock } from "lucide-react";
import type { Visibility } from "@/types/visibility";

const [visibility, setVisibility] = useState<Visibility>("team_shared");

<div className="space-y-2">
  <Label>Visibility</Label>
  <input type="hidden" name="visibility" value={visibility} />
  <div className="flex gap-2">
    <button type="button" onClick={() => setVisibility("team_shared")}
      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[8px] text-[12px] cursor-pointer transition-all"
      style={{
        background: visibility === "team_shared" ? "var(--gold-bg)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${visibility === "team_shared" ? "var(--border-gold)" : "rgba(255,255,255,0.08)"}`,
        color: visibility === "team_shared" ? "var(--gold-primary)" : "var(--text-secondary)",
      }}>
      <Users className="h-3.5 w-3.5" /> Team shared
    </button>
    <button type="button" onClick={() => setVisibility("personal")}
      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[8px] text-[12px] cursor-pointer transition-all"
      style={{ background: visibility === "personal" ? "var(--gold-bg)" : "rgba(255,255,255,0.03)", ... }}>
      <Lock className="h-3.5 w-3.5" /> Personal
    </button>
  </div>
</div>
```
Anchor in the existing form body at analog L129-150 (between Name and Description, or above Name).

**handleSubmit threading** (analog L64-111) — no signature change for the dialog, but `makeTempList` call at analog L75 must pass the `visibility` state + a `createdBy` prop (dialog receives `currentUserId` from the page).

---

### 9. `src/app/[orgId]/lists/components/list-grid.tsx` (MOD — badge + tooltip)

**Analog:** itself (L247-359 row rendering, L256-268 name + pending block)

**Existing name + pending block** (analog L257-274):
```tsx
<div className="flex-1 min-w-0 mr-6">
  <div className="flex items-center gap-2">
    <p className="font-serif text-base sm:text-[20px] font-semibold text-foreground truncate">
      {list.name}
    </p>
    {pending && (
      <Loader2 className="h-4 w-4 animate-spin shrink-0"
        style={{ color: "var(--gold-primary)" }}
        aria-label="Creating list" />
    )}
  </div>
</div>
```

**Badge insertion** (sibling of the `Loader2`, pattern borrowed from `persona-card.tsx:108-116` `is_starter` Badge):
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    {list.visibility === "personal" ? (
      <Lock className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-ghost)" }} aria-label="Personal list" />
    ) : (
      <Users className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-ghost)" }} aria-label="Team shared list" />
    )}
  </TooltipTrigger>
  <TooltipContent>
    {list.visibility === "personal" ? "Private — only you and admins" : "Team shared"}
  </TooltipContent>
</Tooltip>
```
`Tooltip` / `TooltipContent` are already imported in this file at L7-11 and used at L323-338 for the disabled delete button — identical usage.

**`OptimisticList` + reducer**: No reducer changes needed. `OptimisticList = List & { __pending?: boolean }` at L31 automatically inherits the new `visibility` + `created_by` fields once `List` is extended (RESEARCH.md Pattern 5).

---

### 10. `src/app/[orgId]/lists/[listId]/page.tsx` (MOD — badge + toggle dropdown)

**Analog:** itself (L48-89 header) + `src/app/[orgId]/team/page.tsx:57-60` for admin-check idiom

**Existing header block** (analog L49-89):
```tsx
<div className="flex items-center gap-4">
  <Button variant="ghost" size="icon" asChild>
    <Link href={`/${orgId}/lists`}>
      <ArrowLeft className="h-4 w-4" />
    </Link>
  </Button>
  <div className="flex-1">
    <h1 className="font-serif text-3xl font-bold tracking-tight">{list.name}</h1>
    {list.description && <p className="mt-1 text-sm text-muted-foreground">{list.description}</p>}
  </div>
  <div className="text-sm text-muted-foreground">
    {members.length} {members.length === 1 ? "member" : "members"}
  </div>
  <ReportIssueButton ... />
</div>
```

**Admin role check** (copy from `src/app/[orgId]/team/page.tsx:57-60`):
```typescript
const role = user.app_metadata?.role as string | undefined;
const isAdmin = role === "tenant_admin" || role === "super_admin";
const canToggleVisibility = user.id === list.created_by || isAdmin;
```

**Badge + toggle dropdown** render-gated by `canToggleVisibility` (per CONTEXT D-11). Use `@/components/ui/dropdown-menu` (package.json dependency confirmed in RESEARCH.md L151). Trigger = the visibility badge itself; onSelect calls `updateListVisibilityAction(list.id, nextVisibility)`.

---

### 11. `src/app/[orgId]/personas/components/persona-form-dialog.tsx` (MOD — visibility control in both modes)

**Analog:** itself (L319-498 form body, specifically L319-349 Name/Description block above the `<Separator />`)

**Insertion point** (analog L348-350):
```tsx
        </div>
      </div>

      <Separator />

      {/* ── Apollo Filters ── */}
```
Insert the visibility segmented control (same JSX as in create-list-dialog above) between the Name/Description block and the `<Separator />`. Mode handling: `defaultValue={persona?.visibility ?? "team_shared"}` — matches the dialog's existing `defaultValue` pattern at L330 (name) and L343 (description).

---

### 12. `src/app/[orgId]/personas/components/persona-card.tsx` (MOD — icon chip)

**Analog:** itself (L101-116 name + `is_starter` badge row)

**Existing badge row** (analog L100-116):
```tsx
<div className="flex items-start justify-between gap-2">
  <h3 className="font-serif text-xl sm:text-[24px] font-semibold leading-tight"
    style={{ color: "var(--text-primary)" }}>
    {persona.name}
  </h3>
  {persona.is_starter && (
    <Badge variant="gold" className="shrink-0 text-[10px] uppercase tracking-wide">
      Suggested
    </Badge>
  )}
</div>
```

**Extension**: add a visibility chip sibling to the `Suggested` badge, respecting `var(--text-ghost)` palette per CONTEXT design-system note:
```tsx
<div className="flex items-center gap-2 shrink-0">
  {persona.visibility === "personal" ? (
    <span title="Private" className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-[5px]"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-ghost)" }}>
      <Lock className="h-3 w-3" /> Personal
    </span>
  ) : null}
  {persona.is_starter && <Badge variant="gold" ...>Suggested</Badge>}
</div>
```
Non-starter personas surface the toggle inside the existing `PersonaFormDialog` edit mode (D-11).

---

### 13. `src/app/[orgId]/team/workspace/page.tsx` (NEW — admin workspace)

**Analog:** `src/app/[orgId]/team/page.tsx` (EXACT analog — copy its admin-check, table chrome, tenant-scoped fetch, role-badge helpers)

**Admin guard** (analog L40-60):
```typescript
export default async function TeamPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = user.app_metadata?.role as string | undefined;
  if (role !== "tenant_admin" && role !== "super_admin") {
    redirect(`/${orgId}/dashboard`);
  }
  ...
}
```
Copy verbatim for the workspace page header.

**Data fetch** — replace the team page's users fetch (analog L62-67) with:
```typescript
const tenantId = user.app_metadata?.tenant_id as string;
const [listsWithCreators, personasWithCreators] = await Promise.all([
  getAllListsWithCreators(tenantId),
  getAllPersonasWithCreators(tenantId),
]);
```

**Table chrome**: reuse `surface-admin-card`, `admin-thead`, `admin-row-hover` classes (analog L122, L127, L169-174). Tabs for "Lists" / "Saved Searches" — can use shadcn `Tabs` (already in `@/components/ui/`). Columns per D-12: name, creator (full_name + email), visibility badge, count, updated_at, toggle action.

---

### 14. `src/app/[orgId]/team/page.tsx` (MOD — add link to workspace)

**Analog:** itself (L99-111 header area)

**Existing header** (analog L99-111):
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="font-serif text-3xl font-bold tracking-tight">Team</h1>
    <p className="text-muted-foreground mt-1">Manage your team members and send invitations</p>
  </div>
  <InviteDialog orgId={orgId} />
</div>
```
Add next to `InviteDialog`:
```tsx
<Button variant="ghost" asChild>
  <Link href={`/${orgId}/team/workspace`}>View team workspace →</Link>
</Button>
<InviteDialog orgId={orgId} />
```

---

### 15. `src/app/actions/team.ts` (MOD — reassign hook inside removeTeamMember)

**Analog:** itself (L380-438 `removeTeamMember`)

**Insertion point** (analog L430-434):
```typescript
// Log before deletion
await logActivity({ ... });

// Delete public.users row
await admin.from("users").delete().eq("id", userId);
// Delete auth.users record
await admin.auth.admin.deleteUser(userId);
```

**Hook insertion** (per CONTEXT D-13 — insert BEFORE line 432 `admin.from("users").delete()`):
```typescript
// Reassign lists + personas owned by the removed user to the acting admin (user.id).
// Admin client REQUIRED because cross-user mutation and the acting admin may be
// super_admin not scoped to this tenant — session client would silently return 0 rows.
// tenantId was already verified in the guard at L399.
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

// ...existing delete flow below
```
**Belt-and-braces:** the FK `ON DELETE SET NULL` from D-04 means if this hook is bypassed, the `admin.auth.admin.deleteUser` still succeeds and `created_by` becomes `NULL`.

---

### 16. `src/components/layout/nav-items.tsx` (MOD — optional admin-only entry)

**Analog:** itself (L34-44 `NAV_ITEMS` array)

**Existing Team entry pattern** (analog L42):
```typescript
{ label: "Team", href: "/team", icon: Users, exact: false, roles: ["tenant_admin", "super_admin"] },
```

**New entry (follows identical shape):**
```typescript
{ label: "Workspace", href: "/team/workspace", icon: LayoutDashboard, exact: false, roles: ["tenant_admin", "super_admin"] },
```
Drop in immediately after the Team entry. The existing `visibleItems.filter` at L49-51 handles role gating — no code changes beyond the array addition.

---

### 17. `src/app/[orgId]/lists/__tests__/actions.test.ts` (MOD — extend with visibility cases)

**Analog:** itself (L1-340) — the file already uses the exact Vitest mock pattern Phase 44 needs.

**Mock skeleton** (analog L1-94 — copy unchanged):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireRole = vi.fn();
vi.mock("@/lib/auth/rbac", () => ({ requireRole: (role: string) => mockRequireRole(role) }));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

const mockCreateList = vi.fn();
const mockUpdateListVisibility = vi.fn();   // NEW
vi.mock("@/lib/lists/queries", () => ({
  createList: (...a: unknown[]) => mockCreateList(...a),
  updateListVisibility: (...a: unknown[]) => mockUpdateListVisibility(...a),
  // ...existing mocks
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
```

**Test shape — agent happy path** (analog L102-112 createListAction pattern):
```typescript
describe("createListAction — visibility", () => {
  it("agent → success with personal visibility", async () => {
    mockCreateList.mockResolvedValue({ id: "L1", name: "x", visibility: "personal" });
    const fd = new FormData();
    fd.set("name", "x");
    fd.set("visibility", "personal");
    const result = await createListAction(fd);
    expect(result.success).toBe(true);
    expect(mockCreateList).toHaveBeenCalledWith("tenant-x", "user-123",
      expect.objectContaining({ visibility: "personal" }));
  });

  it("defaults to team_shared when visibility missing", async () => {
    mockCreateList.mockResolvedValue({ id: "L1", visibility: "team_shared" });
    const fd = new FormData();
    fd.set("name", "x");
    await createListAction(fd);
    expect(mockCreateList).toHaveBeenCalledWith("tenant-x", "user-123",
      expect.objectContaining({ visibility: "team_shared" }));
  });

  it("rejects invalid visibility value", async () => {
    const fd = new FormData();
    fd.set("name", "x");
    fd.set("visibility", "garbage");
    const result = await createListAction(fd);
    expect(result.success).toBe(false);
    expect(mockCreateList).not.toHaveBeenCalled();
  });
});
```

---

### 18. `src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx` (MOD — visibility threading)

**Analog:** itself (L22-46 fixtures, L48-73 CREATE_PENDING tests)

**Existing fixtures** (analog L22-46) — extend with `visibility` + `created_by`:
```typescript
function makeList(overrides: Partial<List> = {}): List {
  return {
    id: `list-${Math.random().toString(36).slice(2, 8)}`,
    tenant_id: TENANT_ID,
    name: "Untitled",
    description: null,
    member_count: 0,
    visibility: "team_shared",     // NEW
    created_by: "user-abc",        // NEW
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makePending(tempId: string, name: string, visibility: Visibility = "team_shared"): OptimisticList {
  return {
    id: tempId,
    tenant_id: TENANT_ID,
    name,
    description: null,
    member_count: 0,
    visibility,               // NEW — threaded from dialog
    created_by: "user-abc",   // NEW
    created_at: NOW,
    updated_at: NOW,
    __pending: true,
  };
}
```

**New test case** (model after analog L48-73):
```typescript
it("CREATE_PENDING: preserves visibility from optimistic makeTempList", () => {
  const state: OptimisticList[] = [];
  const tempList = makePending("temp-xyz", "My private list", "personal");
  const next = listsOptimisticReducer(state, { type: "CREATE_PENDING", tempList });
  expect(next[0].visibility).toBe("personal");
  expect(next[0].__pending).toBe(true);
});
```

---

### 19. `src/app/[orgId]/personas/__tests__/actions.test.ts` (MOD — mirror lists test extension)

**Analog:** itself (L1-180) — identical Vitest mock shape to lists/actions test

**Extension**: same pattern as lists — add `mockUpdatePersonaVisibility` to the `@/lib/personas/queries` mock, add visibility round-trip assertions to `createPersonaAction` tests, add dedicated `describe("updatePersonaVisibilityAction")` block. Note persona test uses `fdWithFilters("My Persona")` helper (analog L69-74) — extend to append `fd.set("visibility", ...)` where asserting visibility round-trip.

---

### 20. `src/app/actions/__tests__/team.test.ts` (NEW — reassign hook coverage)

**Analog:** `src/app/[orgId]/lists/__tests__/actions.test.ts` (exact Vitest mock pattern)

**Scaffold** (copy from analog L1-94):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock admin client (cross-user mutation)
const mockAdminUpdate = vi.fn();
const mockAdminFrom = vi.fn();
const mockAdminDeleteUser = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
    auth: { admin: { deleteUser: mockAdminDeleteUser } },
  }),
}));

// Mock session client
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { removeTeamMember } from "../team";
```

**Test shape** (model after analog L100-140):
```typescript
describe("removeTeamMember — reassign hook", () => {
  it("reassigns lists + personas BEFORE deleting the user", async () => {
    const callOrder: string[] = [];
    // Configure mockAdminFrom to track ordered calls to lists.update, personas.update, users.delete
    // Assert callOrder is ["lists.update", "personas.update", "users.delete"]
    // Assert updates use { visibility: "team_shared", created_by: <acting_admin_id> }
    // Assert both updates are scoped .eq("tenant_id", tenantId).eq("created_by", removedUserId)
  });

  it("returns error and short-circuits if list reassign fails", async () => {
    // Arrange lists.update -> { error: { message: "boom" } }
    // Assert result === { error: "Failed to reassign lists: boom" }
    // Assert admin.from("users").delete() NEVER called
  });

  it("last-tenant-admin block still fires (D-14 regression)", async () => {
    // Target = tenant_admin; count = 1
    // Assert result === { error: "Cannot remove the last tenant admin" }
    // Assert reassign queries NEVER called
  });
});
```

---

## Shared Patterns

### Authentication / Tenant Resolution
**Source:** `src/app/[orgId]/lists/actions.ts:16-36` (`getAuthenticatedUser()`)
**Apply to:** All new server actions — `updateListVisibilityAction`, `updatePersonaVisibilityAction`, and any helper called from `actions.ts`

```typescript
async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) throw new Error("No tenant ID found in session");
  await requireRole("agent");
  return { userId: user.id, tenantId };
}
```
Trust boundary: `requireRole("agent")` is the role floor. Creator/admin check for visibility is RLS, not JS.

### Admin-only Page Guard
**Source:** `src/app/[orgId]/team/page.tsx:57-60`
**Apply to:** New `src/app/[orgId]/team/workspace/page.tsx`; any future admin-only route

```typescript
const role = user.app_metadata?.role as string | undefined;
if (role !== "tenant_admin" && role !== "super_admin") {
  redirect(`/${orgId}/dashboard`);
}
```
**Why not `requireRole("tenant_admin")`:** per STATE.md Phase 04 + RESEARCH.md Pattern 3 — `requireRole` redirects agents/assistants to login (bad). Inline check redirects to tenant dashboard, preserving session.

### RLS Policy Idiom
**Source:** `supabase/migrations/20260412_rls_activity_log_personas.sql:41-77`
**Apply to:** All four tables in the new migration (`lists`, `personas`, `list_members`, `saved_search_prospects`)

```sql
DROP POLICY IF EXISTS <name> ON <table>;
CREATE POLICY <name> ON <table>
  FOR SELECT TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  );
```
- JWT path is `app_metadata.tenant_id` / `app_metadata.role` (never `user_metadata`) — matches Phase 1 STATE.md decision.
- Always `DROP POLICY IF EXISTS` before `CREATE POLICY` (Postgres has no `CREATE OR REPLACE POLICY`).
- Super-admin FOR ALL catch-all preserved per existing pattern.

### Optimistic Reducer Threading
**Source:** `src/app/[orgId]/lists/components/list-grid.tsx:31-98` + `create-list-dialog.tsx:45-57`
**Apply to:** `create-list-dialog.tsx` (`makeTempList` extension) + `list-grid.optimistic.test.tsx` fixture extension

`OptimisticList = List & { __pending?: boolean }` — once `List` gains `visibility` + `created_by`, all downstream optimistic state inherits automatically. No reducer action changes needed; only the `makeTempList` factory and the test fixtures.

### Tooltip Wrapping
**Source:** `src/app/[orgId]/lists/components/list-grid.tsx:323-338` (disabled delete btn)
**Apply to:** Visibility badges in `list-grid.tsx` + `persona-card.tsx` + `list-detail/page.tsx`

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <span tabIndex={0}>
      <IconOrButton />
    </span>
  </TooltipTrigger>
  <TooltipContent>Explanatory text</TooltipContent>
</Tooltip>
```
Components `Tooltip`, `TooltipTrigger`, `TooltipContent` already imported in `list-grid.tsx:7-11`.

### Vitest Server-Action Mock Scaffold
**Source:** `src/app/[orgId]/lists/__tests__/actions.test.ts:1-94`
**Apply to:** All three test files (`lists/actions`, `personas/actions`, `team` reassign)

```typescript
// 1. Mock rbac
const mockRequireRole = vi.fn();
vi.mock("@/lib/auth/rbac", () => ({ requireRole: (r: string) => mockRequireRole(r) }));

// 2. Mock supabase server client
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

// 3. Mock the query layer
vi.mock("@/lib/lists/queries", () => ({ ...named mock fns... }));

// 4. Mock next/cache
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// 5. Import SUT after mocks
import { createListAction } from "../actions";

// 6. NEXT_REDIRECT shape for role-guard rejection assertions
class RedirectError extends Error {
  digest = "NEXT_REDIRECT;replace;/tenant-x;307";
}
```

### Brand Palette (Icons + Badges)
**Source:** `src/app/[orgId]/personas/components/persona-card.tsx:72-76, 179-191, 226-231` (ghost button + gold chip)
**Apply to:** All new visibility badges + segmented control buttons

- Team-shared (active / default): `var(--gold-bg)` bg, `var(--border-gold)` border, `var(--gold-primary)` text
- Personal (muted): `rgba(255,255,255,0.03)` bg, `rgba(255,255,255,0.08)` border, `var(--text-ghost)` / `var(--text-secondary)` text
- Tooltip text: literal strings "Private — only you and admins" / "Team shared"

---

## No Analog Found

None. Every file in Phase 44 has a direct precedent in the repo — migrations (20260412), query layer (lists.ts / personas.ts), server actions (lists/actions.ts + personas/actions.ts), UI dialogs (create-list-dialog + persona-form-dialog), RBAC page guards (team/page.tsx), admin-client mutations (team.ts), and Vitest mock scaffolds.

The one mildly novel file — `src/app/[orgId]/team/workspace/page.tsx` — is a straight copy of `team/page.tsx`'s admin-check + admin-table chrome, with a different data source (`getAllListsWithCreators` instead of users).

---

## Metadata

**Analog search scope:**
- `supabase/migrations/` (14 migrations; closest = 20260412)
- `src/lib/lists/`, `src/lib/personas/`
- `src/app/[orgId]/lists/`, `src/app/[orgId]/personas/`, `src/app/[orgId]/team/`
- `src/app/actions/team.ts`
- `src/types/auth.ts`
- `src/components/layout/nav-items.tsx`
- `src/app/[orgId]/lists/__tests__/`, `src/app/[orgId]/personas/__tests__/`, `src/app/[orgId]/lists/components/__tests__/`

**Files scanned:** ~18 source files read in full; ~25 surveyed via Glob/Grep.

**Pattern extraction date:** 2026-04-17.

**Planner instructions:**
- Migration lands FIRST (isolated plan). Every subsequent plan assumes `visibility` + `created_by` columns exist on `lists` / `personas` and RLS policies are enforcing visibility.
- Types + shared `src/types/visibility.ts` land BEFORE any query/component edits so imports resolve.
- UI plans can run in parallel after query layer is in place (lists UI + personas UI are independent code paths).
- `removeTeamMember` reassign hook lands LAST — depends on migration (for FK SET NULL) + query layer (no direct dependency, but sanity checks).
