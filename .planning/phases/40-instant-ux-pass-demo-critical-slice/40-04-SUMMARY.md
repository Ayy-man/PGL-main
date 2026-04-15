---
phase: 40-instant-ux-pass-demo-critical-slice
plan: 04
subsystem: realtime

tags: [supabase, realtime, polling, fallback, react-hook, vitest]

# Dependency graph
requires:
  - phase: 40-03
    provides: ListProspectsRealtime — the one new tenant-scoped channel on prospects.enriched_at

provides:
  - useRealtimeWithFallback hook + pure createFallbackController state machine
  - 10s setInterval polling fallback triggered on CHANNEL_ERROR / TIMED_OUT, auto-cancels on SUBSCRIBED
  - 40-CHANNEL-AUDIT.md — grep-verifiable audit of every supabase.channel() + cleanup pair in src/
  - Polling path wired into ListProspectsRealtime (router.refresh every 10s when WS degraded)

affects:
  - 40-05 (optimistic mutations) — can reuse the controller if any optimistic surface wants a WS heartbeat
  - 40-08 (UAT) — step 8 (kill WS, observe polling) now has a concrete implementation to verify
  - 40.1 post-Maggie — any future Realtime channel should wrap with useRealtimeWithFallback

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-controller / thin-hook split: state machine lives in a plain function (createFallbackController), React hook is ~30-line glue layer. Vitest-node covers the machine end-to-end without RTL or jsdom."
    - "Supabase channel status callback (.subscribe(onStatus)) drives fallback transitions — not a timer, not a ping."
    - "Channel audit as a doc artifact: every .channel() callsite enumerated in 40-CHANNEL-AUDIT.md with cleanup + fallback status, grep-reproducible."

key-files:
  created:
    - src/lib/realtime/with-polling-fallback.ts
    - src/lib/realtime/__tests__/with-polling-fallback.test.ts
    - .planning/phases/40-instant-ux-pass-demo-critical-slice/40-CHANNEL-AUDIT.md
    - .planning/phases/40-instant-ux-pass-demo-critical-slice/deferred-items.md
  modified:
    - src/app/[orgId]/lists/components/list-prospects-realtime.tsx

key-decisions:
  - "Split pure controller from React hook so Phase 40 CONTEXT.md's locked 'no RTL, pure-helper only' test strategy applied cleanly — 13 vitest cases fully exercise the state machine without touching React."
  - "Kept the polling fallback opt-in per channel. Of the 3 channels in src/, only #3 (the tenant-wide enrichment broadcast in list-prospects-realtime.tsx) was wrapped. Channels #1 and #2 are short-lived / small-surface and documented as audited-only in 40-CHANNEL-AUDIT.md."
  - "Used router.refresh() as the poll payload — cheap Next.js App Router re-fetch that already pulls enriched fields from the SSR boundary. Avoids duplicating the Supabase select inside the fallback."
  - "Interval is idempotent — repeat CHANNEL_ERROR events don't stack multiple setInterval handles. dispose() is safe to call twice."
  - "CLOSED status is explicitly ignored by the controller. It fires on every normal unmount + tab backgrounding; treating it as a fallback trigger would start polling on every navigation."

patterns-established:
  - "Realtime + polling fallback: any Supabase channel that needs degraded-path coverage wraps in useRealtimeWithFallback and passes a subscribe() closure that returns a supabase.removeChannel cleanup."
  - "Every .channel() in src/ must have a matching removeChannel in the same file. Audit doc enforces 1:1 pairing; grep reproduces the check."
  - "Pure controller / thin hook split for testable stateful React utilities: state machine is a plain function with an optional injectable clock, hook is a <30-line React glue layer."

requirements-completed:
  - PHASE-40-REALTIME-CHANNEL-CLEANUP

# Metrics
duration: ~35min
completed: 2026-04-15
---

# Phase 40 Plan 04: Polling Fallback + Channel Cleanup Audit Summary

**10-second router.refresh polling fallback for Supabase Realtime channels when WebSocket reports CHANNEL_ERROR or TIMED_OUT, plus grep-verified channel cleanup audit across all 3 channels in src/.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-15T12:59:00Z
- **Completed:** 2026-04-15T13:34:00Z
- **Tasks:** 2 (of 2 planned)
- **Files modified:** 1 (list-prospects-realtime.tsx)
- **Files created:** 4 (hook + test + audit doc + deferred-items doc)

