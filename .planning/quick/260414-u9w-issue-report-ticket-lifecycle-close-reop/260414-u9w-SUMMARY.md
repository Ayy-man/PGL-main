---
phase: 260414-u9w-issue-report-ticket-lifecycle-close-reop
plan: 01
subsystem: admin/issue-reports
tags: [admin, issue-reports, lifecycle, timeline, audit]

requires:
  - src/app/api/admin/reports/[id]/route.ts (existing PATCH handler)
  - src/app/api/admin/reports/route.ts (existing GET handler)
  - src/app/admin/reports/[id]/report-detail.tsx (existing detail page)
  - src/app/admin/reports/[id]/timeline-card.tsx (existing timeline renderer)
  - src/app/admin/reports/page.tsx (existing list page)
  - src/app/admin/reports/reports-table.tsx (existing client table)
  - issue_reports table (no schema changes)
  - issue_report_events table (no schema changes — reuses status_changed event_type)

provides:
  - Explicit "Close ticket" button with inline resolution form (status + required note)
  - "Reopen ticket" button on closed tickets
  - Server-side clear of resolved_at + resolved_by on reopen
  - GET ?filter=overdue_closed query param on /api/admin/reports
  - Distinct timeline rendering for close (green) vs reopen (red) events
  - Overdue Closed section on admin reports list (>30 days resolved)
  - Chronological ## Timeline section in Copy-full-report markdown export

affects:
  - /admin/reports (page) — new Overdue Closed section above main table
  - /admin/reports/[id] (page) — new Close/Reopen buttons, updated timeline rendering, timeline in export
  - /api/admin/reports (GET) — new ?filter=overdue_closed param
  - /api/admin/reports/[id] (PATCH) — clears resolution metadata on reopen

tech-stack:
  added: []
  patterns:
    - "Client-side close dialog rendered inline in Admin Actions card (no modal/portal)"
    - "window.prompt for optional reopen reason (null=abort, empty=reopen without reason)"
    - "Parallel Supabase queries at SSR via Promise.all for main-list + overdue-closed"
    - "Reuse status_changed event type with from/to — UI labels distinguish direction"

key-files:
  created: []
  modified:
    - src/app/api/admin/reports/[id]/route.ts
    - src/app/api/admin/reports/route.ts
    - src/app/admin/reports/[id]/report-detail.tsx
    - src/app/admin/reports/[id]/timeline-card.tsx
    - src/app/admin/reports/page.tsx
    - src/app/admin/reports/reports-table.tsx

decisions:
  - "Inline close dialog (not modal) — keeps flow in the sticky sidebar where status context is, avoids portal/focus-trap complexity for an already cramped page"
  - "window.prompt for reopen reason — keeps the 'reopen is lightweight' UX (one button, one optional field). Inline form would duplicate the close dialog pattern for a rarer action"
  - "Reuse status_changed with from/to (no new event_type) — per plan constraint, no schema migration. UI derives close vs reopen vs generic from CLOSED_STATUSES set"
  - "Overdue Closed uses direct Supabase query at SSR, not the new /api/admin/reports?filter=overdue_closed endpoint — the endpoint is available for future client-side refresh but SSR avoids a network roundtrip"
  - "Reopen does NOT auto-replace admin_notes — only prepends 'Reopened: <reason>' when user supplies a reason; empty reason leaves notes untouched. Preserves the close note in the audit trail"

metrics:
  duration: ~25 min
  tasks_completed: 3 of 3 auto tasks (Task 4 is a human-verify checkpoint)
  files_modified: 6
  net_loc: +522 / -40 = +482 net
  completed_date: 2026-04-14

commits:
  - 547ad37: server reopen clears resolved_at/by + overdue_closed list filter (Task 1)
  - 6abe626: Close/Reopen buttons + distinct timeline labels + export timeline (Task 2)
  - b138e62: Overdue Closed section on admin reports list (Task 3)
---

# Quick Task 260414-u9w: Issue Report Ticket Lifecycle (Close/Reopen + Overdue Closed + Timeline Export) Summary

Ships explicit ticket lifecycle controls: a Close button with required resolution note, a Reopen button that clears resolved metadata server-side, distinct green/red timeline dots for close vs reopen transitions, an Overdue Closed review queue on the admin list page, and a chronological Timeline section in the Copy-full-report export — all reusing the existing `status_changed` event type (no schema migration).

## What Shipped

