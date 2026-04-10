---
phase: 37-llm-prompt-overhaul-fix-hallucination-model-selection-weak-p
verified: 2026-04-10T22:19:06Z
status: passed
score: 18/18 must-haves verified
overrides_applied: 0
---

# Phase 37: LLM Prompt Overhaul Verification Report

**Phase Goal:** Fix systemic hallucination, weak prompting, and model selection issues across all 10 LLM prompt layers. After this phase, all prompts use GPT-4o-mini with stronger anti-hallucination guardrails, better category definitions, few-shot examples, and relevance filtering.
**Verified:** 2026-04-10T22:19:06Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Requirements Coverage

The D-XX requirement IDs (D-01 through D-10) are not in REQUIREMENTS.md (which only covers v1 product requirements). They are internal phase-scoped decision IDs defined in `37-CONTEXT.md` and referenced in the ROADMAP. This is an intentional pattern for improvement phases; all 10 are accounted for across the 5 plans.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| D-01 | 37-01 | Default model swap to GPT-4o-mini, 25s timeout | SATISFIED | `DEFAULT_MODEL = "openai/gpt-4o-mini"`, `AbortSignal.timeout(25_000)` in openrouter.ts |
| D-02 | 37-03 | Anti-hallucination rules for prospect summary | SATISFIED | 6 CRITICAL RULES in SYSTEM_PROMPT, `NEVER fabricate`, `vague wealth phrases` in claude.ts |
| D-03 | 37-02 | Category definitions + negative_signal in Exa digest | SATISFIED | 7 defined categories with descriptions, negative_signal in type + prompt + UI |
| D-04 | 37-03 | Remove ai_summary from lookalike input, add enum constraints | SATISFIED | `AI Summary:` injection removed; explicit seniority + companySize enums in prompt and Zod schema |
| D-05 | 37-04 | Rewrite query reformulator with Exa-specific rules | SATISFIED | `Exa web search query optimizer`, 7 rules, 4 examples, `under 15 words` in research/route.ts |
| D-06 | 37-05 | Scrapbook digest relevance filtering + hasDirectResults | SATISFIED | Post-processing filter, `{ cards, hasDirectResults }` return type, max tokens 6000 |
| D-07 | 37-04 | NLP parser few-shot examples + companySize validation | SATISFIED | 4 examples, `VALID_COMPANY_SIZES` Set, `wordCount <= 1` short-circuit |
| D-08 | 37-03 | Tighten dossier output ranges, relax validation | SATISFIED | `1-5 specific`, `2-6 objects` in prompt; `outreach_hooks.length < 1 \|\| quick_facts.length < 2` validation |
| D-09 | 37-01 | SEC resolver individual-company evaluation | SATISFIED | `Evaluate each company individually...` replaces industry-blanket rule in edgar.ts |
| D-10 | 37-05 | Intent classifier entityType removed from prompt, type non-optional | SATISFIED | `Entity type rules` absent from prompt; `entityType: "general" as const` in both parse paths |

