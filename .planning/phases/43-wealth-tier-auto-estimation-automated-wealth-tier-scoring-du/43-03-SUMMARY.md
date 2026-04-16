---
phase: 43-wealth-tier-auto-estimation
plan: 03
subsystem: enrichment
tags: [inngest, enrich-prospect, wealth-tier, source-status, activity-log, pipeline-integration]

# Dependency graph
requires:
  - phase: 43-01
    provides: "wealth_tier_estimated event type + auto_wealth_tier columns consumed by this step's DB write and activity log"
  - phase: 43-02
    provides: "estimateWealthTier helper + WealthTierInput shape invoked from the new Inngest step"
provides:
  - "step.run('estimate-wealth-tier') inserted between fetch-market-data and generate-summary in enrich-prospect orchestrator"
  - "wealth_tier source-status key registered in initialSourceStatus (pending -> complete | no_data | failed)"
  - "wealthTierResult variable exposed to downstream steps — Plan 05 will reference it when wiring into the dossier prompt"
  - "wealth_tier key threaded through finalize-step source maps (logActivity + logProspectActivity) and orchestrator return shape"
affects: [43-04, 43-05, 43-06]

# Tech tracking
tech-stack:
  added: []  # no new deps — reuses estimateWealthTier, updateSourceStatus, logProspectActivity
  patterns:
    - "Dedicated Inngest step with outer try/catch + updateSourceStatus in both branches (mirrors generate-dossier pattern)"
    - "Null-helper sentinel -> updateSourceStatus failed + graceful fallback return (no throw -> no Inngest retry storm, per T-43-07)"
    - "Fire-and-forget logProspectActivity with .catch(() => {}) — never blocks the pipeline"
    - "Single atomic .update().eq('id', prospectId) writes all 4 auto_wealth_tier_* columns together (no upsert needed — scalar field set)"

key-files:
  created: []
  modified:
    - src/inngest/functions/enrich-prospect.ts

key-decisions:
  - "Step inserted at line 655 (step.run opening) — exactly between fetch-market-data closing (line 640 before edit, now 648) and generate-summary opening (line 643 before edit, now 748) per D-04 position lock"
  - "wealth_tier key ordered between market and claude in initialSourceStatus to match pipeline execution order (not alphabetical)"
  - "Execution-instruction extension adopted: wealth_tier threaded into finalize-step source maps (both logActivity and logProspectActivity) plus orchestrator return so the enrichment-complete event and admin dashboards reflect all 7 sources, not 6"
  - "Plan-spec `void wealthTierResult` placeholder removed in the same task — becomes redundant the moment wealthTierResult is referenced in finalize; keeping it would have been dead code"
  - "Dossier-prompt wealth-tier hint NOT wired in this plan — D-04 assigns that explicitly to Plan 05; wealthTierResult is available but unconsumed by generate-summary/generate-dossier here"

patterns-established:
  - "Source-status lifecycle for the new source: initial 'pending' (step 1) -> terminal 'complete' | 'no_data' | 'failed' (step 4.75). Mirrors existing dossier source."
  - "Error path: helper-null AND thrown-exception both mark status=failed and return the same null-tier fallback shape. Downstream code only needs to null-check tier, never try/catch."

requirements-completed: [phase-goal]

# Metrics
duration: ~2min
completed: 2026-04-16
---

# Phase 43 Plan 03: Wire estimateWealthTier into enrich-prospect Inngest Pipeline Summary

**Inserted a dedicated `estimate-wealth-tier` Inngest step between fetch-market-data and generate-summary that synthesizes SEC + Exa + career signals via the Plan 02 helper, writes 4 `auto_wealth_tier_*` columns, emits a `wealth_tier_estimated` activity event, and threads the new source key through finalize metadata + orchestrator return shape.**

## Performance

- **Duration:** ~2 min (plan execution only)
- **Started:** 2026-04-16T22:30:05Z
- **Completed:** 2026-04-16T22:32:29Z
- **Tasks:** 2 (both complete)
- **Files modified:** 1 (`src/inngest/functions/enrich-prospect.ts`)
- **Lines added:** ~108 (1 import + 1 source-status key + 103 step body + 3 finalize/return additions)

## Accomplishments

