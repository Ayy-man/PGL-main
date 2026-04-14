---
phase: 38-issue-report-timeline-audit-log
plan: 03
subsystem: admin-ui
tags: [nextjs, app-router, server-component, react, tailwind, audit-log, timeline]

# Dependency graph
requires:
  - phase: 38-issue-report-timeline-audit-log
    plan: 01
    provides: issue_report_events table + IssueReportEvent/IssueReportEventWithActor types (live schema)
provides:
  - TimelineCard component rendering 5 event-type variants with dot/connector/headline/body/timestamp
  - Admin detail page layout split — Admin Actions lg:col-span-2, TimelineCard lg:col-span-1 on lg: screens (stacks on mobile)
  - Close-requires-note client-side guard — Save button disabled + red helper text when status ∈ {resolved, wontfix, duplicate} AND notes empty
  - Server-loader side effects — viewed_by_admin dedup insert (one per admin per report per 24h) + screenshot_expired per-path dedup insert
  - Events fetch with joined actor (id/email/full_name) threaded as ReportDetail prop
affects:
  - 38-02 (no direct effect — 38-02 owns POST issue-report + PATCH admin-report event writers; this plan owns the on-visit writes that live in the server component)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Event writes in the server component (not the GET API) because the admin page is a server component that never calls its own API route"
    - "Fire-and-forget audit writes — try/catch with console.error, never re-throw; page must render even if writes fail"
    - "24h dedup via .gte('created_at', since) on (report_id, actor_user_id, event_type) before insert"
    - "Per-screenshot-path dedup via storing the path in event.note and filtering .eq('note', screenshot_path)"
    - "2:1 right-rail grid (lg:grid-cols-3 with lg:col-span-2 + lg:col-span-1) stacks to single column below lg:"
    - "Close-requires-note UX mirrored client-side (disable + helper text) while PATCH API remains source of truth"
    - "XSS-safe note rendering — all dynamic strings (event.note, actor names, reporterName, description) as React text nodes; no dangerouslySetInnerHTML anywhere in TimelineCard"

key-files:
  created:
    - src/app/admin/reports/[id]/timeline-card.tsx
  modified:
    - src/app/admin/reports/[id]/page.tsx
    - src/app/admin/reports/[id]/report-detail.tsx

key-decisions:
  - "Chose Path A for obtaining adminUserId because requireSuperAdmin() in src/lib/auth/rbac.ts already returns SessionUser (with id: string). Path B (auth.getUser() after the gate) would have added an extra supabase auth roundtrip for no benefit."
  - "Timeline reverses the events[] locally in TimelineCard (not in the SQL query) so the server-side sort remains ASC for downstream consumers; UI controls its own display order."
  - "blockCloseForEmptyNote is derived state (not stored) — it re-evaluates every render so edits to the notes textarea immediately unlock the Save button without any extra useEffect."
  - "Outer wrapper widened from max-w-4xl → max-w-5xl so the 2:1 split at lg: has room without squeezing Admin Actions."

patterns-established:
  - "Audit log writes belong in the code path that actually runs on every user action (server component for page loads, API route for form submits) — putting them in the GET API would leave them unreachable for a server-component-backed page."
  - "Per-key dedup on event inserts: dedup SELECT before dedup-able INSERT, wrapped in try/catch so audit failures are non-fatal."
  - "Client-side validation mirrors server-side 400 rules: disable submit + show helper text, but API still enforces."

requirements-completed: [PHASE-38-TIMELINE-UI, PHASE-38-CLOSE-GUARD-CLIENT, PHASE-38-LAYOUT, PHASE-38-VIEW-DEDUP, PHASE-38-SCREENSHOT-EXPIRED]

# Metrics
duration: ~4min
completed: 2026-04-14
---

# Phase 38 Plan 03: Admin Detail Page Timeline UI + Close-Requires-Note + Server-Loader Event Writes Summary

**TimelineCard right-rail (5 event variants) next to Admin Actions in a 2:1 lg: grid, with close-requires-note client guard and server-loader ownership of the two on-visit event writes (viewed_by_admin 24h dedup + screenshot_expired per-path dedup).**

## Performance

- **Duration:** ~4 min (215 seconds start-to-commit-3)
- **Started:** 2026-04-14T14:06:34Z
- **Completed:** 2026-04-14T14:10:09Z
- **Tasks:** 3/3
- **Files touched:** 3 (1 created, 2 modified)
- **Lines added:** ~400 across the 3 files

## Accomplishments

