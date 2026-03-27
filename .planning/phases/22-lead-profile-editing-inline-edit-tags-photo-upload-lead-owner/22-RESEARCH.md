# Phase 22: Lead Profile Editing — Research

**Researched:** 2026-03-27
**Domain:** Prospect profile mutation — inline editing, tags, photo upload, lead ownership
**Confidence:** HIGH

---

## Summary

Phase 22 adds write capability to a previously read-only prospect profile. The profile page at `src/app/[orgId]/prospects/[prospectId]/page.tsx` currently uses `select('*')` and passes data to `ProfileView` + `ProfileHeader`, which are purely display components. The phase layers manual override columns onto the prospects table, builds reusable inline-edit UI components, adds `prospect_tags` and `prospect_custom_fields` tables, creates new API routes for mutations, and wires lead-owner assignment via a user-avatar dropdown.

The architecture decision is a `manual_*` override column pattern rather than a separate overrides table. This keeps the display logic as a simple `manual_{field} ?? enriched_{field} ?? null` coalesce and avoids any join when reading the profile. The tradeoff is wider prospect row, which is acceptable given read frequency vs. write frequency in this product.

Key facts from codebase inspection:
- `full_name` is a **generated column** (`first_name || ' ' || last_name`) — it cannot be directly overridden via a new column without also overriding first_name/last_name, or by using a separate `manual_display_name` that the UI renders instead.
- The existing `notes` field on prospects is the "internal notes" textarea already wired. `pinned_note` in the spec is a separate concept (promoted short note shown in the header card), not a replacement for `notes`.
- The `contact_data` JSONB stores `photo_url` from Apollo/enrichment. `manual_photo_url` will be a new flat column pointing to Supabase Storage.
- A `prospect_tags` junction table is needed — tags are many-to-many between tenants and prospects, with tag names shared across a tenant's prospects.
- The `LogoUpload` component and `/api/upload/logo` route are the direct patterns to reuse for photo upload (same `general` bucket in Supabase Storage).
- The `TagInput` component exists at `src/components/ui/tag-input.tsx` with autocomplete from a `suggestions` prop — it needs a new data source (existing tenant tags from `prospect_tags`).
- Activity logger is in `src/lib/activity-logger.ts` — uses admin client (bypass RLS), never throws. New action types must be added to the `ActionType` union.
- RBAC: `assistant` role has `canEdit: false` — inline editing must be gated by `canEdit` permission. Only `agent`, `tenant_admin`, and `super_admin` can edit.

**Primary recommendation:** Follow the `manual_*` column pattern for overrides, reuse `LogoUpload` and `TagInput` patterns, implement `InlineEditField` as a generic wrapper around the existing `input.tsx` component, and gate all edit UI behind `canEdit` RBAC check.

---

## Standard Stack

### Core (already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 4.3.6 | Validation in API routes | Already used in all existing routes |
| @supabase/supabase-js | 2.95.3 | DB + Storage mutations | Already the project DB layer |
| lucide-react | 0.563.0 | Pencil, Check, X, Camera icons for edit UI | Already used throughout |
| next (App Router) | 14.2.35 | API route handlers | Project constraint |
| react | 18 | Client components for inline edit state | Project constraint |

### No New Dependencies Required

All functionality can be built with existing packages. No new npm installs needed.

**Installation:** None — all dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
src/
├── components/prospect/
│   ├── inline-edit-field.tsx       # Generic inline edit wrapper
│   ├── avatar-upload.tsx           # Click avatar to upload photo
│   └── lead-owner-select.tsx       # User avatar dropdown
├── app/api/prospects/[prospectId]/
│   ├── profile/route.ts            # PATCH — field-level edits
│   ├── tags/route.ts               # POST/DELETE — tag CRUD
│   └── photo/route.ts              # POST — upload to Supabase Storage
```

### Pattern 1: Manual Override Column Pattern

**What:** Add `manual_*` columns to prospects table. Display logic: `manual_{field} ?? enriched_{field} ?? null`.

**When to use:** Any field where enrichment can return wrong data and user may need to correct it.

**Example (display resolution):**
```typescript
// In ProfileHeader / ProfileView — resolved field helper
function resolveField<T>(manual: T | null | undefined, enriched: T | null | undefined): T | null {
  return manual ?? enriched ?? null;
}

