---
phase: 37-llm-prompt-overhaul-fix-hallucination-model-selection-weak-p
plan: "03"
subsystem: enrichment
tags: [anti-hallucination, prompts, llm, lookalike, dossier]
dependency_graph:
  requires: [37-02]
  provides: [anti-hallucination-summary-prompt, lookalike-enum-constraints, dossier-relaxed-validation]
  affects: [src/lib/enrichment/claude.ts, src/lib/enrichment/lookalike.ts]
tech_stack:
  added: []
  patterns: [anti-hallucination-rules, zod-enum-validation, prompt-engineering]
key_files:
  created: []
  modified:
    - src/lib/enrichment/claude.ts
    - src/lib/enrichment/lookalike.ts
decisions:
  - "Remove ai_summary from lookalike LLM input to break hallucination amplification chain"
  - "Use 6 CRITICAL RULES in summary system prompt rather than a single sentence instruction"
  - "Relax dossier minimums to 1 hook / 2 facts to handle thin-data prospects gracefully"
  - "Expand Apollo companySizes to granular ranges (11,20 | 21,50 etc) matching Apollo's actual enum set"
metrics:
  duration: "~8 min"
  completed: "2026-04-10"
  tasks: 3
  files: 2
---

# Phase 37 Plan 03: Anti-Hallucination Prompt Hardening Summary

**One-liner:** 6-rule anti-hallucination system prompt for prospect summary, ai_summary removed from lookalike input, and dossier relaxed to 1-hook/2-fact minimums for thin-data prospects.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace summary system prompt with anti-hallucination rules (D-02) | 40fac06 | src/lib/enrichment/claude.ts |
| 2 | Remove ai_summary from lookalike input, add explicit enum constraints (D-04) | 3226ccd | src/lib/enrichment/lookalike.ts |
| 3 | Tighten dossier output ranges and relax validation (D-08) | 51f2bdd | src/lib/enrichment/claude.ts |

## What Was Built

### Task 1 -- Anti-hallucination summary prompt (D-02)

Replaced the single-sentence `SYSTEM_PROMPT` in `generateProspectSummary()` with a 6-rule system prompt that:
- Prohibits fabricating any dollar amounts, share counts, or transaction values not explicitly in the input
- Requires the LLM to acknowledge thin data honestly rather than guessing from job title
- Prohibits vague wealth phrases ("significant net worth") without a specific number
- Requires noting when enrichment sources are missing

Also updated the sparse-input early return message from a generic "Insufficient enrichment data" to a specific message that names the missing sources (web presence + SEC filing data). Added a clarifying comment confirming the `&&` threshold is intentional.

### Task 2 -- Remove ai_summary from lookalike, explicit enums (D-04)

Removed the `AI Summary:` block from the lookalike user message. This breaks the hallucination amplification chain where a fabricated prospect summary was being fed back into the LLM as fact.

Added explicit enum constraints to both the CRITICAL RULES section and the JSON example in `SYSTEM_PROMPT`:
- Seniorities: exact list of Apollo values including `training`
- CompanySizes: expanded from 8 coarse ranges to 11 granular Apollo ranges (e.g. `11,20`, `21,50`, `51,100` instead of `11,50`, `51,200`)

Updated Zod `PersonaSchema` to match: added `training` to seniority enum, expanded companySizes enum to the granular set. Updated `VALID_SENIORITIES` set accordingly.

### Task 3 -- Relax dossier output ranges (D-08)

Updated `DOSSIER_SYSTEM_PROMPT` instructions:
- `outreach_hooks`: 3-5 -> 1-5, with note that 1-2 is fine when data is thin
- `quick_facts`: 4-6 -> 2-6, with note to only include explicitly-stated facts

Added post-parse minimum length check after the existing field-presence validation. If `outreach_hooks.length < 1` or `quick_facts.length < 2`, logs an error and returns null. This prevents the previous situation where thin-data prospects caused dossier generation to fail because the LLM couldn't produce 3+ grounded hooks.

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all changes are prompt and validation logic, no UI stubs or placeholder data.

## Threat Flags

No new threat surfaces introduced. Changes address mitigations T-37-06, T-37-07, T-37-08, T-37-09 as planned.

## Self-Check: PASSED

- `src/lib/enrichment/claude.ts` -- modified, verified
- `src/lib/enrichment/lookalike.ts` -- modified, verified
- Commit 40fac06 -- exists (Task 1)
- Commit 3226ccd -- exists (Task 2)
- Commit 51f2bdd -- exists (Task 3)
- `pnpm build` -- passed without errors