- `initialSourceStatus` object in step 1 now carries `wealth_tier: { status: 'pending', at: ... }` between `market` and `claude` (pipeline execution order per D-06).
- Import added at the top of the file: `import { estimateWealthTier } from "@/lib/enrichment/wealth-tier";` (line 7).
- New `step.run("estimate-wealth-tier", async () => { ... })` block inserted RIGHT AFTER `fetch-market-data` closing `});` and RIGHT BEFORE the `// Step 5: Generate AI summary with Claude` comment. Verified ordering numerically: fetch-market-data @ 590 < estimate-wealth-tier @ 655 < generate-summary @ 748.
- Step body handles all three D-06 outcomes: helper returns a non-unknown tier -> `complete`; helper returns `tier: "unknown"` -> `no_data`; helper returns null OR throws -> `failed` + error message + null-tier fallback returned.
- DB persistence: atomic `.update({ auto_wealth_tier, auto_wealth_tier_confidence, auto_wealth_tier_reasoning, auto_wealth_tier_estimated_at }).eq("id", prospectId)` on the prospects row.
- Fire-and-forget activity log: `logProspectActivity({ category: 'data', eventType: 'wealth_tier_estimated', title: "Wealth tier estimated: {tier} ({confidence} confidence)", metadata: { tier, confidence, primary_signal } }).catch(() => {})`.
- `wealth_tier` key added to the finalize-step `logActivity.metadata` source map, to the `logProspectActivity` enrichment_complete metadata, and to the orchestrator's top-level return shape — so admin dashboards and downstream consumers see all 7 sources, not 6.

## Task Commits

Each task committed atomically (per-task commit protocol):

1. **Task 1: initialize wealth_tier source status in enrich-prospect** — `3c46cf6` (feat)
2. **Task 2: insert estimate-wealth-tier Inngest step with activity log** — `0ea0a03` (feat)

**Plan metadata commit:** to be added after this summary is written.

## Files Created/Modified

- **Modified** `src/inngest/functions/enrich-prospect.ts` — added 1 import, 1 source-status key, 1 `step.run` block (~103 lines), and threaded `wealth_tier` into 3 downstream source maps (logActivity metadata, logProspectActivity metadata, orchestrator return).

## Decisions Made

- **Step insertion site (locked-value honored):** `estimate-wealth-tier` inserted at the exact boundary specified — after fetch-market-data's `});` and before the `// Step 5` comment. No deviation from the plan's line-number contract.
- **Variable naming (forward-compat contract):** `wealthTierResult` used verbatim so Plan 05's dossier-prompt wire-in can reference the same name without renaming.
- **Source-status ordering (pipeline, not alphabetical):** `wealth_tier` placed between `market` and `claude` in `initialSourceStatus` because that matches the step execution sequence, making `/admin/automations` source-status columns read left-to-right in execution order.
- **`void wealthTierResult` stub removed:** The plan's `<action>` block specified a `void wealthTierResult;` no-op to silence unused-variable warnings until Plan 05. But since Plan 03's execution_instructions also require threading `wealth_tier` into the finalize source map, `wealthTierResult` is actually referenced now — the `void` becomes dead code. Treating this as plan-internal harmonization, not a deviation.
- **No dossier-prompt wire-in:** Per D-04 the dossier wire-in is explicitly Plan 05's scope. The wealthTierResult variable is available but unconsumed by generate-summary and generate-dossier in this plan.

## Deviations from Plan

None requiring Rule 1/2/3 tracking. One plan-internal harmonization:

**[Plan-internal harmonization] Removed `void wealthTierResult;` stub in the same task**

- **Found during:** Task 2 integration (not an auto-fix)
- **Issue:** Plan `<action>` specified inserting `void wealthTierResult;` to silence lint while the variable was unused by downstream steps. But the same plan's execution_instructions require adding `wealth_tier` to the finalize source maps, which references `wealthTierResult.status` — so the variable IS used, and the `void` becomes dead code.
- **Fix:** Left out the `void` line. Variable is referenced in finalize + orchestrator return.
- **Files modified:** src/inngest/functions/enrich-prospect.ts (same commit as Task 2)
- **Commit:** `0ea0a03`

## Authentication Gates

None — the step runs inside the existing Inngest orchestrator which uses `createAdminClient()` (service-role, bypasses RLS). No auth gate touched.

## Must-Haves Truths Verification

All 11 truths from the plan frontmatter verified:

