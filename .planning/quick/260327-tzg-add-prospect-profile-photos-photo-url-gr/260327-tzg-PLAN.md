---
phase: quick
plan: 260327-tzg
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - src/lib/avatar.ts
  - src/components/prospect/prospect-avatar.tsx
  - src/lib/prospects/queries.ts
  - src/app/api/apollo/bulk-enrich/route.ts
  - src/components/prospect/profile-header.tsx
  - src/components/prospect/profile-view.tsx
  - src/app/[orgId]/lists/components/list-member-table.tsx
  - src/lib/lists/queries.ts
  - src/lib/lists/types.ts
  - src/types/database.ts

must_haves:
  truths:
    - "Prospect profile page shows a real photo when photo_url exists in contact_data"
    - "Prospect profile page shows Gravatar when photo_url is missing but email exists"
    - "Prospect profile page shows initials circle when no photo_url and no Gravatar"
    - "List member table rows show a small avatar next to prospect name"
    - "Mock enrichment generates a placeholder photo_url in contact_data"
  artifacts:
    - path: "src/lib/avatar.ts"
      provides: "MD5 hash + Gravatar URL cascade utility"
      exports: ["getAvatarUrl"]
    - path: "src/components/prospect/prospect-avatar.tsx"
      provides: "Shared ProspectAvatar component with photo/Gravatar/initials fallback"
      exports: ["ProspectAvatar"]
  key_links:
    - from: "src/components/prospect/profile-header.tsx"
      to: "src/components/prospect/prospect-avatar.tsx"
      via: "import ProspectAvatar, renders at size lg"
      pattern: "ProspectAvatar.*size.*lg"
    - from: "src/app/[orgId]/lists/components/list-member-table.tsx"
      to: "src/components/prospect/prospect-avatar.tsx"
      via: "import ProspectAvatar, renders at size sm"
      pattern: "ProspectAvatar.*size.*sm"
    - from: "src/lib/prospects/queries.ts"
      to: "contact_data.photo_url"
      via: "upsertProspectFromApollo stores person.photo_url"
      pattern: "photo_url"
---

<objective>
Add prospect profile photos with a three-tier cascade: Apollo photo_url stored in contact_data, Gravatar from email hash, initials circle fallback.

Purpose: Prospects currently show only initials circles. Real photos make the UI more personal and help users visually identify prospects across profile pages and list tables.

Output: ProspectAvatar component used in profile header (lg) and list member table rows (sm), avatar utility with MD5 Gravatar hash, photo_url persisted during Apollo upsert.
</objective>

<execution_context>
@.planning/quick/260327-tzg-add-prospect-profile-photos-photo-url-gr/260327-tzg-PLAN.md
</execution_context>

<context>
@src/lib/prospects/queries.ts
@src/lib/prospects/types.ts
@src/lib/apollo/types.ts
@src/types/database.ts
@src/components/prospect/profile-header.tsx
@src/components/prospect/profile-view.tsx
@src/app/[orgId]/lists/components/list-member-table.tsx
@src/lib/lists/queries.ts
@src/lib/lists/types.ts
@src/app/api/apollo/bulk-enrich/route.ts

<interfaces>
<!-- Key types and contracts the executor needs -->

From src/lib/apollo/types.ts:
```typescript
export interface ApolloPerson {
  // ...
  photo_url?: string;  // Already defined, available from Apollo
}
```

From src/types/database.ts:
```typescript
export interface ContactData {
  personal_email?: string;
  phone?: string;
  work_phone?: string;
  source?: string;
  enriched_at?: string;
  // NOTE: photo_url NOT yet here — must add it
}
```

From src/components/prospect/profile-view.tsx:
```typescript
interface Prospect {
  contact_data?: {
    personal_email?: string;
    phone?: string;
    source?: string;
    enriched_at?: string;
    // NOTE: photo_url NOT yet here — must add it
  } | null;
  work_email: string | null;
  // ...
}
```

From src/lib/lists/types.ts:
```typescript
export interface ListMember {
  prospect: {
    id: string;
    name: string;
    title: string | null;
    company: string | null;
    // NOTE: no photo_url or email currently exposed for avatar
  };
}
```

From src/components/prospect/profile-header.tsx:
```typescript
interface ProfileHeaderProps {
  prospect: Prospect;  // has first_name, last_name, full_name, work_email
}
// Currently renders a 112px initials circle with getAvatarGradient()
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create avatar utility + ProspectAvatar component + update types</name>
  <files>
    src/lib/avatar.ts,
    src/components/prospect/prospect-avatar.tsx,
    src/types/database.ts,
    src/components/prospect/profile-view.tsx,
    src/lib/lists/types.ts
  </files>
  <action>
**1a. Create `src/lib/avatar.ts`:**

Implement a lightweight client-safe MD5 hash (just the hash function, ~20 lines — no dependencies). Use the standard MD5 algorithm operating on UTF-8 encoded input. Export a function:

```typescript
export function getAvatarUrl(params: {
  photoUrl?: string | null;
  email?: string | null;
  size?: number;
}): string | null
```

Cascade logic:
1. If `photoUrl` is a non-empty string, return it directly.
2. If `email` is a non-empty string, return `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}?d=404&s=${size || 80}`.
3. Return `null` (caller renders initials fallback).

The `d=404` parameter tells Gravatar to return 404 (not a default image) when no avatar exists, which the component's `onError` handler will catch to fall back to initials.

**1b. Create `src/components/prospect/prospect-avatar.tsx`:**

"use client" component. Props:
```typescript
interface ProspectAvatarProps {
  name: string;
  photoUrl?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}
