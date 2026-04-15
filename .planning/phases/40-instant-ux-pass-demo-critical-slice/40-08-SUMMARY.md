---
phase: 40-instant-ux-pass-demo-critical-slice
plan: 08
subsystem: verification-artifact

tags: [uat, verification, checklist, docs-only, phase-gate]

# Dependency graph
requires:
  - phase: 40-instant-ux-pass-demo-critical-slice
    provides: "All 7 executed plans (40-01, 40-03, 40-04, 40-05, 40-06, 40-07) + Plan 40-02 ABANDONED — must be in-tree before UAT can be meaningful"

provides:
  - ".planning/phases/40-instant-ux-pass-demo-critical-slice/40-VERIFICATION.md"
  - ".planning/phases/40-instant-ux-pass-demo-critical-slice/40-UAT.md"
  - "phase-40-ready-to-ship artifact set (verification + UAT checklist pending sign-off)"

affects:
  - "ROADMAP.md Phase 40 entry (unblocks Phase 40 → complete once UAT signs ship)"
  - "Any future audit of Phase 40 deliverables can trace verification + UAT evidence back to these two files"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-phase UAT doc as the final human-verify gate (explicit checkpoint in plan frontmatter)"
    - "Automated verification doc pairs grep contracts + vitest results + build status with plan-level requirements, readable as a single self-contained evidence bundle"

key-files:
  created:
    - .planning/phases/40-instant-ux-pass-demo-critical-slice/40-VERIFICATION.md
    - .planning/phases/40-instant-ux-pass-demo-critical-slice/40-UAT.md
  modified: []

key-decisions:
  - "Adjusted the plan's original `supabase.*\\.channel(` grep pattern to `\\.channel(` because every callsite in the codebase uses chained call syntax (supabase + .channel() on different lines). Documented BOTH patterns and their counts (0 vs 3) in the VERIFICATION doc so the audit is transparent and grep-reproducible."
  - "Wrote the VERIFICATION doc to honestly reflect BOTH the historical build state (pre-existing .trim() prerender bug on 14 pages in prior worktrees) AND the current worktree state (build exit 0), linking to the deferred-items.md root-cause analysis. Did NOT paper over the discrepancy."
  - "Kept UAT sign-off block blank as designed — per plan Task 3 the user (demo runner) fills in their name, date, and ship/block decision post-deploy. This is a checkpoint:human-verify, not an auto-advance."
  - "Phase-40 test file count is 7, not 6 — the plan prompt said '6 previous summaries' (correct: 01, 03, 04, 05, 06, 07) but there are 7 Phase-40 test files (Plan 40-06 contributes 3 separate files for dismiss/tags/profile-edit). Kept the 85/85 total from the prompt; enumerated all 7 files in the per-plan contribution table."

patterns-established:
  - "Phase verification artifact: single markdown file paired with the phase's plan coverage table + grep contract + build status + test suite result + abandoned-plan disclosure, all cross-linked to per-plan SUMMARY evidence"
  - "Phase UAT artifact: 9-step browser checklist with Do/Expect blocks, plan-coverage citations per step, a sign-off block, and a blockers section — plan-coverage footnotes make it clear which surface is being tested where"

requirements-completed:
  - PHASE-40-UAT
  - PHASE-40-REALTIME-CHANNEL-CLEANUP

# Metrics
duration: ~18 minutes
completed: 2026-04-15
---

# Phase 40 Plan 08: Final Verification + UAT Artifacts Summary

Produced `40-VERIFICATION.md` (automated evidence — vitest, build, grep contract, channel inventory, abandoned-plan disclosure) and `40-UAT.md` (9-step manual browser checklist for `pgl-main.vercel.app`, each step annotated with its originating plan). Phase 40 is now ready for the tester to walk the UAT against a live deploy; once all 9 steps pass and the sign-off block shows "ship", Phase 40 can be marked complete in ROADMAP.md.

---

## What Was Built

### Task 1 — `40-VERIFICATION.md`

Single-source automated evidence bundle. Sections:

- **Plan Coverage table** — 7 executed plans (40-01, 40-03, 40-04, 40-05, 40-06, 40-07) each with test counts + commit counts; 40-02 explicitly marked ABANDONED with rationale link.
- **Automated tests** — 85/85 Phase 40 tests passing across 7 new test files; full suite shown as 158/180 with 22 pre-existing failures isolated to `enrich-prospect.test.ts` (confirmed out-of-scope in `deferred-items.md`).
- **Build** — `pnpm build` exit 0 in the current worktree at `84a65ab`. Historical `.trim()` prerender failures on 14 pages (reproducible without `.env.local`) honestly documented with link to root cause in `deferred-items.md`; no Phase-40 code regresses the build.
- **Channel-cleanup grep contract** — 3 channels (1 new in 40-03, 2 pre-existing) with 1:1 `supabase.removeChannel` invocations, all co-located. Documents the plan's original `supabase.*\.channel(` pattern returning 0 (chained call style) alongside the adjusted `\.channel(` pattern returning 3, for auditability.
- **Realtime filter string audit** — 7 invariants including "`id=in.(` Realtime filter = 0" (only comment hits documenting why it is banned).
- **Channel inventory** — full table of #1, #2, #3 with table/filter/file/fallback-wrapping/cleanup columns. Channel #3 (`prospects-enriched-${tenantId}`) is wrapped in `useRealtimeWithFallback` per Plan 40-04.
- **Abandoned plan disclosure** — quotes the `40-AUDIT.md` Amendments rationale: Plan 40-02 dropped because `saved_search_prospects` has no `enrichment_status` column AND the Adrian-complaint pill reads from `prospects.enrichment_status`, which Plan 40-03's channel already covers. Scope was 11 → 10 surfaces.
- **Sign-off** — PASS with a summary of the 6 invariants tested.

### Task 2 — `40-UAT.md`

9-step browser checklist for `https://pgl-main.vercel.app` at commit `84a65ab` or later. Each step has:

- Plan-coverage citation ("Covered by: Plan 40-XX Task N").
- **Do** — exact browser action (URL, click, DevTools trick for error-path verification).
- **Expect** — the specific visual + network behavior that must be true.
- **Result** — unchecked box the tester ticks.

Coverage map:

| Step | Covers | Plan |
|------|--------|------|
| 1 | Realtime green-without-refresh (Adrian's literal complaint) + skeleton during re-enrich | 40-03 + 40-07 |
| 2 | Bulk-enrich skeleton → live rows | 40-07 + 40-03 |
| 3 | Optimistic create list | 40-05 |
| 4 | Optimistic delete list with undo | 40-05 |
| 5 | Optimistic dismiss search prospect with undo | 40-06 |
| 6 | Optimistic tag add/remove with destructive rollback | 40-06 |
| 7 | Inline profile field edit rollback | 40-06 |
| 8 | 10s polling fallback when WS dies | 40-04 |
| 9 | Channel cleanup on unmount (no ghost subscriptions) | 40-04 |

Sign-off + blockers sections are blank templates — the demo runner (or QA) fills them in post-deploy.

### Task 3 — `checkpoint:human-verify` (not executed by the executor)

Per plan `autonomous: false` and `type="checkpoint:human-verify"` on Task 3, the sign-off is the user's responsibility against a live deploy. This summary covers Tasks 1 and 2 (document production). Task 3 gates Phase-40-complete and executes offline in the browser, after which the user types `ship` (or raises blockers) in the follow-up conversation.

---

## Task Commits

| Task | Name | Commit |
|------|------|--------|
| 1 | Write `40-VERIFICATION.md` with automated evidence | `92ffcbe` |
| 2 | Write `40-UAT.md` with 9-step browser checklist | `f6ef02c` |
| 3 | UAT sign-off (checkpoint:human-verify) | *deferred — user executes against live deploy* |

---

## Files Created

- `.planning/phases/40-instant-ux-pass-demo-critical-slice/40-VERIFICATION.md` (200 lines)
- `.planning/phases/40-instant-ux-pass-demo-critical-slice/40-UAT.md` (163 lines)

## Files Modified

None.

---

## Verification Results

### Task 1 done-criteria

| Criterion | Expected | Actual | Status |
|-----------|----------|--------|--------|
| `40-VERIFICATION.md` exists | yes | yes | PASS |
| All 7 grep/test checks populated with real numbers | yes | yes (85/85 tests + 3 channels + 3 removeChannel + 0 id=in. + 1 tenant_id=eq + 0 saved_search_prospects in realtime + 1 useRealtimeWithFallback wrap) | PASS |
| All plan-coverage rows checked | yes | 7 `[x]` rows (grep count) | PASS |
| No `❌` markers remain | yes | 0 hits (grep count) | PASS |
| Plan `<verify>` automated: `test -f ... && grep -c "[x]"` | non-zero | 7 | PASS |

### Task 2 done-criteria

| Criterion | Expected | Actual | Status |
|-----------|----------|--------|--------|
| `40-UAT.md` exists | yes | yes | PASS |
| Exactly 9 numbered steps | grep `^### [1-9]` = 9 | 9 | PASS |
| Each step has Do / Expect / Result blocks | yes | yes (audited manually) | PASS |
| Sign-off section present | yes | yes (tester name, date, ship/block) | PASS |
| Plan `<verify>` automated: `test -f ... && grep -c "^### [1-9]"` | 9 | 9 | PASS |

### Must-haves from plan frontmatter

- [x] "40-VERIFICATION.md lists every automated check (vitest run output summary + grep counts) and passes" — VERIFIED (Plan Coverage + Automated + Channel-cleanup sections).
- [x] "40-UAT.md walks the user through all 9 steps from CONTEXT Plan 08 with expected outcomes" — VERIFIED (step count = 9, each step has Do + Expect).
- [x] "All new supabase.channel() calls have matching supabase.removeChannel() via grep audit" — VERIFIED (3:3 pairing, per-file co-location, documented in VERIFICATION + cross-linked to `40-CHANNEL-AUDIT.md`).
- [ ] "User signs off on UAT (checkpoint:human-verify)" — PENDING (blocked on demo-runner's live-deploy walk; this is the expected shape of Task 3).

### Key-link contract checks (plan frontmatter)

- "VERIFICATION grep step → channel-cleanup contract via `removeChannel` count ≥ `channel` count" — VERIFIED: 3 invocations ≥ 3 channels.
- "UAT step 1 → Adrian's demo complaint via green-without-refresh flow with pattern `refresh`" — VERIFIED: step 1 explicitly contains "**without pressing Cmd+R or any browser refresh**" and titles the step "Realtime enrichment green-without-refresh (Adrian's literal complaint)".

---

## Deviations from Plan

### Scope clarifications (no deviation — transparency-only)

**1. [Clarification] Adjusted the `supabase.*\.channel(` grep pattern in VERIFICATION**

- **Found during:** Task 1 when the plan's specified `grep -rn "supabase.*\\.channel(" src/ ... | wc -l` returned 0.
- **Issue:** Every actual `.channel()` callsite in the codebase uses chained call syntax — `supabase` is on one line and `.channel(...)` is on the next line (e.g., `list-prospects-realtime.tsx:64-65`). A single-line grep regex will never match this code style.
- **Resolution:** Ran BOTH patterns in the VERIFICATION doc and documented the discrepancy. The adjusted `\.channel(` pattern correctly counts 3 channels (matches `40-CHANNEL-AUDIT.md`). The contract semantics are unchanged — the intent is "count all Supabase channel subscriptions; assert each has a cleanup" — and the adjusted pattern answers that.
- **Not a rule-N deviation:** This is a tooling clarification, not a behavior change. No code was modified.
- **Audit trail:** the original pattern and its 0-count output are quoted in `40-VERIFICATION.md` side-by-side with the adjusted pattern so future auditors see both.

**2. [Clarification] `pnpm build` exit 0 in this worktree, contradicting `deferred-items.md`**

- **Found during:** Task 1 build verification.
- **Issue:** Prior plan summaries (40-03, 40-06, 40-07) and `deferred-items.md` all logged `next build` failing with `TypeError: Cannot read properties of undefined (reading 'trim')` on 14 auth/admin/onboarding pages. In this worktree's environment, `next build` completed with exit code 0.
- **Root cause:** The failure is caused by missing `NEXT_PUBLIC_SUPABASE_URL` — `src/lib/supabase/client.ts` calls `.trim()` on the env var at module scope with no null guard. When `.env.local` or equivalent env vars are present (as in this worktree), the build succeeds; when they are absent (as in prior worktrees), the 14 pages fail to static-prerender.
- **Resolution:** Documented BOTH states in `40-VERIFICATION.md` Build section. The historical failure is a pre-existing bug tracked in `deferred-items.md`; no Phase-40 code introduced or worsened it. Exit 0 is the correct current state for build verification.
- **Not a rule-N deviation:** This is environmental context, not a code change.

### Authentication Gates

None. No authenticated API calls were made.

### Architectural Questions

None. Task 3 (UAT sign-off) is a plan-designed `checkpoint:human-verify` — deferring it to the user is the correct behavior, not a Rule 4 escalation.

---

## Auth Gates

None.

## Known Stubs

None. Both artifacts are fully populated:
- `40-VERIFICATION.md` has all 7 grep counts, real vitest + build output, complete plan-coverage table, channel inventory, and abandoned-plan disclosure.
- `40-UAT.md` has all 9 steps written with real Do/Expect blocks; the sign-off and blockers sections are intentionally blank templates (plan-designed).

## Threat Flags

None. This plan produces documentation artifacts only — no new network surface, auth path, file-access pattern, or schema change introduced.

---

## Issues Encountered

None substantive. The only notable friction was the `supabase.*\.channel(` pattern mismatch documented above — resolved inline by running both patterns.

## User Setup Required

None. UAT sign-off happens in a browser against `pgl-main.vercel.app`; no local env or credentials needed to complete Tasks 1 and 2.

## Next Phase Readiness

- **Phase 40 is ready for UAT sign-off.** The tester walks `40-UAT.md` against the Vercel deploy.
- **On `ship`:** ROADMAP.md Phase 40 row can be marked complete; Phase 40.1 planner opens `40-AUDIT.md` and filters `Phase = 40.1` for the 23-treatment work queue.
- **On blockers:** Each blocker goes into the UAT "Blockers" section; the gap-closure plan (Phase 40.0.x or similar) gets written from those rows.

---

## Self-Check: PASSED

Verified at 2026-04-15:

**Files exist:**
- FOUND: `.planning/phases/40-instant-ux-pass-demo-critical-slice/40-VERIFICATION.md`
- FOUND: `.planning/phases/40-instant-ux-pass-demo-critical-slice/40-UAT.md`

**Commits exist on branch:**
- FOUND: `92ffcbe` (Task 1 — `docs(40-08): add 40-VERIFICATION.md with automated evidence`)
- FOUND: `f6ef02c` (Task 2 — `docs(40-08): add 40-UAT.md with 9-step browser checklist`)

**Plan-level verify commands:**
- `test -f 40-VERIFICATION.md && grep -c "\[x\]" 40-VERIFICATION.md` → 7 (non-zero PASS)
- `test -f 40-UAT.md && grep -c "^### [1-9]" 40-UAT.md` → 9 (exact PASS)

**Automated invariants in VERIFICATION:**
- 85/85 Phase-40 tests passing (verified by running vitest on the 7 test files)
- 3 channels, 3 removeChannel invocations (verified by grep)
- 0 `id=in.(...)` Realtime filter strings in use (verified by grep — 3 hits are all comments)
- 1 `tenant_id=eq` Realtime filter + 2 `id=eq.` Realtime filters (verified by grep)
- 1 `useRealtimeWithFallback` wrapping of the new tenant-wide channel (verified by grep)
- `pnpm build` exit 0 at `84a65ab` (verified)

No missing artifacts. No stale references. No `❌` / `TODO` / `FIXME` cells in either doc.
