---
phase: 43-wealth-tier-auto-estimation
plan: 05
subsystem: enrichment
tags: [dossier, wealth-tier, openrouter, gpt-4o-mini, prompt-engineering, pipeline-integration, narrative-coherence]

# Dependency graph
requires:
  - phase: 43-02
    provides: "WealthTier helper types (tier / confidence) consumed by the new DossierInput.autoWealthTier field"
  - phase: 43-03
    provides: "wealthTierResult variable exposed in enrich-prospect scope at the generate-dossier call site"
provides:
  - "DossierInput.autoWealthTier optional field (accepted by generateIntelligenceDossier)"
  - "User-message hint line 'Separate wealth-tier classifier: tier=X, confidence=Y. Use this as context but verify against the specific signals below.' emitted when the tier is non-null"
  - "Inngest generate-dossier step forwards wealthTierResult into the dossier helper as autoWealthTier"
affects: [43-06]

# Tech tracking
tech-stack:
  added: []  # purely additive edits — no new deps
  patterns:
    - "Optional-hint prompt injection (Option B from RESEARCH.md Dossier Integration): user message gains a single context line when a pre-computed classifier output is available; system prompt unchanged"
    - "Null-guarded pass-through between Inngest steps — if the upstream step failed or returned unknown data, the downstream prompt degrades gracefully to its pre-Phase-43 behavior"

key-files:
  created: []
  modified:
    - src/lib/enrichment/claude.ts
    - src/inngest/functions/enrich-prospect.ts

key-decisions:
  - "Hint injected between the 'Publicly traded:' block and the 'Web Intelligence Signals' block — keeps structured context (ticker + tier) together before evidence signals, so the dossier LLM sees the classification before the raw signal list"
  - "Guard condition is `autoWealthTier && autoWealthTier.tier && autoWealthTier.confidence` (truthy-chain) rather than just a null check — defends against partial shapes where one field arrived null, which would otherwise emit a malformed hint line like 'tier=null, confidence=medium'"
  - "DOSSIER_SYSTEM_PROMPT left untouched — Option B (hint, not locked input) intentionally avoids tightening the dossier's system-level constraints. Confirmed by grep showing DOSSIER_SYSTEM_PROMPT count unchanged at 2 (declaration + usage)"
  - "No `void wealthTierResult` shim removal needed — Plan 03 had already elected to omit it because `wealthTierResult.status` is referenced in finalize source maps (documented in Plan 03 deviations)"
  - "autoWealthTier placed as the LAST key in the dossier call object (after stockSnapshot) — mirrors the position of the new field in the DossierInput interface and keeps the diff surgical"

patterns-established:
  - "Optional pass-through prompt hints: when a pre-computed classifier exists upstream and the downstream LLM has an overlapping responsibility, forward the classification as a user-message context line rather than a system-prompt constraint. Preserves independent reasoning while aligning outputs."

requirements-completed: [phase-goal]

# Metrics
duration: ~2min
completed: 2026-04-16
---

# Phase 43 Plan 05: Dossier Hint Pass-Through Summary

**Pass the pre-computed `auto_wealth_tier` (tier + confidence) from the Plan 43-03 Inngest step forward into `generateIntelligenceDossier` as an optional user-message hint, so the dossier's narrative `wealth_assessment` text stays coherent with the structured `auto_wealth_tier` field shown in the UI. Zero system-prompt changes, null-guarded, surgical two-file diff.**

## Performance

- **Duration:** ~2 min (plan execution only)
- **Started:** 2026-04-16T22:36:05Z
- **Completed:** 2026-04-16T22:37:58Z
- **Tasks:** 2 (both complete, committed atomically)
- **Files modified:** 2 (`src/lib/enrichment/claude.ts`, `src/inngest/functions/enrich-prospect.ts`)
- **Lines added:** 19 net (11 in claude.ts, 8 in enrich-prospect.ts)

## Accomplishments

- `DossierInput` interface in `src/lib/enrichment/claude.ts` now accepts an optional
  `autoWealthTier?: { tier: string; confidence: string } | null` field alongside
  `stockSnapshot`.
