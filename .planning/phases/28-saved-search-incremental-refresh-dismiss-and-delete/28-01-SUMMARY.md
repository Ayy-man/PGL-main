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
  - "RLS policies configured in Supabase dashboard per project convention — not in migration file"
  - "SavedSearchProspect and SavedSearchProspectStatus exported from personas/types.ts for co-location with Persona"
metrics:
  duration: "~10 min"
  completed_date: "2026-04-05"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 28 Plan 01: Saved Search Foundation — DB Migration + Types Summary

Database foundation for saved search prospect tracking: `saved_search_prospects` join table with tenant-scoped RLS, new `personas` columns, and TypeScript types.

## What Was Built

Migration file `20260405_saved_search_prospects.sql` applied to Supabase:
- `saved_search_prospects` join table with `tenant_id UUID NOT NULL`, unique constraint `(saved_search_id, apollo_person_id)`, status enum (`active | dismissed | enriched`), and 4 indexes
- RLS enabled with all 4 policies configured in Supabase dashboard (SELECT, INSERT, UPDATE, DELETE — all scoped to `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid`)
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
| 2 | Push migration to Supabase + configure RLS policies | Complete (human-verified) | — |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — T-28-01 and T-28-02 mitigations applied: RLS enabled with tenant_id-scoped policies on all four operations; apollo_data is non-sensitive preview data protected by RLS.

## Self-Check: PASSED

- [x] `supabase/migrations/20260405_saved_search_prospects.sql` exists (cb795c0)
- [x] `src/lib/personas/types.ts` updated with new fields and types (cb795c0)
- [x] `saved_search_prospects` table live in Supabase with tenant_id column (human-verified)
- [x] `personas` table has `last_refreshed_at` and `total_apollo_results` columns (human-verified)
- [x] All 4 RLS policies configured in Supabase dashboard (human-verified)
- [x] Zero new TypeScript errors introduced