- New `TimelineCard` client component at `src/app/admin/reports/[id]/timeline-card.tsx` (210 lines) rendering all 5 event types — `reported` (red dot, "Reported by {tenant}", category + 100-char description preview), `status_changed` (blue dot, "{admin} changed status: from → to", optional note), `note_added` (gray-400 dot, "{admin} added a note", whitespace-pre note), `viewed_by_admin` (gray-600 dot, "{admin} viewed", no body), `screenshot_expired` (amber dot, "Screenshot expired", no body).
- Dots positioned with an absolute-positioned vertical connector line that hides on the last row, dots with a `box-shadow: 0 0 0 2px var(--bg-elevated)` ring so they pop off the connector.
- Timestamps use `<time dateTime={...} title={ISO string}>` — relative label ("5m ago", "3h ago", "2d ago", else localized date) + absolute ISO on hover.
- Events arrive ASC from the loader and are reversed locally in TimelineCard (`[...events].reverse()`) so newest is on top per spec.
- Server loader (`page.tsx`) expanded from 46 → 120 lines; takes ownership of the on-visit audit writes:
  - `viewed_by_admin` fires on every admin visit, deduped to one per admin per report per 24h via `.gte('created_at', since)` + `.eq('actor_user_id', adminUserId)` before insert.
  - `screenshot_expired` fires once per distinct `screenshot_path` — triggered when `createSignedUrl` returns null for a set path, dedup-filtered by `.eq('note', report.screenshot_path)`.
  - Both writes wrapped in try/catch that log via `console.error` but do not re-throw; page renders regardless.
  - Events fetched AFTER the writes so a first-visit view row appears in the timeline on the same render.
- `report-detail.tsx` Admin Actions section wrapped in `grid-cols-1 lg:grid-cols-3 gap-6` with `lg:col-span-2` for the form and `lg:col-span-1` for `<TimelineCard>`; stacks to one column below `lg:`.
- Close-requires-note client guard: `CLOSED_STATUSES: IssueStatus[] = ["resolved", "wontfix", "duplicate"]` at module scope + derived `blockCloseForEmptyNote` state in-component. Save button `disabled={isPending || blockCloseForEmptyNote}` (plus `disabled:cursor-not-allowed`), red helper text "A note is required when closing an issue." appears below the status select when active.
- Outer wrapper widened from `max-w-4xl` → `max-w-5xl` so the right rail doesn't crowd Admin Actions at `lg:` breakpoints.
- All sections above Admin Actions (back nav, header, submitter, description, snapshot, screenshot, URL, context collapsible) remain full-width and completely unchanged.

## Task Commits

Each task committed atomically on `worktree-agent-a803c2e5` with `--no-verify` (parallel-executor convention):

1. **Task 1: Create TimelineCard component with 5 event variants** — `17fc021` (feat)
2. **Task 2: Server loader writes viewed_by_admin + screenshot_expired, fetches events** — `bd62d00` (feat)
3. **Task 3: Split Admin Actions into 2:1 grid with TimelineCard + close-requires-note UX** — `90e317c` (feat)

Final metadata commit (with this SUMMARY.md) is done by the orchestrator after all wave-2 worktrees complete.

## Files Created/Modified

- **`src/app/admin/reports/[id]/timeline-card.tsx`** — Created, 210 lines. `"use client"` component exporting `TimelineCard`. Props: `events: IssueReportEventWithActor[]`, `reporterName: string | null`, `category: string`, `description: string`. Internal `STATUS_LABEL`, `CATEGORY_LABELS`, `formatRelative`, `actorName`, `renderVariant` helpers. Renders as `surface-admin-card` with `<ol>` of `<li>` rows, each with absolute-positioned dot + connector + headline + optional body + right-aligned `<time>` label.
- **`src/app/admin/reports/[id]/page.tsx`** — Rewritten, 46 → 120 lines. Path A chosen (requireSuperAdmin returns SessionUser → adminUserId = adminUser.id, no extra auth roundtrip). Added two try/catch-wrapped event-write blocks (viewed_by_admin 24h dedup, screenshot_expired per-path dedup), the events fetch with `actor:actor_user_id ( id, email, full_name )` join, and the `events` prop on `<ReportDetail>`. Preserved: `requireSuperAdmin`, `createAdminClient`, the join select, the screenshot signed URL block, `notFound()`, `dynamic = "force-dynamic"`.
- **`src/app/admin/reports/[id]/report-detail.tsx`** — Modified (+111, -86 net). Added TimelineCard + IssueReportEventWithActor imports. `ReportDetailProps` now has `events`. Component signature destructures `events`. Added `CLOSED_STATUSES` at module scope and `isClosing`/`notesEmpty`/`blockCloseForEmptyNote` derived state inside component. Wrapped the final Admin Actions `SectionCard` in a `grid-cols-1 lg:grid-cols-3 gap-6` with `lg:col-span-2` (form) and `lg:col-span-1` (`<TimelineCard>`). Added the "A note is required when closing an issue." helper text below the status select. Save button `disabled` now includes `blockCloseForEmptyNote` plus `disabled:cursor-not-allowed`. Outer wrapper `max-w-4xl` → `max-w-5xl`.

## Decisions Made