- `generateIntelligenceDossier` destructures `autoWealthTier` from params and emits the
  exact hint wording specified by plan frontmatter truth #2 when both `tier` and
  `confidence` are non-empty:
  > `Separate wealth-tier classifier: tier=${tier}, confidence=${confidence}. Use this as context but verify against the specific signals below.`
- Hint inserted between the `Publicly traded: ${ticker}` line and the `Web Intelligence Signals` block. Ordering verified numerically (line 172 publicly-traded < 180 hint < 183 websignals).
- `DOSSIER_SYSTEM_PROMPT` unchanged — `grep -c` still returns 2 (declaration + usage). Option B preserved.
- Inngest `generate-dossier` step (step 5.5) passes `wealthTierResult.tier` + `wealthTierResult.confidence` forward as `autoWealthTier` when both are truthy; otherwise passes `null`. Dossier therefore behaves exactly as before when the upstream wealth-tier step failed (graceful degradation).

## Task Commits

Each task committed atomically per the per-task commit protocol:

1. **Task 1: accept optional wealthTier in generateIntelligenceDossier** — `5ecc383` (feat)
2. **Task 2: pass wealthTier into generate-dossier step** — `cd3142e` (feat)

**Plan metadata commit:** to be added after this summary is written.

## Exact Hint Wording (as it lands in the prompt)

When `autoWealthTier = { tier: "very_high", confidence: "medium" }` is passed in, the
`userMessage` receives this inserted line (note: single line, preceded and followed by
newlines, positioned AFTER the `Publicly traded:` line and BEFORE the `Web Intelligence
Signals:` heading):

```
...
Publicly traded: AAPL

Separate wealth-tier classifier: tier=very_high, confidence=medium. Use this as context but verify against the specific signals below.

Web Intelligence Signals:
...
```

When `autoWealthTier` is `null`, `undefined`, or has empty/null `tier` or `confidence`, NO
hint line is emitted and the dossier prompt is byte-identical to its pre-Phase-43
behavior.

## Null-Guard Behavior

Three scenarios verified by code-path inspection:

| Scenario | wealthTierResult shape | Dossier call receives | Hint emitted? |
|---|---|---|---|
| Wealth-tier step succeeded with real tier | `{ tier: "high", confidence: "high", reasoning: "...", status: "complete" }` | `autoWealthTier: { tier: "high", confidence: "high" }` | YES |
| Wealth-tier step succeeded with unknown tier | `{ tier: "unknown", confidence: "low", reasoning: "...", status: "no_data" }` | `autoWealthTier: { tier: "unknown", confidence: "low" }` | YES (carries the "I don't know" signal forward) |
| Helper returned null (parse/validation failure) | `{ tier: null, confidence: null, reasoning: null, status: "failed" }` | `autoWealthTier: null` | NO — dossier prompt byte-identical to pre-Phase-43 |
| Inngest step threw (network error) | `{ tier: null, confidence: null, reasoning: null, status: "failed" }` | `autoWealthTier: null` | NO |

The guard `wealthTierResult.tier && wealthTierResult.confidence ? { ... } : null` in
`enrich-prospect.ts` ensures we never pass a malformed shape down. A second guard
`autoWealthTier && autoWealthTier.tier && autoWealthTier.confidence` inside
`generateIntelligenceDossier` provides defense-in-depth at the callsite.

## System-Prompt Non-Modification Proof

```
$ grep -c "DOSSIER_SYSTEM_PROMPT" src/lib/enrichment/claude.ts
2
```

The 2 matches are the `const DOSSIER_SYSTEM_PROMPT = ...` declaration and the single
`chatCompletion(DOSSIER_SYSTEM_PROMPT, userMessage, ...)` usage — unchanged from before
this plan. Option B (hint, not locked input) preserved.

## Expected Narrative-Alignment Behavior

With the hint injected, the dossier's `wealth_assessment` field is expected to produce
narratives consistent with the structured `auto_wealth_tier` classifier. Two concrete
examples the reviewer can check post-merge on live prospects:

- **Coherent case** (tier=very_high, confidence=high from SEC cash $30M): dossier
  `wealth_assessment` should cite the same numeric evidence and land on a "very high
  net worth" or equivalent framing. Before this plan, the two LLM paths reasoned
  independently from the same underlying signals — agreement was empirical. With the
  hint, agreement is pulled toward the structured tier while still allowing the
  dossier to caveat ("the numbers are thin but consistent with very-high-net-worth").
- **Disagreement-honored case** (tier=emerging, confidence=low from career inference
  only): if Exa subsequently surfaces an explicit Forbes wealth-list mention, the
  dossier LLM can override the hint because the prompt says "verify against the
  specific signals below." The hint is context, not a constraint.

## Decisions Made

- **Hint insertion site between `Publicly traded:` and `Web Intelligence Signals`:**
  Keeps structured context (ticker + tier) together in the prompt before the raw
  signal evidence list — matches how a human reader would scan the prompt.
- **Truthy-chain guard on tier+confidence:** Prevents the `tier=null, confidence=medium`
  malformed-hint case if an upstream step partially populated the variable.
- **No `DOSSIER_SYSTEM_PROMPT` edit:** Deliberate Option B choice. Option C (locked
  tier in system prompt) was explicitly rejected in RESEARCH.md Dossier Integration
  because it would cascade wealth-tier failures into dossier failures.
- **`autoWealthTier` as LAST key in the dossier input object:** Matches the new field's
  position in the interface; reviewers see the diff as a pure append.
- **Skipped `void wealthTierResult` shim cleanup:** Plan 03 already elected to omit the
  shim because `wealthTierResult.status` is referenced in finalize source maps. The
  shim never made it into the HEAD tree, so there was nothing to remove in this plan.
  Documented in Plan 03's deviations section.

## Deviations from Plan

None requiring Rule 1/2/3 tracking. One documented plan-text-vs-tree
reconciliation:

**[Plan-tree reconciliation] `void wealthTierResult` shim removal was a no-op**

- **Found during:** Task 2 execution.
- **Issue:** Task 2 `<action>` instructed deleting a `void wealthTierResult;` statement
  that Plan 03 supposedly added. Grep confirmed the shim was never committed — Plan 03's
  summary explicitly notes this choice (`"void wealthTierResult stub removed in the
  same task"`). The plan text was written before Plan 03 landed.
- **Fix:** No file edit needed; acceptance criterion `! grep "void wealthTierResult"
  src/inngest/functions/enrich-prospect.ts` was already satisfied.
- **Files modified:** none (this item).
- **Commit:** n/a — no change required.

## Authentication Gates

None — all edits are source-only, no new network calls, no new auth paths. The
`generate-dossier` step runs inside the existing Inngest orchestrator under
`createAdminClient()` (service-role, bypasses RLS), unchanged.

## Must-Haves Truths Verification

All 7 truths from the plan frontmatter verified:

| # | Truth | Evidence |
|---|-------|----------|
| 1 | `generateIntelligenceDossier` accepts an optional `autoWealthTier` field on `DossierInput`: `{ tier: string; confidence: string } | null` | `grep -c "autoWealthTier?: { tier: string; confidence: string } \| null" src/lib/enrichment/claude.ts` returns 1 |
| 2 | When `autoWealthTier` is provided, user message includes the exact wording: `"Separate wealth-tier classifier: tier=X, confidence=Y. Use this as context but verify against the specific signals below."` after the 'Publicly traded' line | `grep -c "Separate wealth-tier classifier: tier="` returns 1; awk ordering check shows line 172 (publicly-traded) < 180 (hint) < 183 (websignals) |
| 3 | When `autoWealthTier` is null/undefined, dossier behavior is unchanged (no hint line emitted) | Guard `if (autoWealthTier && autoWealthTier.tier && autoWealthTier.confidence)` gates the `userMessage +=` emission — null short-circuits to no-op |
| 4 | Inngest `generate-dossier` step passes `wealthTierResult` into the dossier helper as `autoWealthTier` when tier+confidence are non-null | `grep -c "autoWealthTier:" src/inngest/functions/enrich-prospect.ts` returns 1 (inside the generate-dossier step); `grep -c "wealthTierResult.tier && wealthTierResult.confidence"` returns 1 |
| 5 | Dossier system prompt is NOT modified — only the user message gains an optional hint line (Option B) | `grep -c "DOSSIER_SYSTEM_PROMPT" src/lib/enrichment/claude.ts` returns 2 — declaration + usage, unchanged |
| 6 | `pnpm tsc --noEmit` exits 0 | Pre-existing `execute-research.test.ts` errors (6 lines) remain unchanged; zero new errors from this plan's edits (confirmed by filter-out grep) |
| 7 | `pnpm test -- --run src/inngest/functions/__tests__/enrich-prospect.test.ts` still passes (no regressions) | 22 pre-existing failures remain 22 after this plan — baseline preserved. Failures are the `supabase.rpc is not a function` mock gap logged in `deferred-items.md`; not introduced by this plan. Plan 02 regression guard `pnpm vitest run src/lib/enrichment/__tests__/wealth-tier.test.ts` shows **13/13 green**. |