---

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All 10 LLM prompts use GPT-4o-mini as default model | VERIFIED | `DEFAULT_MODEL = "openai/gpt-4o-mini"` in openrouter.ts; 0 references to `anthropic/claude-3.5-haiku` remain in src/ |
| 2 | LLM requests have 25s timeout instead of 15s | VERIFIED | `AbortSignal.timeout(25_000)` in openrouter.ts; old 15_000 gone |
| 3 | SEC resolver uses individual-company evaluation instead of industry-blanket rule | VERIFIED | Rule 5 reads `Evaluate each company individually...`; `Startups, biotech` text absent |
| 4 | Exa digest prompt includes 7 defined categories with explicit definitions | VERIFIED | Lines 72-78 of exa-digest.ts; wealth_signal definition and Lawsuits/regulatory definition both present |
| 5 | negative_signal is a recognized category in the type system | VERIFIED | In both exa-digest.ts (local subset type) and database.ts (full SignalCategory union) |
| 6 | Signal Timeline UI shows red/orange styling for negative_signal entries | VERIFIED | `AlertTriangle` import + case, `"Negative Signal"` label, `#ef4444` color, entry in ALL_CATEGORIES |
| 7 | negative_signal does NOT flow into summary wealthSignals filter | VERIFIED | enrich-prospect.ts line 646 filters on `wealth_signal \|\| funding` only; negative_signal excluded |
| 8 | Prospect summary uses anti-hallucination system prompt with 6 CRITICAL RULES | VERIFIED | Rules 1-6 present in SYSTEM_PROMPT: NEVER fabricate, thin data acknowledgment, no wealth from title, specific data points, note gaps, no vague phrases |
| 9 | Summary early return message clarifies which data sources are missing | VERIFIED | Returns `"Limited enrichment data -- web presence and SEC filing data not yet available..."` |
| 10 | Lookalike prompt does NOT include ai_summary in user message | VERIFIED | `AI Summary:` injection line removed; `ai_summary` field retained in ProspectData interface |
| 11 | Lookalike system prompt includes explicit seniority and companySize enums | VERIFIED | Exact Apollo enum values in both CRITICAL RULES section and JSON example; Zod schema updated with `training` and 11-bucket companySize |
| 12 | Dossier outreach_hooks minimum is 1, quick_facts minimum is 2 | VERIFIED | Prompt says `1-5 specific` and `2-6 objects`; validation rejects `< 1` or `< 2` |
| 13 | NLP parser system prompt includes 4 few-shot examples | VERIFIED | All 4 examples present: tech founders in SF, managing directors at bulge bracket, C-suite biotech, VP of sales SaaS |
| 14 | NLP parser validates companySize against a VALID_COMPANY_SIZES Set | VERIFIED | `VALID_COMPANY_SIZES` Set defined with 11 buckets; `filters.companySize.filter(s => VALID_COMPANY_SIZES.has(s))` applied post-LLM |
| 15 | NLP parser short-circuits only on 1 word, not 1-2 words | VERIFIED | `wordCount <= 1`; old `wordCount <= 2` absent |
| 16 | Query reformulator system prompt has 7 rules and 4 examples | VERIFIED | `Exa web search query optimizer`, 7 numbered rules including `under 15 words`, EXAMPLES with Tim Cook/Apple, Jane Smith/Blackstone, John Doe/Citadel, Sarah Lee/Genentech |
| 17 | Scrapbook digest returns hasDirectResults boolean alongside cards, filters background when direct results exist, uses 6000 max tokens | VERIFIED | Return type `Promise<{ cards: ScrapbookCard[]; hasDirectResults: boolean }>`, post-processing filter present, `chatCompletion(..., 6000)` |
| 18 | Intent classifier entityType removed from LLM prompt but type stays non-optional with general default | VERIFIED | `Entity type rules` absent from prompt; `entityType: "general" as const` in both parse path and fallback; type definition has no `?` |

