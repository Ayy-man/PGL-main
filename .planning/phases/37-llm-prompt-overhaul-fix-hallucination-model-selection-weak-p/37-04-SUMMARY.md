---
phase: 37-llm-prompt-overhaul-fix-hallucination-model-selection-weak-p
plan: "04"
subsystem: search-nlp
tags: [nlp-parser, query-reformulator, few-shot, validation, exa]
dependency_graph:
  requires: [37-03]
  provides: [NLP-few-shot-examples, companySize-validation, exa-query-optimizer]
  affects: [parse-query-route, research-route, NLSearchBar, research-panel]
tech_stack:
  added: []
  patterns: [few-shot-prompting, allow-list-validation, exa-optimized-queries]
key_files:
  created: []
  modified:
    - src/app/api/search/parse-query/route.ts
    - src/app/api/prospects/[prospectId]/research/route.ts
decisions:
  - "Used 11-bucket Apollo companySize enum (full granularity) instead of legacy 8-bucket set"
  - "Short-circuit threshold lowered to wordCount <= 1 so two-word queries like 'tech founders' reach the LLM"
  - "Exa prompt uses template literal to support multi-line rules/examples without escaping"
metrics:
  duration: "~2 min"
  completed_date: "2026-04-10"
  tasks_completed: 2
  files_modified: 2
requirements:
  - D-07
  - D-05
---

# Phase 37 Plan 04: NLP Parser Few-Shot + CompanySize Validation + Exa Query Optimizer Summary

**One-liner:** NLP parser hardened with 4 few-shot examples, full-Apollo-enum companySize validation, and 1-word short-circuit; research query reformulator rewritten with 7 Exa-specific rules and 4 shot examples.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add few-shot examples, companySize validation, fix short-circuit | 1f1b409 | src/app/api/search/parse-query/route.ts |
| 2 | Rewrite query reformulator with Exa-specific rules and examples | 3e4c4a1 | src/app/api/prospects/[prospectId]/research/route.ts |

## What Was Built

### Task 1 — NLP Parser (parse-query/route.ts)

**Few-shot examples (Part A):** Added 4 examples at the end of SYSTEM_PROMPT demonstrating real query-to-JSON mappings covering founders/startups, finance (bulge bracket), biotech/C-suite, and SaaS/employee-count patterns.

**VALID_COMPANY_SIZES Set (Part B):** Added an 11-bucket allow-list Set matching the full Apollo.io companySize enum: `1,10 | 11,20 | 21,50 | 51,100 | 101,200 | 201,500 | 501,1000 | 1001,2000 | 2001,5000 | 5001,10000 | 10001,`. Previously only seniorities and industries were validated; companySize passed through unchecked (gap D-07).

**CompanySize validation block (Part B):** Post-LLM filter strips any companySize values not in the allow-list Set, deletes the field if all values are stripped, and logs a warning with the count of removed values.

**Short-circuit threshold (Part C):** Changed `wordCount <= 2` to `wordCount <= 1` so two-word queries (e.g., "tech founders", "biotech VPs") are sent to the LLM instead of being treated as keyword-only.

**SYSTEM_PROMPT companySize ranges (Part D):** Updated the prompt's companySize instruction from the legacy 8-bucket set to the full 11-bucket set. Also updated natural-language mapping rules: `startup -> ["1,10","11,20"]` (was `["1,10","11,50"]`), `enterprise -> ["1001,2000","2001,5000","5001,10000","10001,"]` (was `["1001,5000","5001,10000","10001,"]`).

### Task 2 — Query Reformulator (research/route.ts)

Replaced the single vague sentence ("You are a search query reformulator...") with a structured Exa-specific system prompt containing:
- **7 rules:** always include full name, conditional company inclusion, colloquial-to-search-term translation, recency terms, specific nouns/verbs, under 15 words, no filler words
- **4 shot examples:** Tim Cook/Apple (deals), Jane Smith/Blackstone (property), John Doe/Citadel (net worth), Sarah Lee/Genentech (recent news)

max_tokens=100 and fallback to original query on error are preserved unchanged.

## Verification

- `pnpm build` completed without errors
- `grep -c "VALID_COMPANY_SIZES"` returns 2 (Set definition + filter usage)
- `grep "wordCount <= 1"` returns 1 match; `grep "wordCount <= 2"` returns 0
- `grep "tech founders in SF"` returns 1 match (few-shot example 1)
- `grep "managing directors at bulge"` returns 1 match (few-shot example 2)
- `grep "Exa web search query optimizer"` returns 1 match in research route
- `grep "under 15 words"` returns 1 match (rule 6)
- `grep "EXAMPLES:"` returns 1 match in research route
- `grep "Tim Cook Apple"` returns 1 match in research route
- Old prompt "You are a search query reformulator" is gone

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

No new threat surface introduced. VALID_COMPANY_SIZES validation closes the companySize gap identified in T-37-12.

## Self-Check: PASSED

Files confirmed present:
- src/app/api/search/parse-query/route.ts — FOUND
- src/app/api/prospects/[prospectId]/research/route.ts — FOUND

Commits confirmed:
- 1f1b409 — FOUND
- 3e4c4a1 — FOUND