## Acceptance Grep Summary (this plan's locked checks)

- `grep "autoWealthTier" src/lib/enrichment/claude.ts src/inngest/functions/enrich-prospect.ts | wc -l` = **5** (meets ≥5 requirement).
- `grep -c "Separate wealth-tier classifier: tier=" src/lib/enrichment/claude.ts` = **1**.
- `! grep "void wealthTierResult" src/inngest/functions/enrich-prospect.ts` = **no match** (satisfied).
- `awk` ordering inside generate-dossier block: `stockSnapshot:` (line 27 of window) before `autoWealthTier:` (line 32 of window).

## Issues Encountered

**Pre-existing enrich-prospect.test.ts mock gap (baseline preserved, not fixed here):**
The 22-failure baseline from Plan 02's `deferred-items.md` (the mock Supabase client
lacks an `rpc()` method, causing `updateSourceStatus` to throw `supabase.rpc is not a
function`) persisted through Plan 03 and remains at exactly 22 after this plan — my
edits did not change the failure count. Per `SCOPE BOUNDARY` rule, not fixed here. A
follow-up quick task will add `rpc: vi.fn(() => Promise.resolve({ data: null, error:
null }))` to the mock chain.

**Pre-existing execute-research.test.ts TypeScript errors (baseline preserved, not
fixed here):** 6 errors in `src/lib/search/__tests__/execute-research.test.ts` unrelated
to Phase 43. Logged in Plan 02 deferred-items.md.

No other issues.

## Threat Flags

No new threat surface introduced. The plan's `<threat_model>` accepts T-43-12 (LLM
parroting the hint) as a soft risk mitigated by the prompt wording ("Use this as
context but verify against the specific signals below"). T-43-13 (cross-tenant tier
leak) stays mitigated — no shared-state caching exists in the LLM path, and
`logProspectActivity` + DB updates are scoped by `prospectId` upstream.

## Next Phase Readiness

- **Plan 43-06 (UAT + UI reveal):** Can exercise the force-refresh path
  (`/api/prospects/{id}/enrich?force=true`) and inspect (a) the structured
  `auto_wealth_tier` field in the UI Sparkles tooltip and (b) the dossier's
  `wealth_assessment` narrative text side-by-side. Expected observation: the two now
  agree on tier classification for the same prospect, where before they could
  contradict.
- **Post-phase polish (deferred):** If Vercel logs show the dossier LLM lazily
  parroting the hint on too many low-confidence cases, tighten the hint wording in a
  follow-up plan (e.g., "if confidence is low, treat as weak context only").

## Self-Check: PASSED

- `src/lib/enrichment/claude.ts`: FOUND (modified)
- `src/inngest/functions/enrich-prospect.ts`: FOUND (modified)
- Commit `5ecc383`: FOUND in git log
- Commit `cd3142e`: FOUND in git log
- `pnpm vitest run src/lib/enrichment/__tests__/wealth-tier.test.ts`: 13/13 green (Plan 02 regression guard)
- `pnpm tsc --noEmit` (wealth-tier scope): 0 new errors (pre-existing execute-research errors unchanged)
- `autoWealthTier` total references across the two modified files: 5 (≥5 required)

---
*Phase: 43-wealth-tier-auto-estimation*
*Completed: 2026-04-16*
