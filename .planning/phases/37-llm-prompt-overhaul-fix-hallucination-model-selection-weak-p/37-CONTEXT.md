# Phase 37: LLM Prompt Overhaul — Context

**Gathered:** 2026-04-11
**Status:** Ready for planning
**Source:** User-provided implementation spec (10 ordered changes)

<domain>
## Phase Boundary

Fix systemic hallucination, weak prompting, and model selection issues across all 10 LLM prompt layers in the PGL platform. Every LLM call routes through `src/lib/ai/openrouter.ts` → `chatCompletion()`. Two models currently in use: Claude 3.5 Haiku (8/10 prompts) and GPT-4o-mini (2/10). After this phase, all 10 prompts use GPT-4o-mini with stronger anti-hallucination guardrails, better category definitions, few-shot examples, and relevance filtering.

Files touched: `src/lib/ai/openrouter.ts`, `src/lib/enrichment/claude.ts`, `src/lib/enrichment/exa-digest.ts`, `src/lib/enrichment/lookalike.ts`, `src/lib/enrichment/edgar.ts`, `src/lib/search/intent-classifier.ts`, `src/lib/research/research-digest.ts`, `src/app/api/search/parse-query/route.ts`, `src/app/api/prospects/[prospectId]/research/route.ts`, `src/types/database.ts`, `src/components/prospect/signal-timeline.tsx`

</domain>

<decisions>
## Implementation Decisions

### D-01: Default Model Swap
- Change default model in `chatCompletion()` from `anthropic/claude-3.5-haiku` to `openai/gpt-4o-mini`
- Increase timeout from 15s to 25s for heavier model
- After this change, every LLM call uses GPT-4o-mini. No prompt on Haiku.

### D-02: Anti-Hallucination Rules for Prospect Summary (#2)
- Replace system prompt in `generateProspectSummary()` with wealth intelligence analyst prompt with 6 CRITICAL RULES
- Rules: never fabricate data, say honestly when data is thin, don't assume wealth from title alone, reference specific data points only, note when enrichment needed, no vague wealth phrases without data
- Fix sparse input threshold: trigger early return only when BOTH webData AND insiderData are missing/empty. If only one source missing, generate summary but note the gap.

### D-03: Category Definitions and Negative Signals for Exa Digest (#6)
- Replace category instruction with defined categories: career_move, funding, wealth_signal, company_intel, media, recognition, negative_signal (NEW)
- Each category has explicit definition (e.g., wealth_signal = "Direct evidence of personal wealth — stock sales, option exercises, property purchases...")
- negative_signal covers: lawsuits, regulatory actions, controversies, bankruptcies, divorces, investigations, terminations, sanctions
- Update `SignalCategory` TypeScript type to include `"negative_signal"`
- Update Signal Timeline UI: red/orange color for negative_signal category
- Do NOT feed negative_signal into summary's wealthSignals filter (leave category filter as wealth_signal || funding)

### D-04: Remove AI Summary from Lookalike Input (#9)
- Remove `ai_summary` from user message in `generateLookalikePersona()` to break hallucination amplification chain
- Keep `ai_summary` in `ProspectData` type — just stop including it in LLM prompt
- Add explicit seniority enum to system prompt: owner, founder, c_suite, partner, vp, director, manager, senior, entry, intern, training
- Add explicit company size ranges to system prompt: "1,10", "11,20", "21,50", "51,100", "101,200", "201,500", "501,1000", "1001,2000", "2001,5000", "5001,10000", "10001,"

### D-05: Rewrite Query Reformulator (#10)
- Replace single-sentence system prompt with full rewrite: Exa-specific optimizer with 7 rules and 4 examples
- Rules: include full name, company only if relevant, translate colloquial language, time-relevant terms, specific nouns/verbs, under 15 words, no filler
- Examples cover deal flow, property, net worth, recent news queries

### D-06: Scrapbook Digest Relevance Filtering (#7)
- Strengthen system prompt with strict answer_relevance definitions (direct/tangential/background)
- Add post-processing: if direct results exist, filter out background; if only background, flag for UI
- Return `hasDirectResults` boolean alongside cards for UI messaging
- Increase max tokens from 4000 to 6000