### Task 1 — Server (commit 547ad37)
**`src/app/api/admin/reports/[id]/route.ts`**
- Added a reopen branch in the PATCH update-payload builder: when `CLOSED_STATUSES.includes(current.status)` AND `!CLOSED_STATUSES.includes(body.status)`, set `update.resolved_by = null` and `update.resolved_at = null`. Evaluated BEFORE the resolve branch (mutually exclusive).
- Close-requires-note guard remains unchanged — correctly skipped on reopen because `nextStatus` is open/investigating.
- Existing `status_changed` event insert naturally captures reopen as a normal status transition with `from_status=resolved/wontfix/duplicate` and `to_status=open/investigating`. No new event_type.

**`src/app/api/admin/reports/route.ts`**
- Added `?filter=overdue_closed` query param. When set: `status IN (resolved,wontfix,duplicate)` + `resolved_at < now-30d` + `order by resolved_at ASC` (oldest overdue first).
- Category and explicit closed-status narrowing still apply on top (e.g. `?filter=overdue_closed&status=wontfix&category=bug`).
- For non-overdue queries, default ordering (created_at DESC) preserved.

### Task 2 — Report Detail UI (commit 6abe626)
**`src/app/admin/reports/[id]/report-detail.tsx`**
- Added `closeDialogOpen`, `closeStatus` (default `resolved`), `closeNote` state.
- New `handleClose` handler: PATCHes `{status: closeStatus, admin_notes: closeNote}`, merges response into local state, syncs top-level status/notes controls, appends new event to timeline, clears the dialog.
- New `handleReopen` handler: `window.prompt("Reason for reopening (optional)")`. On null (Cancel) → abort. On string → PATCHes `{status: "open"}` plus optional `admin_notes: "Reopened: <reason>"` if reason non-empty. Merges nulled `resolver` into local state so Context panel immediately reflects reopen.
- New `buildTimelineSection()` memoized callback: formats each event as `- [timestamp] actor label — "note"`. Labels by event_type: `reported (Category)`, `closed as Resolved (resolved→open)`, `reopened (resolved→open)`, `changed status (X→Y)`, `added note`, `viewed`, `screenshot expired`. System/tenant actors fall back to role name when no user joined.
- `buildFullLog` now splices Timeline section before the debug-prompt append. Admin section already had resolved_at/resolved_by metadata — left as-is.
- Admin Actions card now shows buttons: Save (always), Close ticket (when `!reportIsClosed`, toggles inline dialog), Reopen ticket (when `reportIsClosed`). Close dialog: resolution dropdown (resolved/wontfix/duplicate) + required textarea + Confirm/Cancel.

**`src/app/admin/reports/[id]/timeline-card.tsx`**
- Added top-of-file `CLOSED_STATUSES` constant.
- `status_changed` branch now branches on close/reopen direction:
  - `isClose` (to_status ∈ closed) → green dot (`var(--success, #22c55e)`) + headline `"<actor> closed as <StatusLabel>"`.
  - `isReopen` (from ∈ closed AND to ∉ closed) → red dot (`var(--destructive, #ef4444)`) + headline `"<actor> reopened ticket"`.
  - Else → existing blue dot + `"changed status: from → to"`.
- Note body preserved for all three variants.

### Task 3 — Admin List (commit b138e62)
**`src/app/admin/reports/page.tsx`**
- `Promise.all` pulls main reports query AND overdue-closed query in parallel at SSR.
- Overdue query: `status IN (resolved,wontfix,duplicate)` + `resolved_at < now-30d` + `order by resolved_at ASC` + `limit 25`.
- New `<section>` renders only when `overdueClosed.length > 0`, with `opacity-90`, h2 "Overdue Closed (N)" + subtitle "Closed over 30 days ago — review for archival".

**`src/app/admin/reports/reports-table.tsx`**
- `ReportRow` extended with `resolved_at?: string | null`.
- Exported new `OverdueClosedRow` type (where `resolved_at` is required non-null).
- Exported new `OverdueClosedList` component: compact 5-column desktop table (Tenant, Category, Closed, Status, View) with mobile card fallback. Muted text on secondary columns, full-color StatusBadge, `formatRelativeTime(resolved_at)` for closed-ago. View link uses neutral bg instead of gold to keep the section de-emphasized.

## Verification Summary

