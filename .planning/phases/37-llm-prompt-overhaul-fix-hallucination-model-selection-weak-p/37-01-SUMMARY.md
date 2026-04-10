---
phase: 37-llm-prompt-overhaul-fix-hallucination-model-selection-weak-p
plan: "01"
subsystem: ai-gateway
tags: [llm, openrouter, edgar, gpt-4o-mini, sec-resolver]
dependency_graph:
  requires: []
  provides: [openai/gpt-4o-mini default model, 25s LLM timeout, individual-company SEC resolver]
  affects: [all LLM callers via openrouter.ts, SEC company resolver in edgar.ts]
tech_stack:
  added: []
  patterns: [centralized LLM model constant, individual-company heuristic evaluation]
key_files:
  created: []
  modified:
    - src/lib/ai/openrouter.ts
    - src/lib/enrichment/edgar.ts
decisions:
  - GPT-4o-mini chosen as default for better structured JSON output at same cost tier as Claude Haiku
  - Timeout raised to 25s to reduce spurious LLM timeouts under OpenRouter latency spikes
  - SEC resolver rule 5 replaced with individual evaluation to stop false PRIVATE classification of publicly traded niche companies
metrics:
  duration: "~4 min"
  completed: "2026-04-11"
  tasks_completed: 2
  files_modified: 2
requirements:
  - D-01
  - D-09
---

# Phase 37 Plan 01: LLM Model Swap and SEC Resolver Heuristic Fix Summary

GPT-4o-mini as platform-wide default LLM with 25s timeout, and SEC company resolver upgraded from industry-blanket rule to individual-company evaluation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Swap default model to GPT-4o-mini and increase timeout | e4245c4 | src/lib/ai/openrouter.ts |
| 2 | Replace SEC resolver industry-blanket heuristic | 916235b | src/lib/enrichment/edgar.ts |

## Changes Made

### Task 1 — openrouter.ts (e4245c4)

- `DEFAULT_MODEL` changed from `"anthropic/claude-3.5-haiku"` to `"openai/gpt-4o-mini"`
- `AbortSignal.timeout` raised from `15_000` ms to `25_000` ms
- JSDoc comment on file and `@param model` updated to reference `openai/gpt-4o-mini`
- All 9 callers that do not pass an explicit model override now default to GPT-4o-mini automatically; the dossier caller in `claude.ts` uses `DOSSIER_MODEL = "openai/gpt-4o-mini"` explicitly and is unaffected

### Task 2 — edgar.ts (916235b)

- Rule 5 of the SEC company resolver system prompt replaced:
  - Before: `"Startups, biotech companies without IPOs, regional firms, and most companies with fewer than 500 employees are almost always private — return 'PRIVATE' for these."`
  - After: `"Evaluate each company individually. Do not apply blanket rules by industry — some biotech, fintech, and energy companies ARE publicly traded. Base your answer on whether you specifically know THIS company to be listed on a US exchange."`
- Rules 1–4 and rule 6 are unchanged
- Two-stage post-verification (SEC ticker list match + live SEC submissions API ping) is unchanged — LLM output is never trusted without verification (T-37-02 mitigation intact)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. T-37-02 mitigation (two-stage verification) confirmed intact after prompt change.

## Self-Check: PASSED

- [FOUND] src/lib/ai/openrouter.ts — modified
- [FOUND] src/lib/enrichment/edgar.ts — modified
- [FOUND] commit e4245c4 — feat(37-01): swap default LLM to GPT-4o-mini, increase timeout to 25s
- [FOUND] commit 916235b — fix(37-01): replace SEC resolver industry-blanket heuristic with individual-company evaluation
- Build: pnpm build completed without errors