```

Size mapping: sm=28px (table rows), md=48px (cards), lg=112px (profile page — matches existing 28/h-28 circle in profile-header.tsx).

Implementation:
- Use React `useState` to track the current image source stage: "photo" | "gravatar" | "initials".
- On mount/prop change, compute the initial stage: if `photoUrl` exists start at "photo", else if `email` exists start at "gravatar", else "initials".
- Use `useEffect` to reset stage when photoUrl/email change.
- Render:
  - If stage is "photo" or "gravatar": render `<img>` with the appropriate URL (from `getAvatarUrl`). Set `onError` handler to advance to next stage: "photo" -> try "gravatar" (if email exists) or "initials", "gravatar" -> "initials".
  - If stage is "initials": render the initials circle.
- Initials: split `name` by space, take first char of first word + first char of last word, uppercase. Use a deterministic hue from name (same `getAvatarGradient` pattern from profile-header.tsx: sum char codes % 360).
- Initials circle styling: `background: linear-gradient(...)` from hue, `border: 2px solid var(--border-default)` (for sm/md) or `border: 3px solid var(--border-default)` (for lg), white text color `var(--text-primary-ds, var(--text-primary, #e8e4dc))`, rounded-full.
- For lg size: use font-serif text-3xl font-semibold (matching current profile-header.tsx).
- For sm size: use text-[10px] font-semibold.
- For md size: use text-sm font-semibold.
- The `<img>` should have `rounded-full object-cover` and explicit width/height, plus `alt={name}`.

**1c. Update `src/types/database.ts` ContactData interface:**

Add `photo_url?: string;` field to the `ContactData` interface.

**1d. Update `src/components/prospect/profile-view.tsx` Prospect interface:**

Add `photo_url?: string;` to the `contact_data` type within the local Prospect interface so it can be passed through to ProfileHeader.

**1e. Update `src/lib/lists/types.ts` ListMember.prospect:**

Add `photo_url?: string | null;` and `email?: string | null;` is already there (as `email`). Also add `first_name?: string | null;` and `last_name?: string | null;` — but actually `name` (full_name) is already there and that is enough for initials. Just add `photo_url?: string | null;` to the prospect sub-interface.
  </action>
  <verify>
    <automated>cd /Users/aymanbaig/Desktop/Manual\ Library.noSync/PGL-main && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>
    - `getAvatarUrl` returns photo_url directly when present, Gravatar URL when email exists, null otherwise
    - ProspectAvatar renders img with onError cascade or initials circle
    - ContactData type includes photo_url field
    - ListMember.prospect type includes photo_url field
    - TypeScript compiles with no errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire avatar into profile header, list table, data queries, and mock enrichment</name>
  <files>
    src/components/prospect/profile-header.tsx,
    src/lib/prospects/queries.ts,
    src/app/api/apollo/bulk-enrich/route.ts,
    src/app/[orgId]/lists/components/list-member-table.tsx,
    src/lib/lists/queries.ts
  </files>
  <action>
**2a. Update `src/components/prospect/profile-header.tsx`:**

- Add `import { ProspectAvatar } from "./prospect-avatar";`
- Extend the local `Prospect` interface to include:
  ```
  contact_data?: { photo_url?: string; personal_email?: string; phone?: string; } | null;
  work_email: string | null;
  ```
  (work_email is already there)
- Replace the existing avatar `<div>` block (the `h-28 w-28 rounded-full` div with `{initials}` inside, lines ~92-101) with:
  ```tsx
  <ProspectAvatar
    name={prospect.full_name}
    photoUrl={prospect.contact_data?.photo_url}
    email={prospect.work_email || prospect.contact_data?.personal_email}
    size="lg"
  />
  ```
- Remove the now-unused `getInitials` and `getAvatarGradient` functions from this file (they are now internal to ProspectAvatar).

**2b. Update `src/components/prospect/profile-view.tsx` ProfileHeader usage:**

The ProfileView already passes `prospect` to ProfileHeader. The prospect page uses `select('*')` so contact_data is already fetched. The profile-view Prospect interface was already updated in Task 1 to include `photo_url` in contact_data. No code changes needed here beyond the type update from Task 1 — just verify the data flows through.

**2c. Update `src/lib/prospects/queries.ts` `upsertProspectFromApollo`:**

After the prospect is upserted (line ~182, `return upsertProspect(tenantId, input)`), add a step to store `photo_url` in `contact_data` if available. Modify the function:

- After the upsert call, if `person.photo_url` exists, update the prospect's `contact_data` to include `photo_url`. Use the admin client (already available) to do a targeted JSONB merge:
  ```typescript
  if (person.photo_url) {
    const adminClient = createAdminClient();
    // Read existing contact_data, merge photo_url, write back
    const { data: existing } = await adminClient
      .from("prospects")
      .select("contact_data")
      .eq("id", result.id)
      .single();
    const existingData = (existing?.contact_data as Record<string, unknown>) || {};
    await adminClient
      .from("prospects")
      .update({
        contact_data: { ...existingData, photo_url: person.photo_url },
      })
      .eq("id", result.id);
  }
  ```
  Actually, simpler approach: save the result of `upsertProspect`, then conditionally update contact_data. The function already returns the prospect. Store the result in a variable first, then conditionally update, then return.

**2d. Update `src/app/api/apollo/bulk-enrich/route.ts` mock enrichment:**

In the `generateMockPerson` function (line ~43), replace `photo_url: undefined` with:
```typescript
photo_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=1a1a1a&color=d4af37&size=96`,
```
This generates a gold-on-dark placeholder avatar consistent with the design system.

**2e. Update `src/lib/lists/queries.ts` `getListMembers`:**

In the Supabase select for `getListMembers` (line ~144, the `prospects (...)` subquery), add `contact_data` to the selected fields:
```
prospects (
  id,
  full_name,
  first_name,
  last_name,
  title,
  company,
  location,
  work_email,
  work_phone,
  linkedin_url,
  enrichment_status,
  contact_data
)
```

Update the `RawProspect` type (line ~165) to include:
```typescript
contact_data: { photo_url?: string } | null;
```

Update the member mapping (line ~193-213) to extract photo_url and pass email:
```typescript
prospect: {
  id: raw.id,
  name: raw.full_name,
  title: raw.title,
  company: raw.company,
  location: raw.location,
  email: raw.work_email,
  email_status: null,
  phone: raw.work_phone,
  linkedin_url: raw.linkedin_url,
  enrichment_status: raw.enrichment_status,
  photo_url: (raw.contact_data as { photo_url?: string } | null)?.photo_url ?? null,
}
```

Do the same for the `addProspectToList` function's select and mapping.

**2f. Update `src/app/[orgId]/lists/components/list-member-table.tsx`:**

- Add `import { ProspectAvatar } from "@/components/prospect/prospect-avatar";`
- In the desktop table's Prospect cell (around line ~178), wrap the existing content in a flex container and prepend the avatar. Replace the current cell contents:

  Before (current):
  ```tsx
  <div className="flex items-center gap-2 min-w-0">
    <EnrichmentDot status={member.prospect.enrichment_status} />
    <div className="min-w-0 flex-1">
      ...
    </div>
  </div>
  ```

  After:
  ```tsx
  <div className="flex items-center gap-2 min-w-0">
    <ProspectAvatar
      name={member.prospect.name}
      photoUrl={member.prospect.photo_url}
      email={member.prospect.email}
      size="sm"
    />
    <EnrichmentDot status={member.prospect.enrichment_status} />
    <div className="min-w-0 flex-1">
      ...
    </div>
  </div>
  ```

- In the mobile card list (around line ~288), add the same tiny avatar before the prospect name:
  ```tsx
  <div className="flex items-center gap-2">
    <ProspectAvatar
      name={member.prospect.name}
      photoUrl={member.prospect.photo_url}
      email={member.prospect.email}
      size="sm"
    />
    <EnrichmentDot status={member.prospect.enrichment_status} />
    <Link ...>{member.prospect.name}</Link>
  </div>
  ```
  </action>
  <verify>
    <automated>cd /Users/aymanbaig/Desktop/Manual\ Library.noSync/PGL-main && pnpm build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - ProfileHeader renders ProspectAvatar at size="lg" instead of raw initials div
    - upsertProspectFromApollo persists person.photo_url into contact_data JSONB
    - Mock enrichment generates ui-avatars.com placeholder photo_url
    - List member table shows sm avatars next to prospect names (desktop + mobile)
    - getListMembers query fetches contact_data and maps photo_url into ListMember.prospect
    - pnpm build passes with zero errors
  </done>
</task>

</tasks>

<verification>
1. `pnpm build` exits 0 with no TypeScript errors
2. ProspectAvatar component exists at `src/components/prospect/prospect-avatar.tsx` and exports ProspectAvatar
3. Avatar utility exists at `src/lib/avatar.ts` and exports getAvatarUrl
4. ProfileHeader no longer has raw initials div — uses ProspectAvatar
5. ListMemberTable renders ProspectAvatar in both desktop and mobile views
6. ContactData type in database.ts includes photo_url field
</verification>

<success_criteria>
- ProspectAvatar renders with three-tier cascade: photo_url -> Gravatar -> initials
- Profile page shows avatar at 112px with photo/Gravatar/initials fallback
- List member table rows show 28px avatars next to prospect names
- Apollo upsert saves photo_url to contact_data JSONB
- Mock enrichment includes a placeholder photo_url
- Build passes clean
</success_criteria>

<output>
After completion, create `.planning/quick/260327-tzg-add-prospect-profile-photos-photo-url-gr/260327-tzg-SUMMARY.md`
</output>
