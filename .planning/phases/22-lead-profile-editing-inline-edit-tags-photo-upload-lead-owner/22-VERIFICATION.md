---
phase: 22-lead-profile-editing-inline-edit-tags-photo-upload-lead-owner
verified: 2026-03-27T00:00:00Z
status: gaps_found
score: 7/9 must-haves verified
gaps:
  - truth: "Wealth tier dropdown allows manual override of wealth tier on the profile"
    status: failed
    reason: "manual_wealth_tier column exists in DB and API route schema, but no UI control (dropdown or InlineEditField) is wired in profile-header.tsx or profile-view.tsx. The phase goal explicitly calls for 'wealth tier dropdown'."
    artifacts:
      - path: "src/components/prospect/profile-header.tsx"
        issue: "No manual_wealth_tier field rendered — neither as InlineEditField nor as a WealthTierDropdown"
      - path: "src/components/prospect/profile-view.tsx"
        issue: "No wealth tier edit handler or state variable present"
    missing:
      - "Add manual_wealth_tier to the Prospect interface in profile-header.tsx"
      - "Add a WealthTier dropdown or InlineEditField (with enum validation: low / medium / high / ultra_high) in the ProfileHeader card"
      - "Add wealth tier save handler in profile-view.tsx that calls handleFieldSave('manual_wealth_tier', value)"

  - truth: "LinkedIn URL is editable inline on the profile"
    status: failed
    reason: "manual_linkedin_url column is in the DB migration, TypeScript types, and accepted by the PATCH route schema, but no InlineEditField for linkedin_url is rendered in profile-header.tsx."
    artifacts:
      - path: "src/components/prospect/profile-header.tsx"
        issue: "manual_linkedin_url is declared in the local Prospect interface but no InlineEditField renders it (only a static linkedin_url field remains in the header if present)"
    missing:
      - "Add an InlineEditField for manual_linkedin_url (type='url') in the contact info section of ProfileHeader"
      - "Wire onFieldSave('manual_linkedin_url', v) as the save handler"

human_verification:
  - test: "Inline edit save + gold flash"
    expected: "Clicking pencil on Name/Title/Company fields switches to input, pressing Enter saves to DB and briefly shows a gold ring flash around the field"
    why_human: "Timing-dependent visual feedback (gold flash at 500ms) cannot be verified programmatically"
  - test: "Avatar upload"
    expected: "Clicking the avatar circle opens the OS file picker; selecting a PNG/JPG/WebP uploads to Supabase Storage and updates the displayed avatar"
    why_human: "File upload interaction requires a real browser and Supabase Storage credentials"
  - test: "Tag autocomplete"
    expected: "Typing in the tag field shows a dropdown of existing tenant tags as suggestions"
    why_human: "Requires live DB data and interactive browser session"
  - test: "RBAC: assistant read-only"
    expected: "When logged in as the 'assistant' role, no pencil icons appear and no edit controls are rendered anywhere in the profile card"
    why_human: "Requires role-based auth session — cannot simulate in grep/build check"
  - test: "Optimistic UI revert on failure"
    expected: "If the PATCH API returns an error, the field reverts to its prior value and stays in editing mode"
    why_human: "Requires simulating a server error in a live session"
---

# Phase 22: Lead Profile Editing Verification Report

**Phase Goal:** Add inline editing to prospect profiles: manual_* override columns on prospects table, InlineEditField component (pencil-on-hover, input mode, gold flash save), AvatarUpload for photo, LeadOwnerSelect dropdown, TagInput wired to prospect_tags table, RBAC gating (assistant canEdit=false). Display logic: manual_field ?? enriched_field ?? null.
**Verified:** 2026-03-27
**Status:** gaps_found — 2 missing UI elements (wealth tier dropdown, LinkedIn URL inline edit)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Prospects table has manual_* override columns for all editable fields | VERIFIED | `supabase/migrations/20260328_prospect_editing.sql` adds 16 columns including all manual_* fields, pinned_note, lead_owner_id, updated_by |
| 2 | prospect_tags table exists with RLS and unique index on (prospect_id, tenant_id, lower(tag)) | VERIFIED | Migration creates table with correct unique index and `ALTER TABLE prospect_tags ENABLE ROW LEVEL SECURITY` |
| 3 | TypeScript Prospect interfaces include all new columns | VERIFIED | `src/types/database.ts` lines 81-96 and `src/lib/prospects/types.ts` lines 29-44 both updated |
| 4 | Activity logger supports 5 new action types | VERIFIED | `src/lib/activity-logger.ts` lines 25-29 (union) and 53-57 (array) both contain all 5 types; `src/types/database.ts` ActivityActionType updated |
| 5 | InlineEditField, AvatarUpload, LeadOwnerSelect, resolveField all exist and are substantive | VERIFIED | All 4 files exist with full implementations; CSS group-hover used throughout; RBAC isEditable prop present in all 3 components |
| 6 | API routes for PATCH profile, GET/POST/DELETE tags, POST photo are wired to DB | VERIFIED | All 3 routes present; profile route uses createClient (not admin); photo route uses admin for Storage only; tags route has toLowerCase normalization; all 3 call logActivity |
| 7 | Profile header renders InlineEditField for name, title, company, email, phone, city, state, country | VERIFIED | 9 InlineEditField usages in profile-header.tsx (import + 8 rendered fields); resolveField and isOverridden called for each; canEdit prop gating confirmed |
| 8 | Wealth tier dropdown allows manual override | FAILED | manual_wealth_tier in DB/API schema but NO UI control wired in ProfileHeader or ProfileView |
| 9 | LinkedIn URL is editable inline on the profile | FAILED | manual_linkedin_url in DB/API/types but no InlineEditField rendered for it in ProfileHeader |

