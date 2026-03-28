---
phase: 24-activity-log
plan: "01"
subsystem: activity-log
tags: [database, migration, typescript, activity-logging]
dependency_graph:
  requires: [22-05]
  provides: [prospect_activity table, logProspectActivity utility, activity TypeScript types]
  affects: [24-02, 24-03, 24-04, 24-05]
tech_stack:
  added: []
  patterns: [fire-and-forget logging, admin client bypass RLS, idempotent migration]
key_files:
  created:
    - supabase/migrations/20260329_prospect_activity.sql
    - src/types/activity.ts
    - src/lib/activity.ts
  modified: []
decisions:
  - "prospect_activity is a separate table from activity_log — prospect-centric with category/event_type hierarchy rather than flat action_type"
  - "Data migration uses NOT EXISTS guard for idempotency — safe to run migration multiple times"
  - "isDuplicateActivity defaults to 60-minute window for profile_viewed dedup"
  - "fire-and-forget pattern (returns null on failure) matches existing activity-logger.ts convention"
metrics:
  duration: "~92s"
  completed: "2026-03-28"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 24 Plan 01: Prospect Activity Foundation — DB Table + Types + Logger

**One-liner:** prospect_activity table with category/event_type hierarchy, RLS, data migration from activity_log, TypeScript types, and fire-and-forget logProspectActivity utility.

## What Was Built

### Task 1: SQL Migration — prospect_activity table

Created `supabase/migrations/20260329_prospect_activity.sql` with:

- **Table:** `prospect_activity` with columns: id (UUID PK), prospect_id (FK→prospects), tenant_id (FK→tenants), user_id (nullable FK→users for system events), category (CHECK: outreach/data/team/custom), event_type (TEXT), title (TEXT), note (TEXT nullable), metadata (JSONB default '{}'), event_at (TIMESTAMPTZ backdatable), created_at (TIMESTAMPTZ), triggers_status_change (BOOLEAN)
- **3 indexes:** `idx_prospect_activity_prospect_event` (prospect_id, event_at DESC), `idx_prospect_activity_tenant` (tenant_id), `idx_prospect_activity_prospect_category` (prospect_id, category)
- **RLS:** Enabled — policies configured in Supabase dashboard per project convention
- **Data migration:** INSERT from activity_log WHERE target_type='prospect', mapping action_types to categories (profile_enriched→data, all others→team) and event_types (status_updated→status_changed, etc.). UUID regex guard for safety. NOT EXISTS guard for idempotency.

### Task 2: TypeScript Types + Shared Utility

**`src/types/activity.ts`** exports:
- `ActivityCategory` union: 'outreach' | 'data' | 'team' | 'custom'
- `OutreachEventType`, `DataEventType`, `TeamEventType`, `CustomEventType` sub-unions
- `EventType` union (all four combined)
- `ProspectActivity` interface (mirrors DB row)
- `CreateActivityParams` interface (camelCase params for utility)
- `CATEGORY_COLORS` constant (dot color + accent + label per category)
- `EVENT_TITLES` partial map (event_type → default title string)

**`src/lib/activity.ts`** exports:
- `logProspectActivity(params)` — writes to prospect_activity via admin client, never throws, returns ProspectActivity | null
- `isDuplicateActivity(prospectId, userId, eventType, windowMinutes?)` — checks for existing event within time window (default 60 min), fail-open on errors

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this is a pure data foundation plan. No UI components, no stub data.

## Self-Check: PASSED

- [x] `supabase/migrations/20260329_prospect_activity.sql` — FOUND
- [x] `src/types/activity.ts` — FOUND
- [x] `src/lib/activity.ts` — FOUND
- [x] Commit e3002e7 (Task 1 SQL migration) — FOUND
- [x] Commit 17c4f78 (Task 2 types + utility) — FOUND
- [x] TypeScript compile: exit 0 (no errors)