const displayName = prospect.manual_display_name ?? prospect.full_name;
const displayTitle = prospect.manual_title ?? prospect.title ?? null;
const displayEmail = prospect.manual_email ?? prospect.work_email ?? prospect.contact_data?.personal_email ?? null;
const displayPhoto = prospect.manual_photo_url ?? prospect.contact_data?.photo_url ?? null;
```

**Key gotcha:** `full_name` is a GENERATED column in PostgreSQL — it cannot be directly written. The spec's `manual_display_name` is a separate nullable column the UI renders instead of `full_name` when set.

### Pattern 2: InlineEditField Component

**What:** Wraps any display value with a pencil icon on hover. Click/pencil activates an `<input>` in-place. Enter/Escape or checkmark/X confirms or cancels. Calls an `onSave(newValue)` callback. Shows gold flash on successful save.

**State machine:**
```
idle → editing → saving → idle (success flash)
                        → editing (error, stay editable)
```

**Example skeleton:**
```typescript
// src/components/prospect/inline-edit-field.tsx
"use client";
interface InlineEditFieldProps {
  value: string | null;
  onSave: (newValue: string | null) => Promise<void>;
  placeholder?: string;
  displayClassName?: string;
  isEditable?: boolean; // gated by RBAC
  label?: string; // for aria-label
}
```

Key details:
- The pencil icon should use `opacity-0 group-hover:opacity-100` (CSS hover, not `onMouseEnter` — per Phase 17 pattern where raw `onMouseEnter` was replaced with CSS classes)
- Wrap the container in `group` class
- Optimistic UI: update display immediately, revert on API error
- Gold flash: add a CSS class `animate-pulse` or a brief `ring-1 ring-gold-primary` for 500ms on success

### Pattern 3: API Route Pattern (PATCH profile)

**What:** `PATCH /api/prospects/[prospectId]/profile` accepts a partial update object. All writes go through RLS-respecting `supabase` client (user client, not admin) so RLS validates tenant ownership automatically. Log activity after update.

**Example structure:**
```typescript
// src/app/api/prospects/[prospectId]/profile/route.ts
// Pattern: identical to /api/prospects/[prospectId]/notes/route.ts
// 1. createClient() — user's session
// 2. getUser() — auth
// 3. Extract tenant_id from app_metadata
// 4. Parse + validate body with zod
// 5. supabase.from("prospects").update({...}).eq("id", prospectId).eq("tenant_id", tenantId)
// 6. logActivity({ actionType: "profile_edited", ... }) — fire-and-forget
// 7. Return updated fields
```

**Allowed fields for PATCH (zod schema):**
```typescript
const profilePatchSchema = z.object({
  manual_display_name: z.string().max(200).nullable().optional(),
  manual_title: z.string().max(200).nullable().optional(),
  manual_company: z.string().max(200).nullable().optional(),
  manual_email: z.string().email().nullable().optional(),
  manual_email_secondary: z.string().email().nullable().optional(),
  manual_phone: z.string().max(50).nullable().optional(),
  manual_phone_label: z.string().max(50).nullable().optional(),
  manual_linkedin_url: z.string().url().nullable().optional(),
  manual_city: z.string().max(100).nullable().optional(),
  manual_state: z.string().max(100).nullable().optional(),
  manual_country: z.string().max(100).nullable().optional(),
  manual_wealth_tier: z.enum(["low", "medium", "high", "ultra_high"]).nullable().optional(),
  pinned_note: z.string().max(500).nullable().optional(),
  lead_owner_id: z.string().uuid().nullable().optional(),
});
```

### Pattern 4: Tags — prospect_tags Table

**What:** New `prospect_tags` table as a junction between prospects and tag names. Tag names are stored as plain strings scoped to tenant.

**Minimal schema:**
```sql
CREATE TABLE prospect_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Prevent duplicate tags per prospect
CREATE UNIQUE INDEX prospect_tags_unique ON prospect_tags (prospect_id, tenant_id, tag);

