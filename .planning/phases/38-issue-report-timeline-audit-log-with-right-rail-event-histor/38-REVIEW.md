---
phase: 38-issue-report-timeline-audit-log-with-right-rail-event-histor
reviewed: 2026-04-14T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - supabase/migrations/20260414_issue_report_events.sql
  - src/types/database.ts
  - src/app/api/issues/report/route.ts
  - src/app/api/admin/reports/[id]/route.ts
  - src/app/admin/reports/[id]/page.tsx
  - src/app/admin/reports/[id]/report-detail.tsx
  - src/app/admin/reports/[id]/timeline-card.tsx
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 38: Code Review Report

**Reviewed:** 2026-04-14
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 38 adds an append-only event timeline for issue reports. The design is mostly sound: events are written via service-role client; tenant/admin writers never rely on body-supplied actor IDs; write failures are swallowed so they can't 500 the parent request; a 24h dedup and a per-path dedup are in place; close-requires-note is enforced on both the client and server. RLS posture matches the project convention (RLS enabled, policies configured in dashboard, all writes via service-role).

No Critical issues were found. Four Warnings target correctness gaps where a race, an enum-coercion, or an event-ordering edge case can corrupt the audit log or let an invalid `to_status` land in the table. Info items are hygiene and DX improvements.

XSS review of the Timeline card is clean: `note`, `description`, `full_name`, and `email` are rendered via React children interpolation (not `dangerouslySetInnerHTML`), so they are safely escaped. The existing URL fields render in `report-detail.tsx` are also safe (`href={report.page_url}` with `rel="noopener noreferrer"`, no `javascript:` guard — flagged as info).

## Warnings

### WR-01: `status_changed` event can be written with an invalid/arbitrary `to_status`

**File:** `src/app/api/admin/reports/[id]/route.ts:115-173`
**Issue:** The status enum check at line 126 runs **after** the close-requires-note guard at line 117 and, more importantly, after the update payload has already been built. But the real bug is ordering vs. the `status_changed` insert: `nextStatus` and `body.status` are used to drive the close-guard (`CLOSED_STATUSES.includes(nextStatus)`), yet `body.status` is typed as `Status` by way of a TypeScript cast from untrusted JSON. If a client POSTs `{"status":"bogus"}`, the flow is:

1. `nextStatus = body.status ?? current.status` — becomes `"bogus"`.
2. `isClosing = CLOSED_STATUSES.includes(nextStatus)` — false, so the close guard does not fire.
3. Line 126 validates the enum and returns 400 — good, the `update` never runs.

So the DB row is not corrupted. However, the same pattern is fragile: a future refactor that moves the enum check earlier or drops the 400 would write `to_status: "bogus"` straight into the audit log (the `issue_report_events.to_status` column has no CHECK constraint — only the source table does). The append-only invariant means that corruption cannot be rolled back.

**Fix:** Validate the status enum at the top of the handler (right after JSON parse), before any other logic consults `body.status`. Also add a CHECK constraint to `issue_report_events.to_status` / `from_status` so the table defends itself.

```ts
// At top of PATCH, right after body = await request.json():
if (body.status !== undefined && !(VALID_STATUSES as readonly string[]).includes(body.status)) {
  return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
}
```

```sql
-- New migration:
ALTER TABLE issue_report_events
  ADD CONSTRAINT issue_report_events_from_status_check
  CHECK (from_status IS NULL OR from_status IN ('open','investigating','resolved','wontfix','duplicate'));
ALTER TABLE issue_report_events
  ADD CONSTRAINT issue_report_events_to_status_check
  CHECK (to_status IS NULL OR to_status IN ('open','investigating','resolved','wontfix','duplicate'));
```

---

### WR-02: `viewed_by_admin` dedup has a read-modify-write race that can produce duplicate events

**File:** `src/app/admin/reports/[id]/page.tsx:51-75`
**Issue:** The dedup is a classic TOCTOU: SELECT for a recent view, then conditionally INSERT. If the same admin opens two browser tabs (or the page is re-rendered concurrently by React Server Components during navigation), both server renders can observe "no recent view" at roughly the same time and both issue an INSERT. Because the audit log is append-only, the duplicate cannot be cleaned up.

The append-only invariant elevates this from "minor cosmetic" to "log pollution that cannot be repaired." The plan explicitly calls out "one per admin per report per 24h" as the contract.