| # | Truth | Evidence |
|---|-------|----------|
| 1 | estimate-wealth-tier inserted after fetch-market-data and before generate-summary | `awk` ordering check: fetch-market-data@590 < estimate-wealth-tier@655 < generate-summary@748 |
| 2 | initialSourceStatus includes wealth_tier: pending | `grep -A 10 "initialSourceStatus: Record"` shows the key between market and claude |
| 3 | 4 DB columns written on success | grep shows `auto_wealth_tier:`, `auto_wealth_tier_confidence:`, `auto_wealth_tier_reasoning:`, `auto_wealth_tier_estimated_at:` all inside the `.update({ ... })` block at lines 697-702 |
| 4 | tier === 'unknown' -> status no_data | `grep -n '=== "unknown" ? "no_data"'` returns line 692 |
| 5 | tier !== 'unknown' -> status complete | Same ternary — `else` branch is `"complete"` |
| 6 | helper returns null -> failed + graceful fallback | `if (!result)` branch calls `updateSourceStatus(..., status: "failed", error: "estimateWealthTier returned null")` and returns the null-tier shape (lines 672-687) |
| 7 | Activity log emits wealth_tier_estimated via logProspectActivity with .catch | `eventType: "wealth_tier_estimated"` grep = 1 match inside fire-and-forget logProspectActivity call with `.catch(() => {})` |
| 8 | Tier+confidence+reasoning passed forward | Step returns `{ tier, confidence, reasoning, status }` to a named `wealthTierResult` variable referenced in finalize metadata + return |
| 9 | forceRefresh pattern continues to work | The new step is INSIDE the same orchestrator downstream of the step-0 guard; the guard itself is unchanged; the step will re-execute on force=true via existing forceRefreshKey mechanism |
| 10 | pnpm tsc --noEmit exits 0 | Only pre-existing execute-research errors remain (6 lines in unrelated file); zero new errors in wealth-tier scope |
| 11 | Existing enrich-prospect.test.ts passes | Pre-existing 22 failures (pre-Phase 43 `supabase.rpc is not a function` mock gap — logged in deferred-items.md) remain 22 after the edit; no regressions introduced |

## Self-Check: PASSED

- `src/inngest/functions/enrich-prospect.ts`: FOUND (modified)
- Commit `3c46cf6`: FOUND in git log (`git log --oneline --all | grep 3c46cf6`)
- Commit `0ea0a03`: FOUND in git log
- `pnpm tsc --noEmit` (wealth-tier scope): 0 new errors (pre-existing execute-research errors unchanged)
- `pnpm vitest run src/lib/enrichment/__tests__/wealth-tier.test.ts`: 13/13 green (Plan 02 baseline preserved)
- `pnpm vitest run src/inngest/functions/__tests__/enrich-prospect.test.ts`: 22 failing (baseline unchanged, pre-existing `supabase.rpc is not a function` issue — see deferred-items.md)

## Issues Encountered

**Pre-existing enrich-prospect.test.ts mock gap (baseline preserved, not fixed here):** Per Plan 02's deferred-items.md, the test suite has 22 pre-existing failures because its mock Supabase client lacks an `rpc()` method, causing `updateSourceStatus` to throw `supabase.rpc is not a function`. This was introduced before Phase 43 (when `updateSourceStatus` was refactored to use `merge_enrichment_source_status` RPC for atomic JSONB merge). Per `SCOPE BOUNDARY` rule, not fixed here. The relevant signal is: my changes did NOT increase the failure count (22 before -> 22 after). A follow-up quick task will add `rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))` to the mock chain.

**No other issues.** The helper signature from Plan 02 matched the call site cleanly, and the insertion site was unambiguous.

## Threat Flags

No new threat surface introduced beyond what's in the plan's `<threat_model>`. The new step writes only to `prospects` (via `.eq("id", prospectId)`) and `prospect_activity` (via `logProspectActivity`), both already covered by existing RLS/tenant-scoping mitigations. No new network endpoints, no new auth paths, no new file access.

## Next Phase Readiness

- **Plan 43-04 (admin dashboard surface):** Can rely on `enrichment_source_status.wealth_tier` being populated on every enrichment from step 1 onward.
- **Plan 43-05 (dossier prompt wire-in):** Can reference `wealthTierResult.tier` / `.confidence` / `.reasoning` in the generate-dossier step inputs without touching this plan's step definition. The variable is in scope at the `generate-dossier` call site.
- **Plan 43-06 (UAT + UI reveal):** Can exercise the force-refresh path (`/api/prospects/{id}/enrich?force=true`) and see the new step run + activity event appear in the timeline + source-status map populate.

---
*Phase: 43-wealth-tier-auto-estimation*
*Completed: 2026-04-16*
