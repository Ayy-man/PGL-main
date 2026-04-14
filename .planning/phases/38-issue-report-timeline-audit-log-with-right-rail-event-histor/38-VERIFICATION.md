---
phase: 38-issue-report-timeline-audit-log-with-right-rail-event-histor
verified: 2026-04-14T14:25:55Z
status: human_needed
score: 19/19 code-level must-haves verified; 7 UAT scenarios deferred to human
overrides_applied: 0
re_verification:
  previous_status: null
  previous_score: null
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Scenario 1 — reported event on new report creation"
    expected: "Tenant submits a new report; SELECT event_type FROM issue_report_events WHERE report_id = <new id> returns exactly one row with event_type='reported', actor_role='tenant'"
    why_human: "Requires live tenant session, multipart form submission, and DB read — can't be exercised without running the app and a tenant account. Per 38-04-PLAN.md Scenario 1."
  - test: "Scenario 2 — status_changed event on status transition"
    expected: "Admin PATCHes status from open → investigating with empty notes; Save succeeds; SELECT returns event_type='status_changed', from_status='open', to_status='investigating'"
    why_human: "Requires live super_admin session + browser interaction + DB read. Per 38-04-PLAN.md Scenario 2."
  - test: "Scenario 3 — note_added event on notes-only change"
    expected: "Admin edits admin_notes without changing status; SELECT returns event_type='note_added' with captured note text"
    why_human: "Requires browser + DB. Per 38-04-PLAN.md Scenario 3."
  - test: "Scenario 4 — close-requires-note blocks on both client and server"
    expected: "UI Save button disabled + red helper text when closing with empty notes; raw fetch PATCH with status=resolved and admin_notes='' returns HTTP 400 with the exact error message"
    why_human: "UI visual state + network trace required. Per 38-04-PLAN.md Scenario 4."
  - test: "Scenario 5 — viewed_by_admin 24h dedup (log-out / log-in)"
    expected: "Admin visits report, logs out, logs back in, revisits; count of viewed_by_admin events in last hour = 1"
    why_human: "Requires session lifecycle + DB read. Per 38-04-PLAN.md Scenario 5."
  - test: "Scenario 5b — viewed_by_admin rapid-repeat dedup"
    expected: "Admin visits a fresh report, then sequentially refreshes 2-3 times; SELECT count(*) = 1 (single row). Note WR-02 flags a race window on truly simultaneous renders where count could be >1; accept n=1 on sequential refreshes per T-38-10"
    why_human: "Requires browser refresh + DB read. Per 38-04-PLAN.md Scenario 5b."
  - test: "Scenario 6 — backfilled events render for existing reports"
    expected: "Oldest pre-Phase-38 report opened in admin UI shows a 'Reported by {tenant}' row in timeline; SQL confirms event created_at equals report created_at for backfilled rows"
    why_human: "Requires comparing UI render to SQL state. Per 38-04-PLAN.md Scenario 6."
  - test: "Scenario 7 — responsive layout"
    expected: "At viewport ≥1024px, Admin Actions and TimelineCard render side-by-side (2:1 grid); below 1024px, TimelineCard stacks below Admin Actions. All sections above Admin Actions remain full-width at both breakpoints."
    why_human: "Visual responsive behavior — CSS can be statically verified (grid-cols-1 lg:grid-cols-3 present) but the rendered breakpoint behavior needs a browser. Per 38-04-PLAN.md Scenario 7."
---

# Phase 38: Issue Report Timeline Audit Log — Verification Report

**Phase Goal:** Add an append-only event history for `issue_reports` and surface it as a right-rail timeline card next to Admin Actions on the admin report detail page. New `issue_report_events` table with backfill, 5 event types (reported, status_changed, note_added, viewed_by_admin, screenshot_expired), close-requires-note enforcement on both client and server, and TimelineCard UI rendered in a 2:1 grid beside the existing Admin Actions form on lg: screens.

**Verified:** 2026-04-14T14:25:55Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