**Fix:** Enforce dedup in the DB layer with a partial unique index over a bucketed time window, then use `INSERT ... ON CONFLICT DO NOTHING`. A 24-hour bucket keyed on `date_trunc('day', created_at)` is close enough:

```sql
-- Add a deterministic bucket column or use an immutable generated column:
CREATE UNIQUE INDEX idx_issue_events_view_dedup
  ON issue_report_events (report_id, actor_user_id, (created_at::date))
  WHERE event_type = 'viewed_by_admin';
```

Then:

```ts
await admin.from("issue_report_events").insert({ ... })
  .select()  // supabase-js returns empty array on conflict with ignoreDuplicates
  // or use .upsert({ ..., onConflict: '...' , ignoreDuplicates: true })
```

Note: a strict 24-hour rolling window is harder to enforce in SQL — bucketed-by-day is the pragmatic compromise and is what most audit systems do. Alternatively, accept occasional dupes but filter them at read time in the timeline renderer.

---

### WR-03: `screenshot_expired` per-path dedup stores a user-controllable string in `note`, breaking the `note` field's semantic meaning

**File:** `src/app/admin/reports/[id]/page.tsx:80-103`
**Issue:** To dedup per-path, the code stashes `report.screenshot_path` into the event's `note` column. Two concerns:

1. **Semantic overloading.** Every other event uses `note` for the admin-typed note (rendered as tenant-visible text in the timeline UI). `timeline-card.tsx` renders `event.note` for `status_changed` and `note_added`, but not `screenshot_expired` — so today it's hidden. If someone later adds a `note` render branch for `screenshot_expired` (e.g., to show context), the storage path will leak into the UI. More subtly: the rendering in `renderVariant` does a `switch` on `event_type` and only `status_changed` / `note_added` render `note`, but a future "show note if present for all event types" refactor would surface the raw storage path.

2. **Dedup durability.** If the filename scheme ever changes (e.g., add `.webp`), the lookup key changes and old expired events won't dedupe — you'll get a new event every render until the old path churns out of existence.

**Fix:** Add a dedicated `detail` or `metadata` JSONB column (or a `subject` TEXT column) instead of overloading `note`. If you'd rather not migrate, at minimum add a comment on the event type + a UI-side guard so no future refactor surfaces `note` for `screenshot_expired`:

```ts
// timeline-card.tsx renderVariant: be explicit that note is intentionally ignored
case "screenshot_expired":
  return {
    dotColor: "#f59e0b",
    headline: <>Screenshot expired</>,
    body: null, // note holds internal dedup key; never render
  };
```

And document the convention in the migration file:

```sql
-- NOTE: screenshot_expired events store the screenshot_path in `note` as a
-- dedup key. Do NOT render `note` for this event_type in the UI.
```

---

### WR-04: `status_changed` event captures `nextNotes`, not the pre-existing note, causing stale-note drift on simultaneous status+note changes

**File:** `src/app/api/admin/reports/[id]/route.ts:164-185`
**Issue:** When both `body.status` and `body.admin_notes` are sent in the same PATCH (which is exactly what the "Save changes" button does), the handler writes **only** a `status_changed` event (the `else if` at line 177 skips `note_added`). The `note` recorded on that event is `nextNotes` — the *new* value the admin just typed.

The comment on line 174 says "Capture the current (post-update) note so triage history reads naturally," but this has two failure modes:

1. **Note-only edits preceding a close are silently lost from the triage narrative.** If an admin earlier added a note (`note_added` event), then later changes status from `investigating` → `resolved` *without modifying the note*, `nextNotes` equals `current.admin_notes` (the carried-over value). The new `status_changed` event duplicates the same note text, but that's fine.

2. **Simultaneous status+note change produces no `note_added` event.** The audit log shows "changed status to resolved, note: <new text>" but there's no evidence the note was *added* at this moment — a reader can't tell whether the note existed before the close or was written during it. For the close-requires-note contract this matters, because the goal is to record that the closing admin provided a reason at close time.

**Fix:** When both changed in one PATCH, write both events. Order them `note_added` then `status_changed` so the status event carries the most recent note state:

```ts
try {
  if (notesChanged) {
    await admin.from("issue_report_events").insert({
      report_id: id,
      event_type: "note_added",
      actor_user_id: user.id,
      actor_role: "admin",
      note: nextNotes && nextNotes.trim().length > 0 ? nextNotes : null,
    });
  }
  if (statusChanged) {
    await admin.from("issue_report_events").insert({
      report_id: id,
      event_type: "status_changed",
      actor_user_id: user.id,
      actor_role: "admin",
      from_status: current.status,
      to_status: body.status,
      note: nextNotes && nextNotes.trim().length > 0 ? nextNotes : null,
    });
  }
} catch (err) { ... }
```

