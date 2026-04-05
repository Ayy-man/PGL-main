---
phase: 28-saved-search-incremental-refresh-dismiss-and-delete
plan: "01"
subsystem: database
tags: [migration, schema, types, rls, saved-search]
dependency_graph:
  requires: []
  provides: [saved_search_prospects table DDL, Persona TypeScript types with refresh fields, SavedSearchProspect type]
  affects: [personas table]
tech_stack:
  added: []
  patterns: [RLS via dashboard, migration file convention, tenant_id isolation]
key_files:
  created:
    - supabase/migrations/20260405_saved_search_prospects.sql
  modified:
    - src/lib/personas/types.ts
decisions:
  - "Used tenant_id (not org_id) to match all other tables and JWT claim pattern"
  - "RLS policies left for Supabase dashboard per project convention — not in migration file"
  - "SavedSearchProspect and SavedSearchProspectStatus exported from personas/types.ts for co-location with Persona"
metrics:
  duration: "~5 min"
  completed_date: "2026-04-05"
  tasks_completed: 1
  tasks_total: 2
  files_changed: 2
---

# Phase 28 Plan 01: Saved Search Foundation — DB Migration + Types Summary

Database foundation for saved search prospect tracking: `saved_search_prospects` join table, new `personas` columns, and TypeScript types.

## What Was Built

Migration file `20260405_saved_search_prospects.sql` creates:
- `saved_search_prospects` join table with `tenant_id UUID NOT NULL`, unique constraint `(saved_search_id, apollo_person_id)`, status enum, and 4 indexes
- RLS enabled on new table (policies to be configured in Supabase dashboard)
- `ALTER TABLE personas ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ`
- `ALTER TABLE personas ADD COLUMN IF NOT EXISTS total_apollo_results INTEGER`

TypeScript types in `src/lib/personas/types.ts`:
- `Persona` interface updated with `last_refreshed_at: string | null` and `total_apollo_results: number | null`
- New `SavedSearchProspectStatus` union type (`'active' | 'dismissed' | 'enriched'`)
- New `SavedSearchProspect` interface matching the DB schema

## Tasks

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Create migration file + update Persona types | Complete | cb795c0 |
| 2 | Push migration to Supabase + configure RLS policies | Awaiting human action | — |

## Deviations from Plan

None — plan executed exactly as written.

## Checkpoint Status

Task 2 is a `checkpoint:human-action`. The user must:
1. Run `supabase db push` to apply the migration
2. Verify `saved_search_prospects` table exists in Supabase Dashboard with `tenant_id` column
3. Verify `personas` table has `last_refreshed_at` and `total_apollo_results` columns
4. Configure 4 RLS policies in Supabase Dashboard for `saved_search_prospects`:
   - SELECT: `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid`
   - INSERT (WITH CHECK): `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid`
   - UPDATE (USING + WITH CHECK): `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid`
   - DELETE (USING): `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid`

## Known Stubs

None.

## Threat Flags

None — new table has RLS enabled (policies to be configured in dashboard per T-28-01 mitigation plan).

## Self-Check: PASSED

- [x] `supabase/migrations/20260405_saved_search_prospects.sql` exists
- [x] `src/lib/personas/types.ts` updated with new fields and types
- [x] Task 1 commit `cb795c0` exists
- [x] Zero new TypeScript errors introduced (pre-existing errors confirmed on base commit)