All code-level truths from PLAN frontmatters verified. UAT scenarios (Plan 38-04) deferred per user direction — user will run all 7 scenarios at end of phase.

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | `issue_report_events` table exists with all columns + CHECK constraints + FK CASCADE + RLS enabled | VERIFIED | `supabase/migrations/20260414_issue_report_events.sql` lines 10-27: 9 cols, CHECK on event_type (5 values), CHECK on actor_role (3 values), `REFERENCES issue_reports(id) ON DELETE CASCADE`, `ENABLE ROW LEVEL SECURITY`, `idx_issue_events_report_time` index. Live-push confirmed by user (6 backfilled `reported` rows verified in Supabase). |
| 2  | Every existing issue_reports row has a synthesized `reported` event | VERIFIED | Migration lines 31-37 (idempotent `INSERT ... WHERE NOT EXISTS`). User-confirmed counts: `reported = 6` = `SELECT COUNT(*) FROM issue_reports`. Inline backfill was executed manually in Supabase SQL editor after `supabase db push` skipped it (documented in 38-01-SUMMARY.md). |
| 3  | Every resolved issue_reports row has a synthesized `status_changed` event with `to_status='resolved'` | VERIFIED | Migration lines 41-51. User-confirmed count: `status_changed = 0` = `SELECT COUNT(*) FROM issue_reports WHERE resolved_at IS NOT NULL`. No resolved reports exist, so zero rows is the correct zero-case. |
| 4  | `IssueReportEvent` / `IssueReportEventWithActor` / `IssueReportEventType` / `IssueReportActorRole` exported from types | VERIFIED | `src/types/database.ts` lines 364, 371, 373, 386. All 4 exports present; `IssueReportEvent` has all 9 DB columns; `IssueReportEventWithActor extends IssueReportEvent` with `actor: {id,email,full_name} \| null`. |
| 5  | `POST /api/issues/report` inserts one `reported` event from `auth.getUser()` | VERIFIED | `src/app/api/issues/report/route.ts` lines 154-167: `admin.from("issue_report_events").insert({report_id: reportId, event_type: "reported", actor_user_id: user.id, actor_role: "tenant"})`. Actor sourced from `supabase.auth.getUser()` (line 39), never from body. Wrapped in try/catch — non-fatal per acceptance. |
| 6  | `PATCH /api/admin/reports/[id]` inserts `status_changed` on status transition with from/to/note captured | VERIFIED | `src/app/api/admin/reports/[id]/route.ts` lines 166-176. Reads current row first (lines 97-102), computes `statusChanged` (line 132), writes event with `from_status: current.status`, `to_status: body.status`, `note: nextNotes`. |
| 7  | `PATCH` inserts `note_added` when only admin_notes change | VERIFIED | Same file lines 177-185 — `else if (notesChanged)` branch writes `event_type: "note_added"` with `actor_role: "admin"` + captured note. |
| 8  | `PATCH` returns 400 "A note is required when closing an issue" on empty-note close | VERIFIED | Same file lines 113-123. `isClosing = CLOSED_STATUSES.includes(nextStatus) && ...`, guarded against no-op re-PATCH (lines 116-117). Exact error string matches spec. |
| 9  | `GET /api/admin/reports/[id]` returns events[] ordered ASC with joined actor | VERIFIED | Same file lines 62-72. Select includes `actor:actor_user_id ( id, email, full_name )` join, `.order("created_at", { ascending: true })`, response body `{ report, screenshotUrl, events: events ?? [] }`. |
| 10 | TimelineCard renders all 5 event variants with correct dot color / headline / body | VERIFIED | `src/app/admin/reports/[id]/timeline-card.tsx` `renderVariant` function (lines 55-143) handles all 5 cases. Dot colors: `var(--destructive, #ef4444)` reported, `#3b82f6` status_changed, `#9ca3af` note_added, `#4b5563` viewed_by_admin, `#f59e0b` screenshot_expired. Headlines and bodies match CONTEXT.md spec. Newest-on-top via local `reverse()` (line 148). |
| 11 | Admin Actions + TimelineCard render in 2:1 grid on `lg:`, stack below | VERIFIED | `src/app/admin/reports/[id]/report-detail.tsx` line 569 `grid grid-cols-1 lg:grid-cols-3 gap-6`, line 570 `lg:col-span-2` (Admin Actions), line 663 `lg:col-span-1` (TimelineCard). |
| 12 | Save button disabled + red helper text when closing with empty notes | VERIFIED | Same file lines 60 (`CLOSED_STATUSES`), 123-125 (`blockCloseForEmptyNote` derived state), 623-627 (red helper text "A note is required when closing an issue."), 650 (`disabled={isPending \|\| blockCloseForEmptyNote}`). |
| 13 | All sections above Admin Actions remain full-width and unchanged | VERIFIED | Header, submitter, description, snapshot, screenshot, URL, context sections (lines ~366-566) are outside the `grid grid-cols-1 lg:grid-cols-3` wrapper which only contains Admin Actions + TimelineCard (lines 569-671). |
| 14 | Notes render as React text nodes (no dangerouslySetInnerHTML) | VERIFIED | `grep dangerouslySetInnerHTML src/app/admin/reports/[id]/timeline-card.tsx` returned zero matches. All note/description/actor-name interpolation uses React children (safely escaped). |
| 15 | `page.tsx` writes `viewed_by_admin` with 24h dedup before insert | VERIFIED | `src/app/admin/reports/[id]/page.tsx` lines 51-75. 24h window via `Date.now() - 24 * 60 * 60 * 1000`, dedup SELECT with `.eq('report_id', id).eq('actor_user_id', adminUserId).eq('event_type', 'viewed_by_admin').gte('created_at', since)`, guarded INSERT on `if (!recentView)`. |
| 16 | `page.tsx` writes `screenshot_expired` with per-path dedup when `createSignedUrl` returns null | VERIFIED | Same file lines 80-103. Trigger: `if (report.screenshot_path && !screenshotUrl)`. Dedup: SELECT with `.eq('note', report.screenshot_path)`, guarded INSERT on `if (!priorExpired)`. Path stashed in `note` column. |
| 17 | Both on-visit writes are fire-and-forget (failures log but don't break page) | VERIFIED | Both blocks wrapped in try/catch with `console.error` + comment "Do not throw — page must still render." (lines 71-74 and 99-102). No re-throw. |
| 18 | Actor IDs always sourced server-side, never from request body | VERIFIED | POST route line 161 `actor_user_id: user.id` (from `auth.getUser`). PATCH route lines 170, 181 `actor_user_id: user.id` (from `gate.user.id` via `getSuperAdminUser`). page.tsx line 67 `actor_user_id: adminUserId` (from `requireSuperAdmin`). Zero usages of `body.actor_user_id` or `request.body` actor fields. |
| 19 | Audit writes are non-fatal (INSERT failure does not flip 2xx to 5xx) | VERIFIED | All 4 insert paths wrapped in try/catch with `console.error` and no re-throw: POST route lines 164-167, PATCH route lines 186-189, page.tsx lines 71-74 and 99-102. |

**Score:** 19/19 code-level truths verified. 7 UAT scenarios (Plan 38-04) deferred per user direction.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260414_issue_report_events.sql` | DDL + backfill (≥40 lines, CREATE TABLE issue_report_events, CHECK enums, idempotent backfills) | VERIFIED | 51 lines. Exists. Substantive. Wired — migration filename will be picked up by `supabase db push` (confirmed by user). |
| `src/types/database.ts` | Extended with IssueReportEvent + unions + IssueReportEventWithActor | VERIFIED | 5 new exports at lines 364-392. Imported in: `page.tsx` (L4), `report-detail.tsx` (L6), `timeline-card.tsx` (L3). Wired. |
| `src/app/api/issues/report/route.ts` | POST appends reported event after successful insert | VERIFIED | 217 lines. `issue_report_events` insert at lines 158-163. Reached only after `issue_reports` insert success (after line 152 error return). Wired. |
| `src/app/api/admin/reports/[id]/route.ts` | GET returns events[], PATCH diffs + writes events + close-guard 400 | VERIFIED | 193 lines. Imports `createAdminClient` at line 3. All 3 event write paths + close guard + events[] select present. Wired. |
| `src/app/admin/reports/[id]/page.tsx` | Server loader writes viewed_by_admin + screenshot_expired + fetches events with actor join | VERIFIED | 120 lines. 5 `issue_report_events` references. 24h dedup arithmetic `24 * 60 * 60 * 1000` present (line 53). Events threaded into `<ReportDetail events={events} />` (line 119). Wired. |
| `src/app/admin/reports/[id]/report-detail.tsx` | 2:1 grid split, close-guard UX, TimelineCard integration | VERIFIED | 675 lines (widened `max-w-4xl` → `max-w-5xl` at L366). Imports TimelineCard (L7), renders at L664-669, `blockCloseForEmptyNote` at L125, red helper text at L623-627, Save disabled at L650. Wired. |
| `src/app/admin/reports/[id]/timeline-card.tsx` | Client component rendering 5 event variants | VERIFIED | 210 lines (≥80 min). All 5 event_type cases in `renderVariant` switch. Imported by report-detail.tsx (L7). No `dangerouslySetInnerHTML`. Wired. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `issue_report_events.report_id` | `issue_reports.id` | `REFERENCES issue_reports(id) ON DELETE CASCADE` | WIRED | Migration line 12 contains exact pattern. |
| `supabase db push` | live Supabase DB | Supabase CLI | WIRED | User confirmed push succeeded; table visible in Studio. CLI skipped inline INSERTs so user ran backfill in SQL editor — documented in 38-01-SUMMARY.md Issues Encountered. |
| POST `/api/issues/report` | `issue_report_events` | service-role insert with `actor_role: 'tenant'` | WIRED | Route file line 162 `actor_role: "tenant"`. |
| PATCH `/api/admin/reports/[id]` | `issue_report_events` | admin insert with `actor_role: 'admin'` for status_changed and note_added | WIRED | Route file lines 171, 182 both `actor_role: "admin"`. |
| GET `/api/admin/reports/[id]` | `issue_report_events` | select with `actor:actor_user_id` join | WIRED | Route file lines 62-70. |
| `ReportDetail` | `TimelineCard` | `events` prop | WIRED | report-detail.tsx line 664-669: `<TimelineCard events={events} reporterName={...} category={...} description={...} />`. |
| `page.tsx` loader | `issue_report_events` table | 2 dedup SELECTs + 2 conditional INSERTs + 1 final events SELECT | WIRED | page.tsx lines 54-70 (viewed_by_admin SELECT + INSERT), 82-98 (screenshot_expired SELECT + INSERT), 106-114 (events fetch). |
| `page.tsx` loader | `viewed_by_admin` event | `requireSuperAdmin()` → `adminUser.id` → insert | WIRED | page.tsx lines 15-16 (adminUserId from requireSuperAdmin), L67 `actor_user_id: adminUserId`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `TimelineCard` | `events` prop | `report-detail.tsx` `events` prop → `page.tsx` `eventsRaw` from `admin.from("issue_report_events").select(...)` | Yes — live query against live Supabase table with 6+ backfilled rows confirmed by user | FLOWING |
| `report-detail.tsx` form state | `report.status`, `report.admin_notes` | Server loader hydrates from `admin.from("issue_reports").select("*, tenants, users, resolver")` | Yes — live DB row | FLOWING |
| `status_changed` event row | `note` column | `nextNotes = body.admin_notes ?? current.admin_notes` | Yes — post-update value written to table. WR-04 flags semantic ambiguity (stale vs new note on simultaneous status+note change), tracked as non-blocking warning. | FLOWING (with documented semantic caveat) |
| `screenshot_expired` event row | `note` column (holds `screenshot_path`) | `report.screenshot_path` from server loader | Yes | FLOWING (WR-03 semantic overload documented as warning) |

### Behavioral Spot-Checks

Step 7b skipped: phase produces Next.js server/client code that requires a running dev server and live Supabase session (`npm run dev` + super_admin auth + tenant auth) to exercise meaningfully. The 7 UAT scenarios in Plan 38-04 are the deliberate behavioral checks for this phase and are deferred to human UAT per user direction.

Static TypeScript compilation was confirmed clean by executors (all 3 wave-2 plan summaries report `npx tsc --noEmit` zero errors for modified files).

### Requirements Coverage

REQUIREMENTS.md does not contain Phase 38 requirement IDs — Phase 38 is a post-v1 phase added to the roadmap (`.planning/ROADMAP.md` lines 436-449) that defines its own requirement IDs inline in the Requirements field. All 12 IDs are declared in plan frontmatters and are cross-referenced below against the observable truths above.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PHASE-38-SCHEMA | 38-01 | issue_report_events table DDL | SATISFIED | Truth #1 — migration file + live push |
| PHASE-38-TYPES | 38-01 | TypeScript types for IssueReportEvent + unions | SATISFIED | Truth #4 — 5 new exports in database.ts |
| PHASE-38-BACKFILL | 38-01 | Synthesize reported + status_changed events for existing rows | SATISFIED | Truths #2 + #3 — verified by user-reported DB counts |
| PHASE-38-WRITERS-TENANT | 38-02 | POST appends reported event | SATISFIED | Truth #5 |
| PHASE-38-WRITERS-ADMIN | 38-02 | PATCH writes status_changed / note_added | SATISFIED | Truths #6 + #7 |
| PHASE-38-CLOSE-GUARD-SERVER | 38-02 | Server 400 on close-with-empty-note | SATISFIED | Truth #8 |
| PHASE-38-CLOSE-GUARD-CLIENT | 38-03 | Client-side disable + helper text | SATISFIED | Truth #12 |
| PHASE-38-VIEW-DEDUP | 38-03 | viewed_by_admin 24h dedup | SATISFIED | Truth #15 (Scenario 5/5b needed for live confirmation — NEEDS HUMAN) |
| PHASE-38-SCREENSHOT-EXPIRED | 38-03 | screenshot_expired per-path dedup | SATISFIED | Truth #16 |
| PHASE-38-TIMELINE-UI | 38-03 | TimelineCard with 5 variants | SATISFIED | Truth #10 |
| PHASE-38-LAYOUT | 38-03 | 2:1 grid on lg: with stack below | SATISFIED | Truth #11 (Scenario 7 responsive test — NEEDS HUMAN) |
| PHASE-38-UAT | 38-04 | End-to-end 7-scenario UAT | NEEDS HUMAN | Deferred per user direction; 7 scenarios listed in `human_verification` frontmatter |

No orphaned requirements — REQUIREMENTS.md has no Phase-38 entries to orphan against.

### Anti-Patterns Found

Based on the 38-REVIEW.md output and independent grep scans across the 7 touched files. Grep scans for TODO/FIXME/placeholder in the 7 modified files returned zero matches.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/api/admin/reports/[id]/route.ts` | - | WR-01: No CHECK constraint on `issue_report_events.from_status` / `to_status`; enum check runs after close-guard (currently still validated before update, but fragile to refactor) | Warning | Future refactor could write unconstrained `to_status` into append-only log. Not currently exploitable. |
| `src/app/admin/reports/[id]/page.tsx` | 51-75 | WR-02: TOCTOU race on `viewed_by_admin` dedup (SELECT then conditional INSERT across server renders) | Warning | Two simultaneous tab opens can both observe "no recent view" and both INSERT. Append-only log so duplicates can't be cleaned up. |
| `src/app/admin/reports/[id]/page.tsx` | 80-103 | WR-03: `screenshot_expired` stores `screenshot_path` in `note` column — semantic overload | Warning | A future UI refactor that renders `note` for `screenshot_expired` would leak the storage path into the timeline card. Currently hidden because `renderVariant` case sets `body: null`. |
| `src/app/api/admin/reports/[id]/route.ts` | 164-185 | WR-04: Simultaneous status+note PATCH writes only `status_changed` (note_added skipped via `else if`), and the note captured is `nextNotes` (the new note), not the prior value | Warning | The audit trail can't distinguish "note existed before close" from "note written at close time." Documented as a conscious trade-off in 38-02-SUMMARY.md decision #1. |
| `src/app/admin/reports/[id]/page.tsx` | 51 | IN-02: `if (adminUserId)` guard is dead code (requireSuperAdmin redirects on failure) | Info | No functional impact. |
| `src/app/admin/reports/[id]/page.tsx` | 118-119 | IN-03: `as any` cast on Supabase join result | Info | Compile-time type escape; column rename won't be caught. |
| `src/app/admin/reports/[id]/report-detail.tsx`, `timeline-card.tsx` | L62-76, L28-42 | IN-04: Duplicate `formatRelativeTime` / `formatRelative` functions | Info | Drift risk if one updates. Pre-existing shared helper pattern available. |

All 4 Warnings are non-blocking per user context ("Code review produced 4 warnings (non-blocking)") and have no critical findings. No `TODO`/`FIXME`/`placeholder`/`not implemented` markers in any of the 7 touched files.

### Human Verification Required

7 UAT scenarios (Plan 38-04) documented in the frontmatter `human_verification` block above. These are intentionally deferred to end-of-phase UAT per user direction; all underlying code is in place and verified.

### Gaps Summary

**No code-level gaps found.** All 19 observable truths across Plans 38-01, 38-02, 38-03 verified via file inspection and user-confirmed live DB state (6 backfilled `reported` rows, RLS enabled, zero policies). The migration was manually backfilled after the Supabase CLI skipped inline INSERTs — this is documented in 38-01-SUMMARY.md "Issues Encountered" and does not constitute a gap (the live state matches the spec).

4 non-blocking warnings from `38-REVIEW.md` (WR-01 through WR-04) are preserved as anti-patterns but not classified as gaps because they do not break any must-have. They warrant future hardening but should not block phase closure.

Status is `human_needed` because Plan 38-04 intentionally defers 7 UAT scenarios to end-of-phase testing. Once the user completes the UAT and reports pass/fail results, the phase moves to `passed` (if all pass) or `gaps_found` (if any fail) via a subsequent re-verification run.

---

_Verified: 2026-04-14T14:25:55Z_
_Verifier: Claude (gsd-verifier)_