**Score:** 18/18 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/ai/openrouter.ts` | GPT-4o-mini default + 25s timeout | VERIFIED | DEFAULT_MODEL and timeout both correct |
| `src/lib/enrichment/edgar.ts` | Individual-company SEC resolver | VERIFIED | Rule 5 replaced; old blanket rule absent |
| `src/lib/enrichment/exa-digest.ts` | 7 categories with definitions + negative_signal | VERIFIED | All 7 categories with explicit descriptions; negative_signal in local type |
| `src/types/database.ts` | SignalCategory with negative_signal | VERIFIED | negative_signal present in full union type |
| `src/components/prospect/signal-timeline.tsx` | negative_signal color/icon/label/array | VERIFIED | 5 additions: AlertTriangle import, icon case, label case, color case, ALL_CATEGORIES entry |
| `src/lib/enrichment/claude.ts` | Anti-hallucination SYSTEM_PROMPT + dossier ranges | VERIFIED | 6 CRITICAL RULES present; 1-5 hooks, 2-6 facts ranges; length validation added |
| `src/lib/enrichment/lookalike.ts` | ai_summary removed + explicit enums | VERIFIED | AI Summary injection removed; enum constraints in prompt and Zod schema |
| `src/app/api/search/parse-query/route.ts` | 4 few-shot examples + VALID_COMPANY_SIZES + wordCount <= 1 | VERIFIED | All three changes confirmed |
| `src/app/api/prospects/[prospectId]/research/route.ts` | Exa-specific reformulator + hasDirectResults consumer | VERIFIED | New 7-rule prompt present; destructures `{ cards, hasDirectResults }` and streams no_direct_results |
| `src/lib/research/research-digest.ts` | Relevance filtering + hasDirectResults + 6000 tokens | VERIFIED | Post-processing filter, new return type, 6000 tokens |
| `src/lib/search/intent-classifier.ts` | entityType removed from prompt, non-optional type, general default | VERIFIED | Prompt cleaned; type non-optional; both parse paths default to "general" |
| `src/components/prospect/research-panel.tsx` | no_direct_results handler + amber banner | VERIFIED | State, reset, handler, render all present (5 occurrences) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `openrouter.ts` DEFAULT_MODEL | All 9 callers | `openai/gpt-4o-mini` constant | VERIFIED | 0 callers pass an override except dossier which uses explicit DOSSIER_MODEL; all others inherit default |
| `exa-digest.ts` negative_signal | `database.ts` SignalCategory | Type union | VERIFIED | Both files contain negative_signal in SignalCategory |
| `signal-timeline.tsx` | `database.ts` SignalCategory | Import | VERIFIED | negative_signal in ALL_CATEGORIES array and all 3 switch cases |
| `research-digest.ts` hasDirectResults | `research/route.ts` | Destructured return value | VERIFIED | `const { cards, hasDirectResults } = await digestForScrapbook(...)` |
| `research/route.ts` no_direct_results | `research-panel.tsx` | data-reasoning stream event | VERIFIED | Server emits status: "no_direct_results"; client handles in data-reasoning branch |
| `enrich-prospect.ts` wealthSignals filter | negative_signal exclusion | Category filter `wealth_signal \|\| funding` | VERIFIED | negative_signal never matches wealth_signal or funding; correctly excluded |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `research-panel.tsx` noDirectResultsMsg | `noDirectResultsMsg` state | Server stream event from route.ts (which reads hasDirectResults from research-digest.ts) | Yes — flag computed from real card data | FLOWING |
| `signal-timeline.tsx` negative_signal rendering | `signal.category` prop | prospect_signals DB rows (written by exa-digest enrichment) | Yes — category comes from LLM output, stored in DB | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — changes are prompt text and TypeScript logic modifications only. No new runnable endpoints introduced. Behavioral correctness depends on LLM inference (requires human or integration testing).

---

## Anti-Patterns Found

None. Scan of all 11 modified files produced zero matches for TODO, FIXME, PLACEHOLDER, "coming soon", or "not yet implemented". No empty handlers, no placeholder returns, no hardcoded empty data arrays flowing to renders.

---

## Human Verification Required

None. All automated checks passed. The following items are LLM-quality concerns that cannot be verified programmatically but are not blockers — the code is correctly wired:

1. **LLM output quality improvement** — Whether GPT-4o-mini actually produces fewer hallucinations and better-structured JSON than Claude 3.5 Haiku in production requires live enrichment runs. The prompts are correctly updated; quality improvement is observable only through runtime behavior.

2. **negative_signal categorization accuracy** — Whether the Exa LLM correctly applies the new `negative_signal` category definition (vs. miscategorizing) requires live Exa enrichment runs with prospects who have regulatory/legal news.

3. **Amber banner UX** — Whether the `noDirectResultsMsg` amber banner appears in the research panel when no direct results are returned requires a live research query against a prospect where Exa returns only background articles.

These are quality-of-experience checks, not correctness gaps. All wiring is verified.

---

## Gaps Summary

No gaps. All 18 must-haves verified. All 10 D-XX requirements satisfied. All key links wired. No anti-patterns. Phase goal achieved.

---

_Verified: 2026-04-10T22:19:06Z_
_Verifier: Claude (gsd-verifier)_
