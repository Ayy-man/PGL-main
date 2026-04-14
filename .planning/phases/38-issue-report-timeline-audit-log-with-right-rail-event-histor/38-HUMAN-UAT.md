---
status: partial
phase: 38-issue-report-timeline-audit-log
source: [38-VERIFICATION.md, 38-04-PLAN.md]
started: 2026-04-14T00:00:00Z
updated: 2026-04-14T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. `reported` event on new report creation
expected: Creating a new issue report produces exactly one `reported` row in `issue_report_events` with `actor_role='tenant'`. SQL verify: `SELECT event_type, actor_role FROM issue_report_events WHERE report_id = (SELECT id FROM issue_reports ORDER BY created_at DESC LIMIT 1);`
result: [pending]

### 2. `status_changed` event on status transition
expected: Admin PATCH changing status `open → investigating` (notes empty) produces `status_changed` event with `from_status='open'`, `to_status='investigating'`. SQL verify: `SELECT event_type, from_status, to_status FROM issue_report_events WHERE report_id = '{id}' ORDER BY created_at DESC LIMIT 1;`
result: [pending]

### 3. `note_added` event on notes-only change
expected: Admin PATCH editing notes only (no status change) produces `note_added` event with the note body. SQL verify: `SELECT event_type, note FROM issue_report_events WHERE report_id = '{id}' ORDER BY created_at DESC LIMIT 1;`
result: [pending]

### 4. Close-requires-note — UI + server both block
expected: Setting status to `resolved` with empty notes disables Save button with red helper text "A note is required when closing an issue." Raw fetch to PATCH with `{status:'resolved',admin_notes:''}` returns HTTP 400 and `{error: "A note is required when closing an issue"}`.
result: [pending]

### 5. `viewed_by_admin` — 24h dedup across log-out/log-in
expected: Logging out + back in + visiting same report produces exactly 1 `viewed_by_admin` event in the last hour. SQL verify: `SELECT COUNT(*) FROM issue_report_events WHERE report_id = '{id}' AND actor_user_id = '{admin_id}' AND event_type = 'viewed_by_admin' AND created_at > now() - interval '1 hour';`
result: [pending]

### 5b. `viewed_by_admin` — rapid-repeat dedup
expected: Multiple sequential refreshes of the same admin page produce exactly 1 `viewed_by_admin` event total. `n=1` on sequential refreshes is PASS; `n=2` only under extreme simultaneous double-load race is an accepted edge per Threat T-38-10.
result: [pending]

### 6. Backfilled events for existing reports
expected: Pre-existing issue_reports rows show backfilled `reported` events with `event_time = report_time`. SQL verify: `SELECT e.created_at AS event_time, r.created_at AS report_time, e.event_type, e.actor_role FROM issue_report_events e JOIN issue_reports r ON r.id = e.report_id WHERE e.event_type = 'reported' ORDER BY r.created_at LIMIT 5;` — Admin detail page for an older report shows `Reported by {tenant}` in timeline.
result: [pending]

### 7. Responsive layout
expected: At viewport ≥1024px: Admin Actions is a wider left column, TimelineCard is a narrower right column, side-by-side. At 768px: TimelineCard stacks below Admin Actions. Sections above Admin Actions (header, submitter, description, snapshot, screenshot, URL, context) remain full-width at both breakpoints.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