## Accomplishments

- **Pure controller + hook** — `createFallbackController` is a state machine (idle → polling on CHANNEL_ERROR/TIMED_OUT → idle on SUBSCRIBED → disposed). `useRealtimeWithFallback` is the React hook glue. 13 vitest cases cover every branch including idempotent re-trigger, churn, sync/async poll failures, custom intervals, and injected clock.
- **Plan 40-03 channel retrofitted** — `ListProspectsRealtime` now calls `useRealtimeWithFallback({ channelName, subscribe, poll: router.refresh })`. When the WS dies, the page polls every 10s until the channel recovers — Adrian's "green without refresh" promise survives flaky wifi.
- **Channel audit doc** — `40-CHANNEL-AUDIT.md` enumerates all 3 channels in src/ (2 pre-existing + 1 from Plan 40-03). Every `.channel()` callsite is paired 1:1 with a `removeChannel(channel)` callsite in the same file, grep-reproducible.

## Task Commits

1. **Task 1: Build useRealtimeWithFallback hook + tests** — `ef1f0bc` (feat)
2. **Task 2: Retrofit Plan 40-03 channel + write audit doc** — `cc7f32e` (feat)

## Files Created/Modified

- `src/lib/realtime/with-polling-fallback.ts` — pure controller + React hook wrapper
- `src/lib/realtime/__tests__/with-polling-fallback.test.ts` — 13 vitest cases, node env only
- `src/app/[orgId]/lists/components/list-prospects-realtime.tsx` — retrofitted to use the fallback hook
- `.planning/phases/40-instant-ux-pass-demo-critical-slice/40-CHANNEL-AUDIT.md` — per-channel audit with cleanup + fallback status
- `.planning/phases/40-instant-ux-pass-demo-critical-slice/deferred-items.md` — log of 2 pre-existing out-of-scope failures

## Decisions Made

- **Pure controller vs hook-only:** CONTEXT.md locks the test strategy to pure helpers with Vitest node env (no RTL, no jsdom). Extracting `createFallbackController` as a plain function with an optional injectable clock made the state machine testable end-to-end; the `useRealtimeWithFallback` hook then composed the controller with `useEffect` as a thin glue layer. Alternative (inline state in the hook) would have forced RTL — explicitly off the table.
- **Opt-in polling per channel:** Only the tenant-wide broadcast channel (`prospects-enriched-${tenantId}`) got wrapped. The two pre-existing channels (`list-re-enrich-${prospectId}` and `prospect-${prospect.id}`) are short-lived / small-surface and documented in the audit as audited-only. Wrapping them would trade a rare WS-drop edge case for extra polling load during normal usage.
- **`router.refresh()` as poll payload:** Next.js App Router re-fetches server components, which already include enriched fields. No duplicated Supabase select inside the fallback.
- **CLOSED ignored on purpose:** CLOSED fires on every unmount and tab-backgrounding. Treating it as a fallback trigger would start polling on every route change. Only true error signals (`CHANNEL_ERROR`, `TIMED_OUT`) trip the fallback.

## Deviations from Plan

### Scope deviations

**1. [Rule 3 — Blocking scope adjustment] Reduced retrofit scope from 3 files → 1 file**
- **Found during:** Reading the plan
- **Issue:** The plan's `files_modified` frontmatter and Task 2 `<action>` both list `list-member-table.tsx` and `prospect-slide-over.tsx` as retrofit targets for Plan 40-02's `saved-search-enrichment-${tenantId}` channels. Plan 40-02 was abandoned on 2026-04-15 (schema mismatch — see 40-02-PLAN.md frontmatter) so those channels were never built and do not exist in the codebase.
- **Fix:** Retrofitted only the single surviving new channel from Plan 40-03 (`prospects-enriched-${tenantId}` in `list-prospects-realtime.tsx`). The two pre-existing channels in `list-member-table.tsx` and `profile-view.tsx` are documented in 40-CHANNEL-AUDIT.md as audited-only — self-terminating and small-surface respectively.
- **Alignment with user prompt:** The execute-phase orchestrator prompt explicitly scoped the task to "the one surviving channel from 40-03 plus the 2 pre-existing channels in the codebase" and listed exactly 4 files in `files_modified`. This matches what shipped.
- **Verification:** `grep -rn "\.channel(" src/` returns exactly 3 hits, one per channel. `grep -rn "supabase\.removeChannel(" src/` returns exactly 3 callsites, one per file. No orphaned `saved_search_prospects` references.
- **Committed in:** `cc7f32e` (Task 2 commit)