-- RLS: tenant isolation
ALTER TABLE prospect_tags ENABLE ROW LEVEL SECURITY;
```

**Tag autocomplete query (GET /api/prospects/[prospectId]/tags with distinct=true):**
```typescript
// Fetch all distinct tag names for this tenant (for suggestions)
const { data } = await supabase
  .from("prospect_tags")
  .select("tag")
  .eq("tenant_id", tenantId)
  .order("tag");
const suggestions = [...new Set(data?.map(r => r.tag) ?? [])];
```

### Pattern 5: Photo Upload — Supabase Storage

**What:** Reuse the `general` bucket already used for tenant logos. New path: `prospect-photos/{prospectId}.{ext}`. After upload, write public URL to `manual_photo_url` column.

**Storage path pattern (mirrors logo upload):**
```typescript
const storagePath = `prospect-photos/${prospectId}.${ext}`;
const { error } = await admin.storage.from("general").upload(storagePath, buffer, {
  contentType: file.type,
  upsert: true, // replace on re-upload
});
const { data: { publicUrl } } = admin.storage.from("general").getPublicUrl(storagePath);
// Then update prospects.manual_photo_url = publicUrl
```

### Pattern 6: Lead Owner — Users Table Query

**What:** `LeadOwnerSelect` is a dropdown showing team members of the same tenant. Queries `users` table filtered by `tenant_id`. Displays user avatars and names. Saves `lead_owner_id` (UUID) to prospects table.

**Query:**
```typescript
const { data: users } = await supabase
  .from("users")
  .select("id, full_name, email")
  .eq("tenant_id", tenantId)
  .eq("is_active", true)
  .order("full_name");
```

### Anti-Patterns to Avoid

- **Touching full_name directly:** It is a generated column. Writing to it will fail. Use `manual_display_name` for display override; write to `first_name` + `last_name` if name correction is needed (but the spec uses display name override only).
- **Admin client for profile edits:** Use user client (RLS-aware) for profile PATCH, not admin client. RLS provides the tenant isolation check for free. Only use admin client for Storage uploads (same as logo upload pattern).
- **onMouseEnter for hover effects:** Phase 17 established CSS `group-hover:opacity-*` as the pattern. Do not add raw `onMouseEnter/onMouseLeave` handlers to the new components.
- **Blocking the profile page render on tags query:** Tags should be fetched client-side or in a separate suspense boundary to avoid slowing the initial SSR render.
- **Putting updated_by into a non-existent column:** The spec mentions `updated_by` and `updated_at` columns — these must be added to the migration. `updated_at` already exists on prospects. `updated_by` is new.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload drop zone | Custom drag+drop | Reuse `LogoUpload` component pattern | Already handles drag, click, MIME validation, 2MB limit, preview, remove |
| Tag pill input with autocomplete | Custom input | Reuse/extend existing `TagInput` component | Already has pill rendering, Enter/comma add, Backspace delete, suggestion dropdown |
| Avatar image load/error handling | Custom img fallback | Reuse `ProspectAvatar` component | Already handles initials fallback, Gravatar cascade, `opacity: 0` until loaded |
| Field validation | Custom validators | Zod schemas, matching existing patterns | Already used in all routes; `emailSchema`, `urlSchema` exist in `validations/schemas.ts` |
| Activity logging | Custom DB insert | `logActivity()` from `src/lib/activity-logger.ts` | Fire-and-forget, never throws, already established pattern |

**Key insight:** This codebase has very consistent patterns across components and routes. The biggest risk is introducing a different pattern (e.g., using React Hook Form where the rest of the app uses direct fetch + useState) rather than any missing functionality.

---

## Database Changes Required

### 1. Alter prospects table — add manual_* columns

```sql
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS manual_display_name text,
  ADD COLUMN IF NOT EXISTS manual_title text,
  ADD COLUMN IF NOT EXISTS manual_company text,
  ADD COLUMN IF NOT EXISTS manual_email text,
  ADD COLUMN IF NOT EXISTS manual_email_secondary text,
  ADD COLUMN IF NOT EXISTS manual_phone text,
  ADD COLUMN IF NOT EXISTS manual_phone_label text,
  ADD COLUMN IF NOT EXISTS manual_linkedin_url text,
  ADD COLUMN IF NOT EXISTS manual_city text,
  ADD COLUMN IF NOT EXISTS manual_state text,
  ADD COLUMN IF NOT EXISTS manual_country text,
  ADD COLUMN IF NOT EXISTS manual_wealth_tier text,
  ADD COLUMN IF NOT EXISTS manual_photo_url text,
  ADD COLUMN IF NOT EXISTS pinned_note text,
  ADD COLUMN IF NOT EXISTS lead_owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id) ON DELETE SET NULL;
