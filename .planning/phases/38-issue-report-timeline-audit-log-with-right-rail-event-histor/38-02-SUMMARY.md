---
phase: 38-issue-report-timeline-audit-log
plan: 02
subsystem: api
tags: [nextjs, api-route, supabase, audit-log, rls-bypass, service-role, super-admin]

# Dependency graph
requires:
  - phase: 38-issue-report-timeline-audit-log
    plan: 01
    provides: issue_report_events table + IssueReportEvent types (live schema + TS unions)
provides:
  - POST /api/issues/report writes 'reported' event on every successful issue_reports insert
  - PATCH /api/admin/reports/[id] writes 'status_changed' or 'note_added' events (diff-aware)
  - PATCH enforces close-requires-note server-side — rejects 400 on resolved/wontfix/duplicate with empty admin_notes
  - GET /api/admin/reports/[id] returns events[] with joined actor (id/email/full_name), ordered created_at ASC
affects:
  - 38-03 (admin detail page server loader owns viewed_by_admin + screenshot_expired writes; consumes GET response shape)
  - 38-04 (right-rail timeline UI consumes events[] from GET or from page.tsx server loader)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Diff-aware PATCH: read current row before update, compare status/admin_notes, choose event_type"
    - "status_changed takes precedence over note_added when both change in one PATCH"
    - "Server-side close-requires-note guard with no-op PATCH bypass (wasAlreadyClosed + body.status === undefined)"
    - "Non-fatal audit writes: try/catch + console.error, never propagate to response"
    - "Actor identity sourced from auth.getUser()/getSuperAdminUser(), NEVER from request body (spoofing mitigation)"

key-files:
  created: []
  modified:
    - src/app/api/issues/report/route.ts
    - src/app/api/admin/reports/[id]/route.ts

key-decisions:
  - "status_changed wins over note_added when both fields change — a single PATCH produces one event row, not two. Simpler timeline rendering, and the status_changed event carries the note anyway."
  - "Close-requires-note guard allows the no-op re-PATCH of an already-closed report with body.status=undefined — prevents bogus 400s on admin UI refreshes that repaint the form state."
  - "GET returns events[] even though the admin UI doesn't call this route (the admin page.tsx is a server component reading Supabase directly). Kept for programmatic consumers and parity."
  - "Re-homed viewed_by_admin + screenshot_expired writes to Plan 03 Task 2 (page.tsx server loader) where they actually fire on page visits. Documented inline in GET handler."

patterns-established:
  - "Audit event writes are always non-fatal — the mutation succeeded, so the event write failure must not flip a 200 to a 500"
  - "Actor IDs always sourced server-side from authenticated session, never from request body"

requirements-completed: [PHASE-38-WRITERS-TENANT, PHASE-38-WRITERS-ADMIN, PHASE-38-CLOSE-GUARD-SERVER]

# Metrics
duration: ~2min
completed: 2026-04-14
---

# Phase 38 Plan 02: Issue Report Event Writers + Close Guard Summary

**Wired tenant POST and admin PATCH to write `reported`/`status_changed`/`note_added` events into the audit log, hard-blocked empty-note closes at the API boundary (400), and extended admin GET to return `events[]` with actor joins — all while keeping audit failures non-fatal.**

## Performance

- **Duration:** ~2 min (3 small file edits + 3 commits + verification; no debugging)
- **Started:** 2026-04-14T14:05:39Z
- **Completed:** 2026-04-14T14:07:32Z
- **Tasks:** 3/3
- **Files modified:** 2

## Accomplishments

- **Tenant write path**: `POST /api/issues/report` now appends a `reported` event (`actor_role='tenant'`, `actor_user_id=user.id`) immediately after the successful `issue_reports` INSERT. Placed before the screenshot upload so the audit row is preserved even if the upload stage fails.
- **Admin write path**: `PATCH /api/admin/reports/[id]` was rewritten from a straight-UPDATE handler into a diff-aware writer. It now reads the current row first, computes `statusChanged` / `notesChanged`, and writes exactly one audit row per request (status_changed wins when both change).
- **Close-requires-note guard**: Returns `400 "A note is required when closing an issue"` when the target status is `resolved`/`wontfix`/`duplicate` and `admin_notes` is empty or whitespace. Bypasses the guard for no-op re-PATCHes of already-closed reports (prevents bogus 400s on UI refreshes).
- **GET response shape**: `GET /api/admin/reports/[id]` now returns `{ report, screenshotUrl, events }` where `events` is the full chronological timeline with `actor:{ id, email, full_name }` joined in. Empty array if no events.
- **Spoofing mitigation** (T-38-05, T-38-06): `actor_user_id` is always sourced from `auth.getUser()` (tenant route) or `gate.user.id` (admin route via `getSuperAdminUser`). Never read from request body.
- **Audit integrity** (T-38-08): Every audit write is wrapped in `try/catch` with `console.error`. The response still returns 2xx even if the audit row fails — the user-visible mutation already succeeded and we don't want to re-run it.