**2. [Rule 3 — Blocking scope adjustment] Channel audit table lists 3 channels, not 5**
- **Found during:** Writing 40-CHANNEL-AUDIT.md
- **Issue:** The plan's sample table in Task 2 lists 5 rows (2 pre-existing + 3 new across 2 files in Plan 02). Plan 02 is abandoned.
- **Fix:** Audit table lists the 3 channels that actually exist: rows #1 (list-member-table re-enrich), #2 (profile-view prospect), #3 (list-prospects-realtime tenant broadcast). Updated the must_have truth check: "Every new channel uses useRealtimeWithFallback" applies to channel #3 only, which it does.
- **Committed in:** `cc7f32e`

### Tooling deviations

**3. [Rule 3 — Blocking] Ran `pnpm install` before tests**
- **Found during:** Task 1 test verification
- **Issue:** Worktree started with `node_modules/` absent; `pnpm test` failed with `vitest: command not found`.
- **Fix:** `pnpm install` — no package.json changes, just populated `node_modules/`.
- **Verification:** 13/13 new tests pass, 11/11 existing realtime tests pass.
- **Committed in:** N/A (no lockfile changes to commit).

---

**Total deviations:** 3 scope adjustments + 1 tooling. All driven by Plan 40-02's abandonment upstream; no functional scope creep. Work shipped matches the orchestrator prompt exactly.

## Issues Encountered

- **Pre-existing test failures surfaced during full-suite check** — `src/inngest/functions/__tests__/enrich-prospect.test.ts` has 22 failing cases (`TypeError: supabase.rpc is not a function`). Verified at base commit `f52a9ca` — entirely pre-existing and unrelated to this plan's subsystem. Logged in `.planning/phases/40-instant-ux-pass-demo-critical-slice/deferred-items.md`. Fix path: add an `.rpc` stub to the test-file's mocked Supabase client.
- **Pre-existing SSG prerender errors** — `pnpm build` compiles successfully (`✓ Compiled successfully`) but fails at the static export step on auth/admin pages with `TypeError: Cannot read properties of undefined (reading 'trim')`. Root cause is missing Supabase env vars in the worktree shell. Verified at base — identical failure. Logged in `deferred-items.md`. Does not affect Vercel production builds.

## User Setup Required

None — no external service configuration required. The fallback is behavioural only.

## UAT coverage deferred to Plan 40-08

- Step 8 (disable WS → observe 10s polling kicks in → observe green still lands) — the mechanism shipped in this plan; manual verification against `pgl-main.vercel.app` lives in Plan 40-08.
- Step 9 (no ghost subscriptions on unmount) — React DevTools Profiler check, documented in audit confirmation checklist with an unchecked box pointing at Plan 40-08.

## Next Phase Readiness

- Plan 40-05 (optimistic mutations for lists) is unblocked — no dependency on realtime fallback.
- The `useRealtimeWithFallback` pattern is available for any future Realtime channel (Phase 40.1 admin surfaces especially will benefit if they need live status).
- `createFallbackController` is the pure building block — if a non-Realtime surface ever needs "retry with polling on failure", the same machine applies.

## Self-Check: PASSED

**Claimed files verified:**
- `src/lib/realtime/with-polling-fallback.ts` — FOUND
- `src/lib/realtime/__tests__/with-polling-fallback.test.ts` — FOUND (13 tests, all passing)
- `src/app/[orgId]/lists/components/list-prospects-realtime.tsx` — FOUND (modified, imports `useRealtimeWithFallback`)
- `.planning/phases/40-instant-ux-pass-demo-critical-slice/40-CHANNEL-AUDIT.md` — FOUND
- `.planning/phases/40-instant-ux-pass-demo-critical-slice/deferred-items.md` — FOUND

**Claimed commits verified:**
- `ef1f0bc` — FOUND in `git log` (Task 1: hook + tests)
- `cc7f32e` — FOUND in `git log` (Task 2: retrofit + audit doc)

**Verification:** see post-summary self-check block (executed below).

---
*Phase: 40-instant-ux-pass-demo-critical-slice*
*Completed: 2026-04-15*
