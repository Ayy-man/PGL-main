-- Phase 38: Issue Report Timeline / Audit Log
-- Append-only event history for issue_reports rows.
-- RLS policies configured in Supabase dashboard (project convention), NOT here.
--   Dashboard policies to add AFTER push:
--     1. NO SELECT policy for tenants (cannot read; admin uses service-role client)
--     2. NO INSERT/UPDATE/DELETE policy for tenants (admin writes via service-role)
--     3. Audit log must remain append-only: do NOT grant UPDATE or DELETE to any role
-- See .planning/phases/38-.../CONTEXT.md for full spec.

CREATE TABLE issue_report_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES issue_reports(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'reported','status_changed','note_added','viewed_by_admin','screenshot_expired'
  )),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('tenant','admin','system')),
  from_status TEXT,
  to_status   TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_issue_events_report_time
  ON issue_report_events(report_id, created_at ASC);

ALTER TABLE issue_report_events ENABLE ROW LEVEL SECURITY;

-- Backfill: synthesize a 'reported' event for every existing issue_reports row.
-- Idempotent via NOT EXISTS — safe to re-run.
INSERT INTO issue_report_events (report_id, event_type, actor_user_id, actor_role, created_at)
SELECT ir.id, 'reported', ir.user_id, 'tenant', ir.created_at
FROM issue_reports ir
WHERE NOT EXISTS (
  SELECT 1 FROM issue_report_events e
  WHERE e.report_id = ir.id AND e.event_type = 'reported'
);

-- Backfill: synthesize a 'status_changed -> resolved' event for already-resolved reports.
-- from_status is NULL because we cannot reconstruct the prior state.
INSERT INTO issue_report_events
  (report_id, event_type, actor_user_id, actor_role, from_status, to_status, created_at)
SELECT ir.id, 'status_changed', ir.resolved_by, 'admin', NULL, 'resolved', ir.resolved_at
FROM issue_reports ir
WHERE ir.resolved_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM issue_report_events e
    WHERE e.report_id = ir.id
      AND e.event_type = 'status_changed'
      AND e.to_status = 'resolved'
  );