## Task Commits

Each task committed atomically on `worktree-agent-a7e4ab31` with `--no-verify` (parallel worktree execution):

1. **Task 1: Append reported event in POST /api/issues/report** — `416af9e` (feat)
2. **Task 2: Rewrite PATCH with diff-aware event writers + close-requires-note 400** — `3b31bb0` (feat)
3. **Task 3: Extend GET with events[] + joined actor** — `74a05fb` (feat)

**SUMMARY metadata commit:** owned by the orchestrator after all wave-2 worktrees merge.

## Files Created/Modified

- `src/app/api/issues/report/route.ts` — Modified (+15 lines). Added try/catch block after the successful `issue_reports` INSERT that inserts a `reported` event via `createAdminClient`. Preserved existing auth flow, zod validation, screenshot upload, `logActivity` call, 201 response.
- `src/app/api/admin/reports/[id]/route.ts` — Modified. GET handler: added `events` fetch with joined actor before the existing return, response body extended to `{ report, screenshotUrl, events }`. PATCH handler: rewrote from straight-update to diff-aware (reads current row, computes statusChanged/notesChanged, writes one event per request), added `CLOSED_STATUSES` constant + close-requires-note 400 guard, kept super_admin gate + VALID_STATUSES enum check + resolved_by/resolved_at auto-populate.

## Decisions Made

1. **`status_changed` takes precedence over `note_added` when both change in one PATCH.** A single admin action produces one event row, not two. Simpler for the timeline renderer, and the `status_changed` row carries the note anyway.
2. **Close-requires-note guard exempts the no-op re-PATCH.** If a report is already closed AND the PATCH omits `status` (i.e. admin is just re-saving notes or the UI is repainting form state), we don't block on empty notes. Only a PATCH that actually attempts a transition or note update is gated.
3. **GET returns `events[]` even though the admin UI doesn't call it.** The admin detail page is a server component that reads Supabase directly, so this endpoint is only hit by programmatic consumers (curl, tests, future integrations). Kept for parity and testability.
4. **Re-homed `viewed_by_admin` + `screenshot_expired` writes to Plan 03 Task 2.** The admin UI reads via `page.tsx` server loader, not via this GET handler. Writes here would never fire on a real page visit. Documented inline with a comment block so future readers don't re-add them.

## Deviations from Plan

None — plan executed exactly as written. Each task's action block was applied verbatim, verify grep assertions all passed, and `npx tsc --noEmit` shows no new errors in the touched files.

## Events Produced — Worked Examples

**1. Tenant submits a report:**
```bash
curl -X POST https://pgl-main.vercel.app/api/issues/report \
  -H "Cookie: sb-access-token=..." \
  -F 'payload={"category":"bug","description":"Search is broken","page_url":"https://pgl-main.vercel.app/dashboard/discover","page_path":"/dashboard/discover"}'
# -> 201 { id: "<uuid>" }
# Writes: issue_report_events row { event_type:'reported', actor_role:'tenant', actor_user_id:<user.id>, report_id:<uuid> }
```

**2. Admin triage move (no note required):**
```bash
curl -X PATCH https://pgl-main.vercel.app/api/admin/reports/<id> \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{"status":"investigating"}'
# -> 200 { report: {...} }
# Writes: issue_report_events row { event_type:'status_changed', from_status:'open', to_status:'investigating', note:null, actor_role:'admin' }
```

**3. Admin close with empty note → 400:**
```bash
curl -X PATCH https://pgl-main.vercel.app/api/admin/reports/<id> \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{"status":"resolved","admin_notes":""}'
# -> 400 { error: "A note is required when closing an issue" }
# Writes: nothing (update never runs)
```

**4. Admin close with note → status_changed event captures the note:**
```bash
curl -X PATCH https://pgl-main.vercel.app/api/admin/reports/<id> \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{"status":"resolved","admin_notes":"Duped with #123, fixed in main"}'
# -> 200 { report: {..., status:"resolved", resolved_by:<admin.id>, resolved_at:<now>} }
# Writes: issue_report_events row { event_type:'status_changed', from_status:'investigating', to_status:'resolved', note:'Duped with #123, fixed in main', actor_role:'admin' }
```