### D-07: NLP Parser Few-Shot Examples (#4)
- Add 4 few-shot examples to system prompt (tech founders, managing directors, C-suite biotech, VP sales SaaS)
- Add companySize validation with VALID_COMPANY_SIZES Set, matching seniority/industry validation pattern
- Change short-circuit threshold from "1-2 words" to "1 word only" — two-word queries should go through LLM

### D-08: Tighten Dossier Output Ranges (#3)
- Change outreach_hooks from "3-5" to "1-5" with instruction to only include data-grounded hooks
- Change quick_facts from "4-6" to "2-6" with instruction to only include stated/derivable facts
- Update validation: accept outreach_hooks >= 1 and quick_facts >= 2

### D-09: SEC Resolver Heuristic Cleanup (#8)
- Replace industry-blanket rule ("Startups, biotech without IPOs...") with individual-company evaluation instruction
- Keep all other anti-hallucination rules and two-stage post-verification unchanged

### D-10: Intent Classifier entityType Cleanup (#5)
- Investigate whether `entityType` is consumed downstream (branches on value, affects behavior)
- If NOT consumed: remove from prompt, keep in type as optional, default to "general"
- If consumed: leave as-is

### Claude's Discretion
- Exact wording of TypeScript type updates for negative_signal
- Signal Timeline UI icon choice and exact color hex for negative_signal
- How to surface `hasDirectResults` flag in research panel UI (toast, banner, or inline text)
- Whether intent classifier entityType investigation reveals usage (determines action)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### LLM Gateway
- `src/lib/ai/openrouter.ts` — Central chatCompletion() function, model default, timeout

### Enrichment Prompts
- `src/lib/enrichment/claude.ts` — Prospect summary (#2) + Intelligence dossier (#3)
- `src/lib/enrichment/exa-digest.ts` — Exa signal digest (#6)
- `src/lib/enrichment/lookalike.ts` — Lookalike persona generation (#9)
- `src/lib/enrichment/edgar.ts` — SEC company resolver (#8)

### Search/Research Prompts
- `src/lib/search/intent-classifier.ts` — Intent classification (#5)
- `src/lib/research/research-digest.ts` — Scrapbook digest (#7)
- `src/app/api/search/parse-query/route.ts` — NLP query parser (#4)
- `src/app/api/prospects/[prospectId]/research/route.ts` — Query reformulator (#10)

### Types and UI
- `src/types/database.ts` — SignalCategory type, ProspectSignal interface
- `src/components/prospect/signal-timeline.tsx` — Signal Timeline UI component
- `src/lib/search/execute-research.ts` — executeResearch() consumer of classifyIntent()

### Audit Reference
- `docs/llm-prompt-layers.md` — Complete audit of all 10 LLM prompt layers with data flow

</canonical_refs>

<specifics>
## Specific Ideas

### Order of Operations (minimizes breakage)
1. Change 1 (model swap) — affects everything, do first
2. Change 9 (SEC resolver heuristic) — tiny, isolated
3. Change 3 (Exa digest categories) — needs type updates that propagate
4. Change 2 (summary anti-hallucination) — depends on #6 categories being settled
5. Change 4 (lookalike input cleanup) — depends on understanding new category list
6. Change 8 (dossier output ranges) — isolated
7. Change 7 (NLP parser examples + validation) — isolated
8. Change 5 (query reformulator rewrite) — isolated
9. Change 6 (scrapbook relevance filtering) — most complex, do last
10. Change 10 (intent classifier cleanup) — investigation task, do whenever

### Exact System Prompt Texts
User provided verbatim replacement prompts for changes 2, 3, 4, 5, 6, 7, 9. These are locked — use exactly as specified.

</specifics>

<deferred>
## Deferred Ideas

None — all 10 changes are in scope for this phase.

</deferred>

---

*Phase: 37-llm-prompt-overhaul-fix-hallucination-model-selection-weak-p*
*Context gathered: 2026-04-11 via user-provided implementation spec*