Alternatively, if the intent is "one event per PATCH," document that explicitly in both the plan and the source comment so future maintainers don't assume `note_added` will always fire when the note changes.

## Info

### IN-01: Backfill can mis-attribute a `status_changed` event when the resolver was later deleted

**File:** `supabase/migrations/20260414_issue_report_events.sql:41-51`
**Issue:** The second backfill synthesizes `status_changed → resolved` with `actor_user_id = ir.resolved_by`. `users` has `ON DELETE SET NULL` via the `issue_reports.resolved_by` FK. If the resolver has been deleted since, `resolved_by` is null, and the event row ends up with `actor_user_id: NULL` + `actor_role: 'admin'`. The admin timeline will render "Unknown" for this event. That's acceptable (and matches the data reality), but callers that assume `actor_role='admin' => actor_user_id IS NOT NULL` will misbehave.

**Fix:** No change required; document the invariant in the types file / this migration:

```sql
-- NOTE: actor_user_id MAY be NULL even when actor_role='admin' (e.g., backfilled
-- events whose original actor was later deleted). Consumers must handle null.
```

---

### IN-02: `requireSuperAdmin()` redirects — unreachable code path but still worth the null-check assertion

**File:** `src/app/admin/reports/[id]/page.tsx:15-18`
**Issue:** `requireSuperAdmin()` redirects on failure, so `adminUser` is always a `SessionUser`. But `adminUserId` is then guarded with `if (adminUserId)` on line 51. That guard will always be truthy — dead defensive code. Not wrong, just noisy; a future reader may think there's a null path.

**Fix:** Drop the `if (adminUserId)` check, or replace with an assertion:

```ts
const { id: adminUserId } = adminUser; // non-null by contract of requireSuperAdmin
```

---

### IN-03: `as any` cast in page.tsx hides Supabase join-type mismatch

**File:** `src/app/admin/reports/[id]/page.tsx:118-119`
**Issue:** The `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + `report as any` cast suppresses a real type issue — Supabase's select-with-join returns a generic shape that doesn't match `ReportDetailData`. Casting to `any` means a future column rename won't be caught at compile time.

**Fix:** Extract a strongly typed adapter or declare a narrow interface that matches the exact columns selected:

```ts
type ReportWithJoins = IssueReport & {
  tenants: { id: string; name: string; slug: string } | null;
  users: { id: string; email: string; full_name: string | null } | null;
  resolver: { id: string; email: string; full_name: string | null } | null;
};
const typed = report as ReportWithJoins;
```

---

### IN-04: `formatRelativeTime` / `formatRelative` duplicated across files

**File:** `src/app/admin/reports/[id]/report-detail.tsx:62-76`, `src/app/admin/reports/[id]/timeline-card.tsx:28-42`
**Issue:** Two identical date formatters with identical thresholds. Drift risk: if one branch updates the "Just now" threshold, the other won't follow.

**Fix:** Extract `formatRelativeTime` to `src/lib/utils/format-time.ts` (or wherever shared UI helpers live) and import both.

---

### IN-05: `page_url` is rendered as `href` without a `javascript:` / `data:` scheme check

**File:** `src/app/admin/reports/[id]/report-detail.tsx:482-490`
**Issue:** `report.page_url` comes from the tenant, validated as `z.string().url()` at submission time. `z.string().url()` accepts any URL scheme including `javascript:` and `data:`. Rendered as `<a href={report.page_url} target="_blank" rel="noopener noreferrer">`, a malicious tenant could store a `javascript:...` URL. `target="_blank"` does open in a new tab which blunts the attack (the javascript URL runs in the new tab's context), but an admin clicking the link is the victim.

This is pre-existing from Phase 33, not introduced in Phase 38 — but it's on a touched file and the review should flag it.

**Fix:** Add a scheme check on render (or on submission in the zod schema):

```ts
const safeHref = /^https?:\/\//i.test(report.page_url) ? report.page_url : "#";
// ...
<a href={safeHref} target="_blank" rel="noopener noreferrer"> ... </a>
```

Or tighten the zod schema:

```ts
page_url: z.string().url().refine((u) => /^https?:/i.test(u), "Must be http(s)")
```

---

_Reviewed: 2026-04-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