**Score:** 7/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260328_prospect_editing.sql` | DB schema for manual_* columns, prospect_tags, prospect_custom_fields | VERIFIED | All columns present; prospect_tags has unique index on (prospect_id, tenant_id, lower(tag)); RLS enabled |
| `src/types/database.ts` | Prospect interface with manual_* fields + ActivityActionType with 5 new types | VERIFIED | Lines 81-96 (fields) and 238-242 (action types) |
| `src/lib/prospects/types.ts` | Updated Prospect interface with optional manual_* fields | VERIFIED | Lines 29-44 |
| `src/lib/activity-logger.ts` | ActionType union + ACTION_TYPES array with 5 new types | VERIFIED | Lines 25-29 and 53-57 |
| `src/components/prospect/inline-edit-field.tsx` | InlineEditField with CSS hover, gold flash, RBAC gate | VERIFIED | group-hover:opacity-100 pattern, flash state, isEditable prop, no onMouseEnter/onMouseLeave |
| `src/components/prospect/avatar-upload.tsx` | AvatarUpload with camera overlay, file upload to /api/prospects/[id]/photo | VERIFIED | Camera icon with group-hover, fetch POST to /api/prospects/${prospectId}/photo, isEditable gating |
| `src/components/prospect/lead-owner-select.tsx` | LeadOwnerSelect with dropdown, Unassigned option, RBAC gate | VERIFIED | Dropdown with bg-[var(--bg-elevated,#1a1a1a)], Unassigned option, isEditable gating, outside-click handler |
| `src/lib/prospects/resolve-fields.ts` | resolveField + isOverridden helpers | VERIFIED | Both functions exported with correct logic |
| `src/app/api/prospects/[prospectId]/profile/route.ts` | PATCH with zod schema, RLS user client, activity logging | VERIFIED | profilePatchSchema defined; createClient() only; logActivity fire-and-forget |
| `src/app/api/prospects/[prospectId]/tags/route.ts` | GET/POST/DELETE with toLowerCase, 409 on duplicate, activity logging | VERIFIED | All 3 handlers; toLowerCase normalization; code "23505" handled as 409 |
| `src/app/api/prospects/[prospectId]/photo/route.ts` | POST to Storage with admin client, DB update with user client | VERIFIED | createAdminClient for Storage upload; createClient for DB update; logActivity |
| `src/app/[orgId]/prospects/[prospectId]/page.tsx` | canEdit from ROLE_PERMISSIONS, teamMembers, tags fetched | VERIFIED | Lines 49-50 (canEdit), 197-212 (parallel fetch), passed to ProfileView |
| `src/components/prospect/profile-view.tsx` | ProfileView with all callbacks, passes editing props to ProfileHeader | VERIFIED | handleFieldSave, handleTagsChange, handlePhotoUpdated, handleOwnerChange all present; all props forwarded to ProfileHeader |
| `src/components/prospect/profile-header.tsx` | ProfileHeader with InlineEditField, AvatarUpload, LeadOwnerSelect, TagInput | PARTIAL | 8 inline edit fields wired; AvatarUpload, LeadOwnerSelect, TagInput, pinned note all wired; manual_wealth_tier and manual_linkedin_url NOT rendered |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `page.tsx` | `profile-view.tsx` | canEdit + teamMembers + tags props | WIRED | Lines 223-226 pass all 4 props |
| `profile-view.tsx` | `profile-header.tsx` | Forwards canEdit + save handlers | WIRED | Lines 318-327 forward all 9 editing props |
| `profile-header.tsx` | `/api/prospects/[id]/profile` | fetch PATCH on inline edit save via onFieldSave | WIRED | profile-view.tsx handleFieldSave calls fetch PATCH; passed as onFieldSave |
| `profile-header.tsx` | `inline-edit-field.tsx` | Import and render InlineEditField | WIRED | 9 imports/usages confirmed |
| `profile-header.tsx` | `avatar-upload.tsx` | Import and render AvatarUpload | WIRED | Rendered at line 107, conditioned on canEdit |
| `profile-header.tsx` | `lead-owner-select.tsx` | Import and render LeadOwnerSelect | WIRED | Rendered at line 276, conditioned on teamMembers |
| `profile-header.tsx` | `tag-input.tsx` | Import and render TagInput | WIRED | Rendered at line 289, conditioned on canEdit |
| `tags/route.ts` | `prospect_tags` table | supabase.from('prospect_tags') | WIRED | GET, POST, DELETE all query prospect_tags |
| `photo/route.ts` | Supabase Storage general bucket | admin.storage.from('general').upload() | WIRED | Lines 106-111; path `prospect-photos/${prospectId}.${ext}` |
| `profile/route.ts` | `prospects` table | supabase.from('prospects').update() | WIRED | Line 91; RLS via tenant_id filter |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `profile-header.tsx` (InlineEditField for name) | `resolveField(prospect.manual_display_name, prospect.full_name)` | `select('*')` on prospects table in page.tsx | Yes — real DB row | FLOWING |
| `profile-header.tsx` (TagInput) | `currentTags` from `useState(tags ?? [])` | `prospect_tags` query in page.tsx lines 184-191 | Yes — real DB query | FLOWING |
| `profile-view.tsx` (handleFieldSave) | PATCH response from `/api/prospects/[id]/profile` | supabase.update() on prospects row | Yes — real DB write | FLOWING |
| `avatar-upload.tsx` (photo URL) | `currentPhotoUrl` state in profile-view.tsx | `manual_photo_url ?? contact_data.photo_url` from prospect row | Yes — real Storage URL or enriched photo | FLOWING |
| `lead-owner-select.tsx` (teamMembers) | `teamMembers` prop from page.tsx | `users` table query (canEdit only) lines 199-204 | Yes — real DB query | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: API routes are runnable but require auth session — skipping live curl checks. Module-level verification done via grep/read.

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| PATCH route exports PATCH function | `grep 'export async function PATCH' profile/route.ts` | Match found | PASS |
| Tags route exports GET, POST, DELETE | `grep 'export async function' tags/route.ts` | 3 matches | PASS |
| Photo route exports POST | `grep 'export async function POST' photo/route.ts` | Match found | PASS |
| Profile route uses session client only | No createAdminClient in profile/route.ts | Confirmed absent | PASS |
| InlineEditField has no raw mouse handlers | grep onMouseEnter/onMouseLeave | None found | PASS |
| ProfileHeader has at least 3 InlineEditField usages | Count | 8 (excludes import line) | PASS |

---

### Requirements Coverage

EDIT-01 through EDIT-10 are phase-internal requirements not listed in REQUIREMENTS.md. Based on the plan documents:

| Requirement | Plan | Description | Status | Evidence |
|-------------|------|-------------|--------|----------|
| EDIT-01 | 22-01, 22-03 | manual_* DB columns + PATCH API | SATISFIED | Migration file + profile/route.ts both present and wired |
| EDIT-02 | 22-01, 22-03 | prospect_tags table + tag routes | SATISFIED | SQL migration + tags/route.ts with GET/POST/DELETE |
| EDIT-03 | 22-02, 22-04 | InlineEditField component + profile wiring | SATISFIED | Component exists; wired for 8 fields in profile-header.tsx |
| EDIT-04 | 22-02, 22-04 | AvatarUpload + photo route wired | SATISFIED | Component + photo/route.ts both wired |
| EDIT-05 | 22-02, 22-04 | LeadOwnerSelect + owner assignment | SATISFIED | Component wired; handleOwnerChange calls PATCH |
| EDIT-06 | 22-01 | Activity logger with 5 new action types | SATISFIED | Both ActionType union and ACTION_TYPES array updated |
| EDIT-07 | 22-02, 22-04 | resolveField helper: manual ?? enriched ?? null | SATISFIED | resolveField used for every InlineEditField in ProfileHeader |
| EDIT-08 | 22-03 | Tags POST/DELETE with normalization | SATISFIED | toLowerCase() called in both POST and DELETE handlers |
| EDIT-09 | 22-03 | Photo route to Supabase Storage | SATISFIED | Admin client for Storage; user client for DB update |
| EDIT-10 | 22-04 | RBAC gating: assistant canEdit=false | SATISFIED | ROLE_PERMISSIONS used in page.tsx; isEditable=false hides all edit controls |

Phase goal also explicitly mentions: "wealth tier dropdown" — NOT satisfied. "manual overrides for contact/identity/location fields" — LinkedIn URL (a contact field) has no edit UI.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/prospect/profile-view.tsx` | 277-284 | onMouseEnter/onMouseLeave on "Find Lookalikes" button | Warning | Pre-existing behavior in a modified file; violates Phase 17 CSS hover rule. Not introduced by Phase 22 but present in a Phase 22-modified file. |
| `src/components/prospect/profile-view.tsx` | 453-464 | onMouseEnter/onMouseLeave on list membership anchor tags | Warning | Same — pre-existing in modified file. |
| `src/components/prospect/profile-view.tsx` | 499-506 | onMouseEnter/onMouseLeave on "Save Note" button | Warning | Same — pre-existing in modified file. |
| `src/components/prospect/profile-header.tsx` | 322-323 | `title="Coming Soon"` on Draft Outreach button — `disabled` + `cursor-not-allowed` | Info | Pre-existing placeholder (present before Phase 22). Not a Phase 22 regression. |

