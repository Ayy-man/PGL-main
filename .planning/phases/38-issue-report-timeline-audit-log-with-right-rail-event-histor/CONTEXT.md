# Phase 38 — Issue Report Timeline / Audit Log

## Intent

Add an append-only event history for `issue_reports` and surface it as a right-rail timeline next to the Admin Actions section on the admin report detail page. Builds on Phase 33 (tenant issue reporting).

## Scope

### Data model

New table `issue_report_events` (append-only audit log):

```sql
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
CREATE INDEX idx_issue_events_report_time ON issue_report_events(report_id, created_at ASC);
ALTER TABLE issue_report_events ENABLE ROW LEVEL SECURITY;
```

- RLS enabled, no policies in migration file (project convention — configured in Supabase dashboard; admin reads via service-role client, tenants never read).
- Append-only: no UPDATE or DELETE paths from app code.
- Existing `issue_reports.resolved_by` and `issue_reports.resolved_at` stay as denormalized "latest state" cache; events table is the truth.

### Backfill (inline with schema migration)

For every existing `issue_reports` row:

- Synthesize a `reported` event using `created_at` + `user_id` with `actor_role='tenant'`.
- If `resolved_at IS NOT NULL`, also synthesize a `status_changed` event with `to_status='resolved'`, `actor_user_id=resolved_by`, `actor_role='admin'`, `created_at=resolved_at`.
- Idempotent via `INSERT ... WHERE NOT EXISTS` so migration can be re-run safely.

Intermediate transitions on existing rows are lost (nothing to recover); only future changes capture fully.

### Event writers

- **POST `/api/issues/report`** (`src/app/api/issues/report/route.ts`) — on successful insert, append `reported` event with `actor_role='tenant'`, `actor_user_id=user.id`.
- **PATCH `/api/admin/reports/[id]`** (`src/app/api/admin/reports/[id]/route.ts`):
  - Read current row, diff against body.
  - If `status` changed → insert `status_changed` event carrying `from_status`, `to_status`, and the current note.
  - Else if `admin_notes` changed → insert `note_added` event.
  - Server-side enforce: reject **400** when new status ∈ `{resolved, wontfix, duplicate}` and note is empty ("A note is required when closing an issue").
- **GET `/api/admin/reports/[id]`**:
  - Insert `viewed_by_admin` event, dedup'd to one per admin per report per 24h (`SELECT 1 FROM events WHERE report_id=? AND actor_user_id=? AND event_type='viewed_by_admin' AND created_at > now() - interval '24 hours'`; skip insert if present).
  - If `screenshot_path` is set but `createSignedUrl` returns null, insert one `screenshot_expired` event. Dedup: only if not already recorded for this specific `screenshot_path`.
  - Response includes `events[]` ordered `created_at ASC` with joined actor user (`full_name`, `email`).

### Types

Add `IssueReportEvent` interface to `src/types/database.ts` mirroring the table columns.

### UI (`src/app/admin/reports/[id]/report-detail.tsx`)

Layout change: split the **Admin Actions** section into a 2-column grid on `lg:` screens.

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    <SectionCard title="Admin Actions">{/* existing form */}</SectionCard>
  </div>
  <div className="lg:col-span-1">
    <TimelineCard events={events} />
  </div>
</div>
```

All sections above Admin Actions (header, submitter, description, target snapshot, screenshot, URL, context) stay full-width and unchanged. On screens below `lg:` the timeline stacks below the form.

**Card variants** — each event renders as a row with a left-aligned colored dot + vertical connector line, headline, optional body, and right-aligned relative timestamp (hover tooltip = absolute ISO timestamp). Newest on top.

| Event | Dot color | Headline | Body |
|---|---|---|---|
| `reported` | red | "Reported by **{tenant name}**" | category label + first 100 chars of description |
| `status_changed` | blue | "**{admin}** changed status: {from} → {to}" | note (if present, muted block) |
| `note_added` | gray | "**{admin}** added a note" | note text |
| `viewed_by_admin` | faint gray | "**{admin}** viewed" | — |
| `screenshot_expired` | amber | "Screenshot expired" | — |

**Close-requires-note UX:**

- Disable Save button when `status ∈ {resolved, wontfix, duplicate}` and notes field is empty.
- Helper text below status select: "A note is required when closing an issue."
- Triage moves (`open` ↔ `investigating`) stay free.
- Server-side validation mirrors this (see PATCH above) — UI is convenience, API is source of truth.

No pagination for v1 — volume is low.

## Constraints

- RLS policies configured in Supabase dashboard, **NOT** in migration files.
- Admin route is `super_admin` only (`app_metadata.role === 'super_admin'`).
- Supabase JS client has no real transactions — append-only log may split writes on failure; ordering preserved by `created_at` index.
- Admin writes via service-role client (`createAdminClient`), so RLS on `issue_report_events` is bypassed for admin paths.
- No tenant-facing surface — tenants never read `issue_reports` or events.

## Success criteria

- [ ] Creating a new issue report produces exactly one `reported` event.
- [ ] Admin PATCH that changes status produces a `status_changed` event with correct `from_status`, `to_status`, and the current note captured.
- [ ] Admin PATCH that only edits notes produces a `note_added` event.
- [ ] Closing (`resolved`/`wontfix`/`duplicate`) with empty note returns 400 from the API and is blocked in the UI (disabled Save button + helper text).
- [ ] Admin visiting a report detail page at most once per 24h adds a single `viewed_by_admin` event.
- [ ] Existing reports display a backfilled `reported` event (and `status_changed→resolved` where applicable) on page load after deploy.
- [ ] Timeline card renders in a right column beside Admin Actions on `lg:` screens, stacks below on mobile.

## Related files

- Existing schema: `supabase/migrations/20260410_issue_reports.sql`
- Admin detail page: `src/app/admin/reports/[id]/page.tsx`, `src/app/admin/reports/[id]/report-detail.tsx`
- Admin API: `src/app/api/admin/reports/[id]/route.ts`
- Tenant submit API: `src/app/api/issues/report/route.ts`
- Types: `src/types/database.ts`
- Phase 33 context: `.planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md`