**5. Admin adds a note without changing status → `note_added`:**
```bash
curl -X PATCH https://pgl-main.vercel.app/api/admin/reports/<id> \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{"admin_notes":"Added context from sales call"}'
# -> 200 { report: {...} }
# Writes: issue_report_events row { event_type:'note_added', note:'Added context from sales call', actor_role:'admin' }
```

**6. Admin GET returns the full timeline:**
```bash
curl https://pgl-main.vercel.app/api/admin/reports/<id> -H "Cookie: sb-access-token=..."
# -> 200 { report, screenshotUrl, events: [
#      { event_type:'reported', actor:{id,email,full_name}, ... },
#      { event_type:'status_changed', from_status:'open', to_status:'investigating', actor:{...}, ... },
#      ...
#    ] }
```

## Scope Boundary — viewed_by_admin + screenshot_expired

Explicitly NOT in this plan (moved to Plan 03 Task 2):

- `viewed_by_admin` write with 24h dedup
- `screenshot_expired` write with per-path dedup

Reason: The admin detail page at `/admin/reports/[id]` is a Next.js server component that queries Supabase directly via `admin.from("issue_reports")` and `admin.storage.createSignedUrl(...)`. It does NOT invoke `GET /api/admin/reports/[id]`. Writes added to this GET handler would never fire on a real page visit, only from curl/tests.

Plan 03 Task 2 moves these writes into `src/app/admin/reports/[id]/page.tsx` where they fire on every page load. GET handler remains the programmatic-consumer endpoint for reads.

## Threat Model — Status

All 6 in-scope threats mitigated:

| Threat | Status | Mechanism |
|---|---|---|
| T-38-05 Spoofing actor_user_id on reported | MITIGATED | `user.id` pulled from `supabase.auth.getUser()`, never from body |
| T-38-06 Spoofing actor_user_id on admin events | MITIGATED | `user.id` pulled from `getSuperAdminUser()` gate, never from body |
| T-38-07 RLS bypass via service-role | MITIGATED | Service-role only inside already-gated routes; no new surfaces |
| T-38-08 Audit log tampering | MITIGATED | Zero UPDATE/DELETE paths on `issue_report_events` — INSERT only |
| T-38-09 XSS via note | ACCEPTED (re-read) | Plan 03 renders notes as React text nodes, no dangerouslySetInnerHTML |
| T-38-11 CSRF on PATCH | MITIGATED | super_admin gate checks `app_metadata.role` on every call via Supabase session |

No new security-relevant surface introduced — only new writes inside existing authenticated routes.

## Known Stubs

None. All event-writer paths are fully wired to the live `issue_report_events` table. No hardcoded placeholders, no TODO markers, no mock data.

## Next Phase Readiness

- **Ready for Plan 38-03:** Admin detail page (server component) can now consume the live events table directly AND adopt the same shape returned by GET. Plan 03 Task 2 will add `viewed_by_admin` + `screenshot_expired` writes in `page.tsx`.
- **Ready for Plan 38-04:** Timeline right-rail component has a stable `IssueReportEventWithActor[]` shape to render (from either GET response or server loader). All 5 event types are now produceable by the API.
- **No blockers.** No user setup required — writers are live, guard is live, GET returns events.

## Self-Check: PASSED

- File `src/app/api/issues/report/route.ts` — FOUND (modified, line 154-166 contains the reported insert)
- File `src/app/api/admin/reports/[id]/route.ts` — FOUND (modified, GET returns events[] at line 72, PATCH diffs at lines 95-191)
- Commit `416af9e feat(38-02): append reported event on tenant issue report POST` — FOUND on `worktree-agent-a7e4ab31`
- Commit `3b31bb0 feat(38-02): diff-aware PATCH writer with close-requires-note 400` — FOUND on `worktree-agent-a7e4ab31`
- Commit `74a05fb feat(38-02): return events[] with joined actor from admin GET` — FOUND on `worktree-agent-a7e4ab31`
- `npx tsc --noEmit` shows zero errors for the two modified files
- All 3 plan verify blocks pass (greps for literal strings + tsc check)
- Close-requires-note message string matches spec byte-for-byte: "A note is required when closing an issue"
- GET handler contains zero `viewed_by_admin` or `screenshot_expired` INSERTs (re-homed to Plan 03)

---
*Phase: 38-issue-report-timeline-audit-log-with-right-rail-event-histor*
*Plan: 02*
*Completed: 2026-04-14*