1. **Path A for adminUserId resolution.** `src/lib/auth/rbac.ts::requireSuperAdmin` returns `SessionUser` with `id: string`, so `adminUserId = adminUser.id` works directly. Path B (auth.getUser() after the gate) would be a redundant roundtrip. Confirmed in-session by reading rbac.ts before writing page.tsx.
2. **Local reverse of events[] in TimelineCard, not in the SQL.** Keeps the server-side sort predictable (ASC) for any future consumers (API routes, exports, etc.) while the UI owns display ordering. One-time `O(n)` cost on a low-volume list.
3. **Per-path screenshot_expired dedup via `note = screenshot_path` column.** The `issue_report_events` schema doesn't have a dedicated path column, and adding one would require a migration. Using `note` works because `screenshot_expired` events have no other use for the note field. Acknowledged trade-off (T-38-14 in threat model): if the storage path rotates for the same report, a new expired row fires — that's actually desired behavior (new expiry = new signal).
4. **blockCloseForEmptyNote as derived state, no useEffect.** Re-evaluates on every render so textarea edits immediately unlock Save. Simpler and less buggy than an effect-based mirror.
5. **max-w-4xl → max-w-5xl widening.** Without widening, the 2:1 split squeezes the form too tight at lg: breakpoints (where lg: starts at 1024px). max-w-5xl = 64rem = 1024px matches the breakpoint exactly; no visible regression on smaller screens because they stack.

## Deviations from Plan

**None — plan executed exactly as written.** All 7 sub-changes in Task 3 applied in order, Task 2 used Path A (as allowed by the plan after reading rbac.ts), Task 1 file content matches the spec byte-for-byte. No auto-fixes needed.

The Task 2 → Task 3 intermediate state showed one expected TypeScript error (`ReportDetailProps` did not yet include `events`) which resolved automatically once Task 3 added the field. This is correct per the plan's task ordering.

## Issues Encountered

**Worktree base mismatch on startup.** The worktree started at `2f4c25d` (ahead of the intended base `15a2b4a` on the per-task audit log path). This meant the Wave 1 commits (`5f9cf4a` migration + `b7f7b5f` types + `ade2338` summary + `15a2b4a` roadmap) were not in the worktree tree, so `IssueReportEventWithActor` wouldn't have resolved. Fixed by `git reset --hard 15a2b4a` to move the worktree branch onto the correct base before starting Task 1. No work lost — the `2f4c25d` state was a parallel "quick task" that isn't related to Phase 38. Subsequent tasks all committed cleanly on top.

## User Setup Required

None — changes are UI + server-component only. No env vars, no new dependencies, no dashboard actions. Ready to merge once the orchestrator collects all wave-2 worktrees.

## Next Phase Readiness

- **Plan 38-02 compatibility:** No file overlap. Plan 38-02 writes `reported`/`status_changed`/`note_added` events in the POST and PATCH API routes; this plan writes `viewed_by_admin`/`screenshot_expired` in the server loader. Both plans share the same target table (`issue_report_events`) but touch disjoint file sets per `<boundaries>`.
- **Plan 38-04 (if exists — verifier):** Nothing to verify beyond the success criteria already checked here. Open browser to `/admin/reports/{id}` at ≥1024px → 2:1 grid visible; resize below lg: → stacks; set status to Resolved with empty notes → Save disabled + red helper text; save from empty → still blocked; fill note → unlocks; reload page within 24h → no duplicate view row.
- **No blockers.** TypeScript clean across all 3 touched files.

## Known Stubs

None introduced. Pre-existing UI copy in `report-detail.tsx` (tenant URL disclaimer, textarea placeholder text) was present from Phase 33 and is not part of this plan's scope.

## Self-Check: PASSED

- File `src/app/admin/reports/[id]/timeline-card.tsx` — FOUND (210 lines)
- File `src/app/admin/reports/[id]/page.tsx` — FOUND (120 lines, rewritten)
- File `src/app/admin/reports/[id]/report-detail.tsx` — FOUND (674 lines, edited)
- Commit `17fc021` — FOUND on `worktree-agent-a803c2e5`
- Commit `bd62d00` — FOUND on `worktree-agent-a803c2e5`
- Commit `90e317c` — FOUND on `worktree-agent-a803c2e5`
- `npx tsc --noEmit` — zero errors across all 3 modified/created files
- All 5 event-type cases present in timeline-card.tsx (grep-verified: `reported`, `status_changed`, `note_added`, `viewed_by_admin`, `screenshot_expired`)
- `dangerouslySetInnerHTML` — NOT present in timeline-card.tsx (grep-verified absence)
- `grid-cols-1 lg:grid-cols-3`, `lg:col-span-2`, `lg:col-span-1` — all present in report-detail.tsx
- `blockCloseForEmptyNote` + `"A note is required when closing an issue."` — present in report-detail.tsx
- `issue_report_events` references in page.tsx — 5 total (2 dedup SELECTs, 2 INSERTs, 1 final events SELECT); requirement ≥4 satisfied
- `24 * 60 * 60 * 1000` present in page.tsx for 24h dedup window
- `max-w-5xl` present in report-detail.tsx (widened from max-w-4xl)

---
*Phase: 38-issue-report-timeline-audit-log-with-right-rail-event-histor*
*Plan: 03*
*Completed: 2026-04-14*
