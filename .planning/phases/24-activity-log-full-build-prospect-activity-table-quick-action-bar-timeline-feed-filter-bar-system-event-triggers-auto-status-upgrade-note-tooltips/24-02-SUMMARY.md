---
phase: 24-activity-log
plan: "02"
subsystem: api
tags: [activity-log, crud, api-routes, prospect-activity, pagination]
dependency_graph:
  requires: [24-01]
  provides: [activity-api-routes]
  affects: [24-03, 24-04, 24-05]
tech_stack:
  added: []
  patterns: [zod-validation, rls-scoped-client, keyset-pagination, fire-and-forget-admin-write]
key_files:
  created:
    - src/app/api/prospects/[prospectId]/activity/route.ts
    - src/app/api/prospects/[prospectId]/activity/[eventId]/route.ts
  modified: []
decisions:
  - "Used profiles table join for user display names in GET response users map"
  - "logProspectActivity (admin client) used for POST write to bypass RLS"
  - "RLS-scoped client used for GET/PATCH/DELETE reads — tenant isolation automatic"
  - "hasMore = events.length === limit (client-side check, no extra COUNT query)"
metrics:
  duration: "~3 min"
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 24 Plan 02: Activity CRUD API Routes Summary

**One-liner:** Full CRUD API for prospect_activity — GET with keyset pagination + category filter, POST via logProspectActivity, PATCH note-only edit, DELETE with 404 guard.

## What Was Built

Two API route files providing all four HTTP methods for the `prospect_activity` table:

**`src/app/api/prospects/[prospectId]/activity/route.ts`** (GET + POST):
- `GET`: Lists events for a prospect ordered by `event_at` DESC. Supports `?category=outreach,data` (comma-separated `.in()` filter), `?limit=N` (default 50, max 200), `?cursor=ISO_date` (keyset pagination via `.lt('event_at', cursor)`). Joins `profiles` table to return a `users` map of `{ user_id -> { full_name } }`. Response shape: `{ events, users, hasMore }`.
- `POST`: Validates body with zod (category, eventType, title, note, metadata, eventAt, triggersStatusChange). Uses `logProspectActivity` from `src/lib/activity.ts` for the insert (admin client, bypasses RLS). Returns 201 with created event.

**`src/app/api/prospects/[prospectId]/activity/[eventId]/route.ts`** (PATCH + DELETE):
- `PATCH`: Validates body with zod (note: string|null). Updates `note` on the matching row (filtered by `id` + `prospect_id`). Returns updated event or 404 if not found.
- `DELETE`: Deletes matching row (filtered by `id` + `prospect_id`). Returns `{ success: true }` or 404 if row didn't exist.
- Both use async params: `Promise<{ prospectId: string; eventId: string }>` (Next.js 15 pattern).

All four handlers share the `authenticate()` helper pattern from the tags route — returns 401 on auth failure or missing tenant ID.

## Commits

| Hash | Message |
|------|---------|
| `0e156cd` | feat(24-02): create GET + POST activity route |
| `ee7e5d3` | fix(24-02): use z.record(z.string(), z.unknown()) for Zod v4 compat |
| `d929341` | feat(24-02): create PATCH + DELETE single activity event route |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed z.record() call for Zod v4 compatibility**
- **Found during:** Task 1 TypeScript check
- **Issue:** `z.record(z.unknown())` is invalid in Zod v4 — requires two type arguments
- **Fix:** Changed to `z.record(z.string(), z.unknown())` in createSchema metadata field
- **Files modified:** `src/app/api/prospects/[prospectId]/activity/route.ts`
- **Commit:** `ee7e5d3`

## Known Stubs

None — all handlers write to and read from real `prospect_activity` table via Supabase. No hardcoded data or placeholder responses.

## Self-Check: PASSED

- `src/app/api/prospects/[prospectId]/activity/route.ts` — exists, exports GET and POST
- `src/app/api/prospects/[prospectId]/activity/[eventId]/route.ts` — exists, exports PATCH and DELETE
- Commits `0e156cd`, `ee7e5d3`, `d929341` — all present in git log