**Type-check (`npx tsc --noEmit`)** — Clean on all 6 modified files. Only pre-existing errors remain in `src/lib/search/__tests__/execute-research.test.ts` (unrelated to this task — out of scope per deviation rules).

**No schema changes.** `git diff e060268..HEAD -- supabase/` returns empty.
**No new event_type values.** `IssueReportEventType` union in `src/types/database.ts` unchanged (5 values).
**`issue_report_events` table untouched.**

## Deviations from Plan

None — plan executed as written. Minor in-spec choices:
- Close dialog uses a small in-card expanding panel (as plan suggested, not a modal).
- Reopen used `window.prompt` (as plan permitted: "prompt is acceptable per constraints").
- Overdue Closed section rendered above the main ReportsTable (plan showed this layout in the JSX sketch).

## Known Stubs

None. All new UI is backed by real data:
- Close/Reopen handlers call the live PATCH endpoint.
- OverdueClosedList is populated by a real Supabase SSR query.
- Timeline export reads the `events` state that was SSR-hydrated from the real `issue_report_events` table.

## Next Step — Task 4 (Human UAT Checkpoint)

## CHECKPOINT REACHED

**Type:** human-verify
**Plan:** 260414-u9w-01
**Progress:** 3/3 auto tasks complete — Task 4 is a blocking human-verify checkpoint

### Completed Tasks

| Task | Name                                                            | Commit  | Files                                                                                                 |
| ---- | --------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| 1    | Server — reopen clears resolved_at/by + overdue_closed filter   | 547ad37 | src/app/api/admin/reports/[id]/route.ts, src/app/api/admin/reports/route.ts                            |
| 2    | UI — Close/Reopen buttons + distinct timeline + export timeline | 6abe626 | src/app/admin/reports/[id]/report-detail.tsx, src/app/admin/reports/[id]/timeline-card.tsx            |
| 3    | Admin reports list — Overdue Closed section                     | b138e62 | src/app/admin/reports/page.tsx, src/app/admin/reports/reports-table.tsx                                |

### Current Task

**Task 4:** Verify end-to-end ticket lifecycle
**Status:** awaiting verification

### Checkpoint Details

Start a dev server and as `super_admin` on `http://localhost:3000` walk through these 14 checks:

**Close flow:**
1. Navigate to `/admin/reports`, click into an open ticket
2. Click "Close ticket" in the Admin Actions card
3. Verify the inline form appears with status pre-set to Resolved and a required note field
4. Try submitting with empty note → "Confirm close" is disabled
5. Enter a resolution note, click Confirm → status flips to Resolved, timeline prepends a new entry with green dot + "closed as Resolved"
6. Verify `resolved_at` and `resolved_by` appear in the Context collapsible

**Reopen flow:**
7. On the now-resolved ticket, click "Reopen ticket"
8. In the prompt, type a reason (or leave blank and OK)
9. Verify status flips to Open, Resolved-at/Resolved-by disappear from Context, timeline gets a new entry with red dot + "reopened ticket"

**Copy full report:**
10. Click "Copy full report" at the top of the detail page
11. Paste into any editor → verify `## Timeline` section appears with chronological lines including both the close and reopen events, plus the reporter's initial event and any admin views
12. Verify resolved_by/resolved_at metadata appears in the Admin section when the ticket is closed

**Overdue Closed (optional — requires seed data):**
13. If any ticket has `resolved_at > 30 days` old, visit `/admin/reports` → an "Overdue Closed" section appears above the main table, dimmed, listing those tickets. If no such data exists, section is hidden (not empty state)

**Server sanity:**
14. In Supabase SQL editor:
    ```sql
    SELECT event_type, from_status, to_status, note, created_at
    FROM issue_report_events
    WHERE report_id = '<the-ticket-id>'
    ORDER BY created_at;
    ```
    Verify both close and reopen are captured as `status_changed` rows with correct from/to, no new event_type rows.

### Awaiting

User to walk through checks 1-14 and either reply "approved" or describe any issue (e.g. "reopen didn't clear resolved_at", "timeline label wrong for wontfix", "copy-full-report missing Timeline section").

## Self-Check: PASSED

All three task commits exist on the worktree branch:
- 547ad37 (Task 1 server)
- 6abe626 (Task 2 UI)
- b138e62 (Task 3 list page)

All six modified files exist on disk with the intended changes. Full-tree `tsc --noEmit` shows no new errors in any target file. No schema migrations. No new event_type values. Ready for Task 4 human verification.