All onMouseEnter/onMouseLeave entries are pre-existing in `profile-view.tsx` — they existed before Phase 22 modifications. None were introduced by Phase 22 new files. New Phase 22 files (`inline-edit-field.tsx`, `avatar-upload.tsx`, `lead-owner-select.tsx`) are fully compliant with CSS hover pattern.

---

### Human Verification Required

#### 1. Inline Edit Save + Gold Flash

**Test:** Navigate to a prospect profile as an agent or tenant_admin. Hover over the Name field — verify a pencil icon appears. Click it. Type a new name and press Enter.
**Expected:** The input disappears, the new value is shown, and a gold ring briefly flashes around the field for ~500ms.
**Why human:** Timing-dependent CSS flash cannot be verified with grep or build checks.

#### 2. Avatar Upload

**Test:** Click the circular avatar on a prospect profile when logged in as an agent or admin.
**Expected:** OS file picker opens. After selecting a PNG/JPG/WebP image under 2MB, a loading spinner appears briefly, then the avatar updates to the uploaded image.
**Why human:** File upload interaction requires a real browser session with valid Supabase Storage credentials.

#### 3. Tag Autocomplete

**Test:** In the Tags section of the profile card, type into the TagInput field.
**Expected:** A dropdown appears showing existing tags from this tenant's other prospects.
**Why human:** Requires live DB with existing tag data and an interactive browser.

