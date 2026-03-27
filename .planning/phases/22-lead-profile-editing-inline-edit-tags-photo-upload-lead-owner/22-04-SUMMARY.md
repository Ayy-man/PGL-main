---
phase: 22-lead-profile-editing-inline-edit-tags-photo-upload-lead-owner
plan: "04"
subsystem: ui
tags: [react, inline-edit, rbac, supabase, typescript, next.js]

# Dependency graph
requires:
  - phase: 22-01
    provides: manual_* DB columns + prospect_tags table migration
  - phase: 22-02
    provides: InlineEditField, AvatarUpload, LeadOwnerSelect, resolve-fields components
  - phase: 22-03
    provides: PATCH /api/prospects/[id]/profile + POST/DELETE /api/prospects/[id]/tags routes

provides:
  - canEdit RBAC gate derived from user role on the server component
  - ProfileView passes canEdit + teamMembers + tags + tagSuggestions down to ProfileHeader
  - ProfileHeader renders InlineEditField for name/title/company/email/phone/city/state/country
  - ProfileHeader renders AvatarUpload (editable) or ProspectAvatar (read-only) based on canEdit
  - ProfileHeader renders LeadOwnerSelect for owner assignment
  - ProfileHeader renders TagInput for tag add/remove or read-only tag badges
  - Pinned note section rendered in profile header card
  - All editing gated by canEdit — assistants see display-only values

affects:
  - phase 22 verification
  - prospect profile page UX

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RBAC canEdit derived server-side from ROLE_PERMISSIONS and passed as prop"
    - "resolveField(manual, enriched) for display with isOverridden indicator"
    - "Optimistic tag updates with per-tag POST/DELETE + revert on failure"
    - "Parallel Promise.all for team members + tag suggestions fetch (canEdit only)"

key-files:
  created: []
  modified:
    - src/app/[orgId]/prospects/[prospectId]/page.tsx
    - src/components/prospect/profile-view.tsx
    - src/components/prospect/profile-header.tsx

key-decisions:
  - "Team members and tag suggestions fetched only when canEdit=true to avoid unnecessary DB queries for read-only users"
  - "Array.from(new Set(...)) used instead of spread operator for Set to satisfy TypeScript downlevel iteration constraints"
  - "Removed Location/Enrichment two-column grid in ProfileHeader — replaced with single Enrichment status + separate inline-editable location section"

patterns-established:
  - "canEdit gate chain: page.tsx -> ProfileView -> ProfileHeader"
  - "Photo URL state lifted to ProfileView so AvatarUpload updates propagate"

requirements-completed: [EDIT-03, EDIT-04, EDIT-05, EDIT-07, EDIT-10]

# Metrics
duration: 12min
completed: 2026-03-27
---

# Phase 22 Plan 04: Integration Summary

**Inline editing, avatar upload, lead owner, tags, and location fields wired into prospect profile via RBAC canEdit prop chain from server component through ProfileView to ProfileHeader**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-27T19:30:00Z
- **Completed:** 2026-03-27T19:42:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Server component derives `canEdit` from `ROLE_PERMISSIONS` and fetches team members + tag suggestions in parallel (only for authorized users)
- `ProfileView` lifts photo URL, tags state, and field-save/tag-change handlers; passes all to `ProfileHeader`
- `ProfileHeader` replaces static fields with `InlineEditField` for 8 editable fields (name, title, company, email, phone, city, state, country), `AvatarUpload` for photo, `LeadOwnerSelect` for owner, `TagInput` for tags, plus a pinned note section

## Task Commits

Each task was committed atomically:

1. **Task 1: Update page.tsx — fetch canEdit, team members, tags** - `2bea553` (feat)
2. **Task 2: Update ProfileView and ProfileHeader with editing capability** - `bd65abc` (feat)

**Plan metadata:** committed with SUMMARY.md

## Files Created/Modified
- `src/app/[orgId]/prospects/[prospectId]/page.tsx` - Added ROLE_PERMISSIONS import, canEdit derivation, parallel team members + tag suggestions fetch, all passed to ProfileView
- `src/components/prospect/profile-view.tsx` - Added canEdit/teamMembers/tags/tagSuggestions props, handleFieldSave/handleTagsChange/handlePhotoUpdated/handleOwnerChange callbacks, passes all to ProfileHeader
- `src/components/prospect/profile-header.tsx` - Replaced static avatar/name/title/company with InlineEditField + AvatarUpload; added email/phone/city/state/country inline edits; LeadOwnerSelect; TagInput; pinned note section

## Decisions Made
- Team members and tag suggestions fetched only when `canEdit=true` to avoid unnecessary DB queries for read-only users
- `Array.from(new Set(...))` instead of spread operator for TypeScript downlevel iteration compat (auto-fixed, Rule 1)
- Removed static Location cell from the two-column grid in ProfileHeader; replaced with dedicated Location section containing inline-editable city/state/country fields

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript Set spread not compatible with project target**
- **Found during:** Task 1 (page.tsx Set dedup for tag suggestions)
- **Issue:** `[...new Set(...)]` fails TypeScript type check: "Type 'Set<any>' can only be iterated through when using '--downlevelIteration' flag or with a '--target' of 'es2015' or higher"
- **Fix:** Changed to `Array.from(new Set(...))` which works at any target
- **Files modified:** `src/app/[orgId]/prospects/[prospectId]/page.tsx`
- **Verification:** `pnpm build --no-lint` exits 0
- **Committed in:** `bd65abc` (Task 2 commit, fix applied during build verification)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Trivial one-line fix required for TypeScript compatibility. No scope creep.

## Issues Encountered
- None beyond the TypeScript Set spread issue above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full inline editing experience is complete and wired end-to-end
- Build passes with no errors
- Phase 22 verification can now proceed against the live app

---
*Phase: 22-lead-profile-editing-inline-edit-tags-photo-upload-lead-owner*
*Completed: 2026-03-27*
