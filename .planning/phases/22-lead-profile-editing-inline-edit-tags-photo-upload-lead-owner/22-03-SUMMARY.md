---
phase: 22-lead-profile-editing-inline-edit-tags-photo-upload-lead-owner
plan: "03"
subsystem: api
tags: [supabase, nextjs, zod, rls, storage, activity-logging]

# Dependency graph
requires:
  - phase: 22-01
    provides: prospect_tags table + manual_* columns on prospects + updated_by field
provides:
  - PATCH /api/prospects/[prospectId]/profile — field-level manual edits with Zod validation
  - GET /api/prospects/[prospectId]/tags — list tags + optional tenant-wide suggestions
  - POST /api/prospects/[prospectId]/tags — add tag with lowercase normalization, 409 on duplicate
  - DELETE /api/prospects/[prospectId]/tags — remove tag by normalized name
  - POST /api/prospects/[prospectId]/photo — upload to Storage, save manual_photo_url via RLS client
affects:
  - 22-04 (UI wiring — components call these routes)
  - 22-05 (lead owner assignment UI calls PATCH route with lead_owner_id)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Auth pattern: createClient() + getUser() + tenant_id from app_metadata
    - Storage upload: admin client for Storage, user client for DB update
    - Activity logging: fire-and-forget with .catch(() => {})
    - Tag normalization: .trim().toLowerCase() before insert/delete

key-files:
  created:
    - src/app/api/prospects/[prospectId]/profile/route.ts
    - src/app/api/prospects/[prospectId]/tags/route.ts
    - src/app/api/prospects/[prospectId]/photo/route.ts
  modified: []

key-decisions:
  - "Use createClient() (RLS) for all DB ops in profile and tags routes — no admin client needed"
  - "Admin client only for Supabase Storage upload in photo route — Storage bypasses RLS"
  - "Tag normalization to lowercase on both POST and DELETE to ensure consistency"
  - "SVG excluded from photo uploads (security risk — SVGs can contain scripts)"
  - "lead_owner_id in PATCH body triggers lead_owner_assigned activity type instead of profile_edited"
  - "Photo route uses upsert: true so re-uploads replace existing photo at same path"

patterns-established:
  - "Shared auth helper pattern in tags route — authenticate() returns {supabase, user, tenantId, authError}"
  - "Set deduplication: use Array.from(new Set(...)) not spread syntax for TS downlevelIteration compatibility"

requirements-completed: [EDIT-01, EDIT-02, EDIT-08, EDIT-09]

# Metrics
duration: 3min
completed: 2026-03-27
---

# Phase 22 Plan 03: Profile API Routes Summary

**Three backend routes for prospect profile mutations: Zod-validated PATCH for 14 manual fields, tag CRUD with lowercase normalization and duplicate handling, and photo upload to Supabase Storage with RLS-enforced DB update**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-27T19:25:17Z
- **Completed:** 2026-03-27T19:27:47Z
- **Tasks:** 2
- **Files modified:** 3 (all new)

## Accomplishments
- PATCH /profile validates 14 manual_* fields + pinned_note + lead_owner_id via Zod, sets updated_at/updated_by, fires appropriate activity type
- Tags route handles GET (with optional suggestions), POST (lowercase normalization, 409 on duplicate), DELETE — all via RLS user client
- Photo route correctly splits: admin client for Storage upload, user client for DB update enforced by RLS

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PATCH /api/prospects/[prospectId]/profile route** - `de11bea` (feat)
2. **Task 2: Create tags route (GET/POST/DELETE) + photo upload route (POST)** - `5923f4b` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/app/api/prospects/[prospectId]/profile/route.ts` - PATCH endpoint for field-level manual edits with Zod validation
- `src/app/api/prospects/[prospectId]/tags/route.ts` - GET/POST/DELETE tag CRUD with lowercase normalization and suggestions
- `src/app/api/prospects/[prospectId]/photo/route.ts` - POST photo upload to Storage general bucket, saves manual_photo_url

## Decisions Made
- Used `createClient()` (not admin) for all profile/tags DB ops — RLS provides tenant isolation without need for admin bypass
- Admin client used exclusively for Storage upload in photo route — Storage requires service role
- SVG excluded from photo uploads (can contain JavaScript)
- `lead_owner_id` in PATCH body triggers `lead_owner_assigned` activity type for audit trail distinction
- Photo path is `prospect-photos/{prospectId}.{ext}` with upsert so re-uploads replace existing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript Set spread for downlevel compilation**
- **Found during:** Task 2 build verification
- **Issue:** `[...new Set(array)]` fails with `Type error: Type 'Set<any>' can only be iterated through when using the '--downlevelIteration' flag`
- **Fix:** Replaced with `Array.from(new Set(array))` which is compatible without compiler flags
- **Files modified:** src/app/api/prospects/[prospectId]/tags/route.ts
- **Verification:** Build passed after fix
- **Committed in:** 5923f4b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor TypeScript compatibility fix, no functional change.

## Issues Encountered
- TypeScript Set spread syntax incompatible with project's tsconfig target — fixed with Array.from()

## User Setup Required
None - no external service configuration required. The `general` Supabase Storage bucket already exists from previous phases.

## Next Phase Readiness
- All three routes are complete and returning correct shapes
- Plan 04 (UI wiring) can now call these routes from EditableField, TagInput, and PhotoUpload components
- Plan 05 (lead owner assignment) can call PATCH route with lead_owner_id field

---
*Phase: 22-lead-profile-editing-inline-edit-tags-photo-upload-lead-owner*
*Completed: 2026-03-27*

## Self-Check: PASSED

- FOUND: src/app/api/prospects/[prospectId]/profile/route.ts
- FOUND: src/app/api/prospects/[prospectId]/tags/route.ts
- FOUND: src/app/api/prospects/[prospectId]/photo/route.ts
- FOUND commit: de11bea (Task 1)
- FOUND commit: 5923f4b (Task 2)
- Build: PASSED (pnpm build --no-lint)
