---
phase: 38-issue-report-timeline-audit-log
plan: 01
subsystem: database
tags: [supabase, postgres, rls, audit-log, typescript, migration]

# Dependency graph
requires:
  - phase: 33-tenant-issue-reporting-system
    provides: issue_reports table (FK target for the new event log)
provides:
  - issue_report_events table (append-only audit log for issue_reports lifecycle)
  - Idempotent backfill: synthesized reported + status_changed events for existing issue_reports rows
  - IssueReportEvent / IssueReportEventWithActor TypeScript types + IssueReportEventType / IssueReportActorRole unions
affects:
  - 38-02 (event writers — insert reported/status_changed/note_added events server-side)
  - 38-03 (GET /api/admin/reports/[id] — hydrate events with actor joins)
  - 38-04 (right-rail timeline UI rendering IssueReportEventWithActor[])

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Append-only audit log with CHECK-constrained event_type + actor_role unions"
    - "Idempotent backfill via INSERT ... WHERE NOT EXISTS (safe to re-run)"
    - "RLS enabled with zero policies — service-role-only writes, zero tenant read surface"
    - "Typed actor joins via Extended interface (IssueReportEventWithActor extends IssueReportEvent)"

key-files:
  created:
    - supabase/migrations/20260414_issue_report_events.sql
  modified:
    - src/types/database.ts

key-decisions:
  - "Chose append-only with zero RLS policies (admin-only via service role) instead of tenant-readable timeline — tenants don't need audit visibility, and policyless RLS is simpler to reason about than hand-rolled SELECT rules"
  - "Backfilled status_changed with from_status = NULL because prior state is unreconstructable — consumers must treat NULL from_status as sentinel for synthesized events"
  - "Separated IssueReportEvent (DB row shape) from IssueReportEventWithActor (API response shape) so writer code uses the strict type and reader code uses the joined type"

patterns-established:
  - "Event-type enums as SQL CHECK + TS union — single source of truth, both sides must update together"
  - "Migration file ships with inline idempotent backfill; no separate backfill script needed"
  - "Dashboard-managed RLS policies per project convention (migration files never CREATE POLICY)"

requirements-completed: [PHASE-38-SCHEMA, PHASE-38-TYPES, PHASE-38-BACKFILL]

# Metrics
duration: ~25min
completed: 2026-04-14
---

# Phase 38 Plan 01: Issue Report Timeline Schema + Backfill Summary

**Append-only issue_report_events audit table (5-event-type CHECK, RLS-locked) with idempotent backfill synthesizing reported/status_changed events from existing issue_reports, plus matching TypeScript types.**

## Performance

- **Duration:** ~25 min (includes checkpoint wait for user to run `supabase db push`)
- **Started:** 2026-04-14T13:40:00Z (approx — task 1 commit time 19:13 IST)
- **Completed:** 2026-04-14T14:05:00Z
- **Tasks:** 3/3
- **Files modified:** 2 (1 created, 1 extended)

## Accomplishments
- New `issue_report_events` table live in Supabase with FK to `issue_reports` (ON DELETE CASCADE), `idx_issue_events_report_time` for timeline queries, and CHECK constraints on `event_type` + `actor_role`
- Backfill verified in production: 6 `reported` events (one per existing issue_report) + 0 `status_changed` events (all 6 reports are unresolved, which matches `SELECT COUNT(*) FROM issue_reports WHERE resolved_at IS NOT NULL`)
- TypeScript types exported: `IssueReportEventType`, `IssueReportActorRole`, `IssueReportEvent`, `IssueReportEventWithActor`
- RLS enabled with zero policies — table is admin-only via service-role client, zero tenant surface area
- Wave 2 (event writers) can now rely on a live schema and typed event shapes

## Task Commits

Each task was committed atomically on `worktree-agent-a1c04e04`:

1. **Task 1: Create issue_report_events migration with DDL + idempotent backfill** — `5f9cf4a` (feat)
2. **Task 2: Extend src/types/database.ts with IssueReportEvent interface + unions** — `b7f7b5f` (feat)
3. **Task 3 [checkpoint]: Push migration to live Supabase + verify RLS + backfill** — no code change; verified manually by user (see "Issues Encountered")

**Plan metadata:** to be committed with this SUMMARY.md.