#### 4. RBAC — Assistant Read-Only

**Test:** Log in as a user with the "assistant" role and navigate to any prospect profile.
**Expected:** No pencil icons appear over any field. Avatar has no camera overlay on hover. No TagInput component — only static tag badges. No LeadOwnerSelect dropdown control.
**Why human:** Requires a real auth session with assistant role assigned.

#### 5. Optimistic UI Revert on Error

**Test:** Temporarily cause the PATCH endpoint to return a 500 (e.g., network throttle or disable the route). Edit a field and save.
**Expected:** The field immediately shows the new value (optimistic), then reverts to the original value when the error arrives and stays in editing mode with the cursor positioned.
**Why human:** Requires simulating a server error in a live session.

---

### Gaps Summary

Phase 22 is largely complete — the data foundation, API routes, editing components, and integration chain are all correctly implemented. The core inline editing experience (8 fields: name, title, company, email, phone, city, state, country), avatar upload, lead owner dropdown, tag management, pinned notes, and RBAC gating all exist and are wired end-to-end.

Two UI gaps exist where the data layer was built but the UI layer was not completed:

1. **Wealth Tier Dropdown (Blocker for Phase Goal):** The ROADMAP Phase 22 goal explicitly calls out "wealth tier dropdown" as a deliverable. `manual_wealth_tier` is in the DB migration, TypeScript types, and PATCH route schema — but there is no dropdown or InlineEditField in `profile-header.tsx` that lets a user actually set it. The column is inert from the user's perspective.

2. **LinkedIn URL Inline Edit (Gap):** `manual_linkedin_url` is in the DB, types, and API schema, and the Prospect interface in `profile-header.tsx` declares the field — but no `InlineEditField` is rendered for it. The "contact fields" in the profile card only show email and phone, not LinkedIn URL.

Both gaps are additive (adding UI controls to a pre-existing component) and do not require new API routes or DB changes.

The three `onMouseEnter/onMouseLeave` patterns in `profile-view.tsx` are pre-existing violations carried forward from earlier phases — they are warnings, not blockers, and were not introduced by Phase 22.

---

_Verified: 2026-03-27_
_Verifier: Claude (gsd-verifier)_
