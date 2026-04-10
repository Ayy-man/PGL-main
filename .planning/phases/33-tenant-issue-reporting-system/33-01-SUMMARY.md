---
phase: 33-tenant-issue-reporting-system
plan: "01"
subsystem: database-foundation
tags: [schema, migration, types, activity-logger, rls, storage]
dependency_graph:
  requires: []
  provides:
    - issue_reports table DDL (migration)
    - IssueReport / IssueCategory / IssueStatus / TargetType TypeScript types
    - "'issue_reported' ActionType union entry"
  affects:
    - src/types/database.ts
    - src/lib/activity-logger.ts
    - supabase/migrations/
tech_stack:
  added: []
  patterns:
    - Supabase migration with CREATE OR REPLACE FUNCTION for idempotent trigger helper
    - RLS enabled in migration; policies configured in dashboard (project convention)
key_files:
  created:
    - supabase/migrations/20260410_issue_reports.sql
  modified:
    - src/types/database.ts
    - src/lib/activity-logger.ts
decisions:
  - "set_updated_at() defined as CREATE OR REPLACE in this migration (not a shared global) so re-running is idempotent"
  - "RLS policies documented as SQL comments in migration but configured in dashboard per project convention"
  - "IssueReport.viewport typed as { w: number; h: number } | null to match CONTEXT.md JSONB shape"
metrics:
  completed_date: "2026-04-10"
  completed_tasks: 2
  total_tasks: 4
  blocked_tasks: 2
---

# Phase 33 Plan 01: Schema, Types & Foundation Summary

**One-liner:** Migration creates `issue_reports` table with 18-column DDL, `set_updated_at()` trigger, 3 partial indexes, and RLS enabled; TypeScript types and activity-logger union extended for downstream plans.

## What Was Built

### Task 1 — Migration file (`supabase/migrations/20260410_issue_reports.sql`)
- `CREATE OR REPLACE FUNCTION set_updated_at()` — idempotent plpgsql trigger helper
- `CREATE TABLE issue_reports` — 18 columns with CHECK constraints on `category` (5 values), `status` (5 values), `target_type` (5 values), and `description` length (1–5000)
- Three indexes: `idx_issue_reports_tenant_created`, `idx_issue_reports_status_created`, `idx_issue_reports_target` (partial `WHERE target_id IS NOT NULL`)
- `ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY`
- `CREATE TRIGGER issue_reports_updated_at BEFORE UPDATE`
- Comment block documenting dashboard RLS policies (INSERT only for tenants; no SELECT; admin uses service-role)

### Task 2 — TypeScript types (`src/types/database.ts`)
- `IssueCategory` union: `incorrect_data | missing_data | bad_source | bug | other`
- `IssueStatus` union: `open | investigating | resolved | wontfix | duplicate`
- `TargetType` union: `prospect | list | persona | search | none`
- `IssueReport` interface: 19 fields mirroring table schema

### Task 2 — Activity logger (`src/lib/activity-logger.ts`)
- `"issue_reported"` appended to `ActionType` union (line after `lead_owner_assigned`)
- `"issue_reported"` appended to `ACTION_TYPES` runtime array

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `1f7fbef` | feat(33-01): add issue_reports migration with set_updated_at trigger + RLS skeleton |
| 2 | `7fb2ccf` | feat(33-01): add IssueReport types to database.ts and issue_reported to ActionType |

## Blocked Tasks — Require Human Action

### Task 3: Push migration to live Supabase
- **Blocker:** Supabase CLI is not authenticated (`~/.supabase/` directory does not exist; `supabase link` returns "account does not have necessary privileges")
- **Action required:** Run `supabase login` (opens browser), then from the project root run `supabase db push`
- **Verify:** `supabase migration list` shows `20260410_issue_reports` in the Applied column

### Task 4: Manual dashboard setup (checkpoint:human-verify)
After migration is pushed, perform these in the Supabase dashboard:

**Step 1 — Create private storage bucket:**
1. Dashboard → Storage → New bucket
2. Name: `issue-reports` (hyphenated, private)
3. Public: OFF

**Step 2 — Bucket RLS policy (storage.objects INSERT):**
```sql
bucket_id = 'issue-reports'
AND (storage.foldername(name))[1] = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::text)
```

**Step 3 — Table RLS policy (issue_reports INSERT):**
```sql
tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
```

**Verification SQL (run in dashboard SQL Editor):**
```sql
-- Query 1: confirm only INSERT policy on issue_reports (expect 1 row, polcmd = 'a')
SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'issue_reports'::regclass;

-- Query 2: confirm private bucket exists (expect 1 row, public = false)
SELECT name, public FROM storage.buckets WHERE name = 'issue-reports';

-- Query 3: confirm bucket INSERT policy exists (expect 1+ rows)
SELECT polname FROM pg_policy WHERE polrelid = 'storage.objects'::regclass AND polname ILIKE '%issue-reports%';
```

## Deviations from Plan

None — Tasks 1 and 2 executed exactly as written. Tasks 3 and 4 are blocked by missing Supabase CLI authentication (not a deviation; authentication gates are expected).

## Known Stubs

None. This plan only creates schema + types — no UI or data flow that could render stubs.

## Threat Flags

None. Migration creates a new table (not a new network endpoint). RLS is enabled. No new trust boundary exposed.

## Self-Check: PARTIAL

- [x] `supabase/migrations/20260410_issue_reports.sql` — FOUND
- [x] `src/types/database.ts` — FOUND (IssueReport, IssueCategory, IssueStatus, TargetType exports confirmed)
- [x] `src/lib/activity-logger.ts` — FOUND (2 occurrences of "issue_reported" confirmed)
- [x] Commit `1f7fbef` — FOUND
- [x] Commit `7fb2ccf` — FOUND
- [ ] Migration applied to live DB — BLOCKED (Supabase CLI not authenticated)
- [ ] Private bucket `issue-reports` created — BLOCKED (awaits Task 3)
- [ ] RLS policies configured — BLOCKED (awaits Task 3)