```

Note: `updated_at` already exists on prospects (used in notes route with `new Date().toISOString()`).

### 2. New prospect_tags table

```sql
CREATE TABLE IF NOT EXISTS prospect_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tag text NOT NULL CHECK (char_length(tag) > 0 AND char_length(tag) <= 100),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS prospect_tags_prospect_tenant_tag
  ON prospect_tags (prospect_id, tenant_id, lower(tag));

CREATE INDEX IF NOT EXISTS prospect_tags_tenant_id ON prospect_tags (tenant_id);
CREATE INDEX IF NOT EXISTS prospect_tags_prospect_id ON prospect_tags (prospect_id);

ALTER TABLE prospect_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospect_tags_tenant_isolation"
  ON prospect_tags FOR ALL
  USING (tenant_id = (
    SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  ));
```

### 3. New prospect_custom_fields table (optional in Phase 22)

```sql
CREATE TABLE IF NOT EXISTS prospect_custom_fields (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  field_name text NOT NULL CHECK (char_length(field_name) > 0 AND char_length(field_name) <= 100),
  field_value text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS prospect_custom_fields_unique
  ON prospect_custom_fields (prospect_id, tenant_id, lower(field_name));

ALTER TABLE prospect_custom_fields ENABLE ROW LEVEL SECURITY;
```

**Scope note:** The spec includes `prospect_custom_fields` in the DB changes list but does not specify a UI for managing them beyond the editable fields list. The planner may choose to defer custom fields and deliver the core inline-edit + tags + photo + lead owner first.

### 4. New activity log action types

Add to `ActionType` union in `src/lib/activity-logger.ts`:
- `"profile_edited"` — any manual field update
- `"tag_added"` — tag added to prospect
- `"tag_removed"` — tag removed from prospect
- `"photo_uploaded"` — photo uploaded/changed
- `"lead_owner_assigned"` — lead_owner_id changed

Also update `ACTION_TYPES` array and `ActivityActionType` in `src/types/database.ts`.

### 5. TypeScript type updates

Both `src/types/database.ts` (Prospect interface) and `src/lib/prospects/types.ts` (Prospect + UpsertProspectInput interfaces) must be updated to include all new columns. These two files have overlapping Prospect definitions — the planner should consolidate or ensure both stay in sync.

---

## Current Codebase — Key Findings

### Profile page query
The page uses `select('*')` on prospects (line 52 of `page.tsx`). After migration, new `manual_*` columns will automatically be included. No query change needed on the page itself, but TypeScript types must be updated.

### notes field
The `notes` field already exists on prospects and has a working PATCH route at `/api/prospects/[prospectId]/notes`. The proposed `pinned_note` is a new separate column — a short promoted note (max ~500 chars) shown in the profile header card, distinct from the longer internal notes textarea.

### Supabase Storage bucket
The `general` bucket already exists and is public (demonstrated by tenant logo uploads returning public URLs). Prospect photos can use path `prospect-photos/{prospectId}.{ext}` within the same bucket. No new bucket needed.

### TagInput component
`src/components/ui/tag-input.tsx` already supports:
- Pill rendering with gold styling
- Enter/comma to add
- Backspace to remove last
- Autocomplete dropdown from `suggestions` prop

It needs to be used with a `suggestions` array fetched from existing prospect tags for the tenant. The component itself requires no changes — just wire the data source.

### RBAC
`assistant` role: `canEdit: false`. The inline edit UI (pencil icons, edit mode) must not render for assistants. The `canEdit` flag from `ROLE_PERMISSIONS[role]` should gate the entire editing capability. This check must happen server-side (page-level) and be passed to `ProfileView` as a prop.

### ProfileHeader
Currently does not render any editable state. It is a pure display component. The plan needs to either:
1. Convert `ProfileHeader` to accept optional edit handlers/state, or
2. Create a new `ProfileHeaderEditable` wrapper that overlays edit controls

Option 1 is simpler and matches the existing pattern (ProfileHeader receives props, renders conditionally).

---

## Common Pitfalls

### Pitfall 1: Writing to the full_name generated column
**What goes wrong:** Attempting to `UPDATE prospects SET full_name = 'New Name'` will fail in PostgreSQL because it is a computed/generated column.
**Why it happens:** The Prospect type shows `full_name: string // Generated column: first_name || ' ' || last_name`.
**How to avoid:** Use `manual_display_name` for display override. If actual name correction is needed, update `first_name` + `last_name`, and `full_name` will update automatically.
**Warning signs:** TypeScript won't warn you — Supabase will return a DB error at runtime.

### Pitfall 2: Using admin client for profile PATCH
**What goes wrong:** Using `createAdminClient()` bypasses RLS, which means a user in tenant A could edit tenant B's prospects if the route logic has a bug.
**Why it happens:** The notes route correctly uses `createClient()` and relies on `.eq("tenant_id", tenantId)` + RLS. If a developer copies the enrich route pattern instead (which uses admin client for Inngest event ID update), the protection is lost.
**How to avoid:** Use `createClient()` (user session) for all profile PATCH operations. Only use `createAdminClient()` for Storage uploads (same as existing logo upload).

### Pitfall 3: Tags not case-normalized
**What goes wrong:** "Tech" and "tech" become two separate tags, leading to duplicate suggestions and split counts.
**Why it happens:** Plain string comparison.
**How to avoid:** Store tags lowercased at insert time, or use `lower(tag)` in the unique index (shown in schema above). Display can capitalize/format as needed.

### Pitfall 4: Photo upload using user client
**What goes wrong:** `supabase.storage.from("general").upload(...)` with the user client requires Storage RLS policies allowing user writes. The existing logo upload correctly uses `createAdminClient()` for the Storage operation.
**Why it happens:** Storage buckets have separate RLS from table RLS. The `general` bucket may not have user-write policies configured.
**How to avoid:** Use `createAdminClient()` for Storage upload, then update `manual_photo_url` with user client (or admin client with explicit tenant_id check).

### Pitfall 5: Optimistic UI not reverting on error
**What goes wrong:** User edits a field, UI shows new value, save fails silently, but the displayed value stays as the new (wrong) value.
**Why it happens:** Forgetting to revert local state in the catch block.
**How to avoid:** In `InlineEditField`, store `previousValue` before optimistic update. In the catch block, call `setValue(previousValue)`.

### Pitfall 6: TypeScript Prospect type divergence
**What goes wrong:** `src/types/database.ts` and `src/lib/prospects/types.ts` both define a `Prospect` interface. After adding new columns, if only one is updated, TypeScript errors appear in unexpected places.
**Why it happens:** Two parallel type definitions — `database.ts` Prospect (used by ActivityLog context etc.) and `lib/prospects/types.ts` Prospect (used by queries).
**How to avoid:** Update both in the same commit. Ideally consolidate them (re-export one from the other) as a cleanup task.

### Pitfall 7: Lead owner dropdown not filtered to tenant
**What goes wrong:** The `users` table contains users from all tenants. Without a `tenant_id` filter, the dropdown shows all users in the system.
**Why it happens:** Forgetting the tenant filter when querying users.
**How to avoid:** Always filter `users` by `tenant_id` when building the lead owner options list.

---

## Code Examples

### Existing notes PATCH route (reference pattern for profile PATCH)
```typescript
// Source: src/app/api/prospects/[prospectId]/notes/route.ts
// Pattern: auth → tenant_id → validate body → update with RLS → logActivity → return
const supabase = await createClient(); // NOT createAdminClient
const { data: { user } } = await supabase.auth.getUser();
const tenantId = user.app_metadata?.tenant_id;
// update with RLS — .eq("tenant_id", tenantId) provides defense in depth
const { data } = await supabase
  .from("prospects")
  .update({ notes, updated_at: new Date().toISOString() })
  .eq("id", prospectId)
  .eq("tenant_id", tenantId)
  .select("id, notes")
  .single();
// Activity log — fire and forget
logActivity({ tenantId, userId: user.id, actionType: "note_added", ... }).catch(() => {});
```

### Existing logo upload pattern (reference for photo upload)
```typescript
// Source: src/app/api/upload/logo/route.ts
const admin = createAdminClient();
const { error: uploadError } = await admin.storage
  .from("general")
  .upload(`tenant-logos/${tenantId}.${ext}`, fileBuffer, { contentType, upsert: true });
const { data: { publicUrl } } = admin.storage.from("general").getPublicUrl(storagePath);
await admin.from("tenants").update({ logo_url: publicUrl }).eq("id", tenantId);
```

### TagInput component usage (already exists — wire data source)
```typescript
// Source: src/components/ui/tag-input.tsx
// The component is already complete. Usage:
<TagInput
  value={currentTags}   // string[] from prospect_tags
  onChange={handleTagsChange}
  suggestions={allTenantTags}  // fetched: GET /api/prospects/[id]/tags?suggestions=true
  placeholder="Add tags..."
/>
```

### RBAC gate for edit UI
```typescript
// Pattern from src/lib/auth/rbac.ts + src/types/auth.ts
import { ROLE_PERMISSIONS } from "@/types/auth";
const canEdit = ROLE_PERMISSIONS[user.role].canEdit;
// Pass as prop:
<ProfileView canEdit={canEdit} ... />
// In InlineEditField:
if (!isEditable) return <span>{value}</span>; // no pencil icon
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Edit form in a modal/drawer | Inline editing with pencil-on-hover | Keeps user in context, no page transition |
| Single notes field | notes (long) + pinned_note (short, promoted) | Clearer UX separation |
| Photo from enrichment only | Manual photo upload + URL paste + enrichment fallback | Users can correct wrong/missing photos |
| No lead assignment | lead_owner_id FK to users | Enables CRM-style ownership tracking |

---

## Open Questions

1. **prospect_custom_fields UI scope for Phase 22**
   - What we know: Table is in the DB spec; no UI was specified beyond "editable fields"
   - What's unclear: Whether the planner should include a custom field editor UI in Phase 22 or defer to a later phase
   - Recommendation: Defer UI to a later phase; create the table in the migration but note it as "table only, no UI" to keep Phase 22 scope manageable.

2. **manual_wealth_tier enum values**
   - What we know: The spec says "wealth tier dropdown" but doesn't specify allowed values
   - What's unclear: Whether this matches an existing enum in the codebase (none found) or is free-form
   - Recommendation: Use `text` column (not a pg enum) with zod validation on the API route. Suggested values: `"low" | "medium" | "high" | "ultra_high"`. Confirm with project owner.

3. **Edited indicator tooltip showing original value**
   - What we know: Spec says "show 'edited' indicator with original value in tooltip"
   - What's unclear: Where original (enriched) value is stored when manual overrides it — the enriched value remains in the original column (e.g., `title` still has enrichment value, `manual_title` has override)
   - Recommendation: The tooltip naturally falls out of the column design — original value is always accessible from `prospect.title` when `prospect.manual_title` is set. No separate "original value" storage needed.

4. **Lead owner in profile header vs. separate section**
   - What we know: Spec lists lead owner under "Categorization" section
   - What's unclear: Whether lead owner should appear in the left-column ProfileHeader card or as a field in the editable sections
   - Recommendation: Add to ProfileHeader card (left column) as a small "Assigned to" row below the CTA buttons — that's where team context belongs visually.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 22 is code + database changes only. External dependencies (Supabase, Storage) are already running and verified by prior phases. No new external services introduced.

---

## Validation Architecture

`workflow.nyquist_validation` is not set in `.planning/config.json` — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 |
| Config file | None detected — `"test": "vitest"` in package.json |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements — Test Map

| Behavior | Test Type | Notes |
|----------|-----------|-------|
| profilePatchSchema validates correctly | unit | Zod schema — fast to test |
| Manual override resolution (`manual ?? enriched ?? null`) | unit | Pure function — resolveField helper |
| Tag uniqueness / lowercasing | unit | Tag normalization logic |
| PATCH route rejects assistant role | manual/integration | Requires auth session mock |
| Photo upload validates MIME + size | unit | Mirrors existing logo upload tests if any |

### Wave 0 Gaps
No existing test files found for prospect API routes. The project has vitest configured but test files are minimal. The planner should note this as a gap — test creation is optional given project velocity norms, but the build verification plan (final plan in the phase) should confirm `pnpm build` exits 0.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `src/types/database.ts` — Prospect interface, existing columns
- Direct codebase inspection: `src/lib/prospects/types.ts` — Prospect + UpsertProspectInput types
- Direct codebase inspection: `src/app/[orgId]/prospects/[prospectId]/page.tsx` — current page query pattern
- Direct codebase inspection: `src/components/prospect/profile-view.tsx` — current layout structure
- Direct codebase inspection: `src/components/prospect/profile-header.tsx` — current header component
- Direct codebase inspection: `src/components/ui/tag-input.tsx` — existing TagInput
- Direct codebase inspection: `src/app/api/upload/logo/route.ts` — Supabase Storage upload pattern
- Direct codebase inspection: `src/app/api/prospects/[prospectId]/notes/route.ts` — mutation route pattern
- Direct codebase inspection: `src/lib/activity-logger.ts` — activity logging pattern
- Direct codebase inspection: `src/lib/auth/rbac.ts` + `src/types/auth.ts` — RBAC model
- Direct codebase inspection: `src/components/ui/logo-upload.tsx` — upload component pattern
- Direct codebase inspection: `src/components/prospect/prospect-avatar.tsx` — avatar component
- Direct codebase inspection: `package.json` — confirmed no new dependencies needed

### Secondary (MEDIUM confidence)
- PostgreSQL generated columns behavior — confirmed by comment in `src/lib/prospects/types.ts` line 15: `// Generated column: first_name || ' ' || last_name`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed present in package.json
- Architecture: HIGH — patterns directly derived from existing codebase code
- Pitfalls: HIGH — identified from actual code inspection (generated column, admin/user client distinction, TagInput existing state)
- DB schema: HIGH — derived from existing table structure and spec requirements

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable codebase, no fast-moving dependencies)