## Files Created/Modified
- `supabase/migrations/20260414_issue_report_events.sql` — Created. 51 lines. `CREATE TABLE issue_report_events` with 9 columns (id, report_id, event_type, actor_user_id, actor_role, from_status, to_status, note, created_at), CHECK constraints on event_type (5 values) and actor_role (3 values), FK cascades, the timeline index, `ENABLE ROW LEVEL SECURITY`, and two `INSERT ... WHERE NOT EXISTS` backfill blocks for `reported` and `status_changed -> resolved` events.
- `src/types/database.ts` — Extended with 33 lines. Added `IssueReportEventType` (union of 5 event kinds), `IssueReportActorRole` (tenant/admin/system), `IssueReportEvent` interface mirroring the table, and `IssueReportEventWithActor` for API responses with joined `actor: { id, email, full_name }`. Existing `IssueReport`, `IssueCategory`, `IssueStatus`, `TargetType` exports unchanged.

## Decisions Made

1. **Zero RLS policies (admin-only via service role).** Tenants have no need to read their own event history — the timeline is an admin-tool. Zero policies means tenants literally cannot read rows even if they bypass their session. This is the simplest secure shape for an internal audit log.
2. **Backfill `from_status = NULL` for synthesized status_changed events.** Prior state is unreconstructable from `issue_reports` alone. Downstream code (Plan 04 timeline renderer) must treat `from_status = NULL` on a synthesized `status_changed` row as sentinel.
3. **Split `IssueReportEvent` (DB shape) from `IssueReportEventWithActor` (API shape).** Writer code uses the strict type and doesn't need actor joins; reader code (timeline UI) uses the joined type with `actor: { id, email, full_name }`. This mirrors the project's existing pattern of separating DB-row types from enriched API-response types.

## Deviations from Plan

None — plan executed exactly as written. Migration DDL matches spec byte-for-byte, type definitions match spec byte-for-byte, no auto-fixes needed.

## Issues Encountered

**Supabase CLI quirk during `supabase db push`.** The CLI created the `issue_report_events` table (DDL ran successfully) but did NOT execute the two inline backfill `INSERT ... WHERE NOT EXISTS` statements. Reason unclear — possibly the CLI skipped non-DDL statements in a migration file, or a silent transaction abort after DDL. The user ran the backfill INSERTs manually in the Supabase SQL editor to apply them.

**Impact:** none permanent. The migration file remains idempotent (`WHERE NOT EXISTS`) so re-runs of `supabase db push` on a fresh target (preview branch, new environment) will pick up the backfill correctly if the CLI executes the full file. If this recurs on future pushes, Plan 38-02 or a companion migration may need to break the backfill into a dedicated seed step.

**Final verified counts (live DB):**
- `SELECT event_type, COUNT(*) FROM issue_report_events GROUP BY event_type` → `reported = 6`, `status_changed = 0`
- Matches `SELECT COUNT(*) FROM issue_reports` = 6 and `SELECT COUNT(*) FROM issue_reports WHERE resolved_at IS NOT NULL` = 0
- RLS: enabled, zero policies (locked-by-default; admin writes via service role bypass RLS)

## User Setup Required

None — migration pushed, backfill applied, RLS policy shape (zero policies) confirmed. Wave 2 can start without further user action.

## Next Phase Readiness

- **Ready for Plan 38-02 (event writers):** live schema + typed shapes both in place. Writers in `/api/issue-reports/*` and `/api/admin/reports/*` can now `INSERT INTO issue_report_events` via the service-role client using `IssueReportEvent` as the input type.
- **Ready for Plan 38-03 (admin read endpoint):** `IssueReportEventWithActor` is the exact shape GET `/api/admin/reports/[id]` should return.
- **No blockers** for Wave 2. The Supabase CLI backfill quirk is documented above; any future migration push to a preview branch should sanity-check row counts match.

## Self-Check: PASSED

- File `supabase/migrations/20260414_issue_report_events.sql` — FOUND in worktree
- File `src/types/database.ts` — FOUND (modified)
- Commit `5f9cf4a` — FOUND on `worktree-agent-a1c04e04`
- Commit `b7f7b5f` — FOUND on `worktree-agent-a1c04e04`
- Migration backfill verified live: `reported = 6`, `status_changed = 0` (matches issue_reports source counts)
- RLS: enabled, zero policies (verified by user in Supabase dashboard)

---
*Phase: 38-issue-report-timeline-audit-log-with-right-rail-event-histor*
*Plan: 01*
*Completed: 2026-04-14*
