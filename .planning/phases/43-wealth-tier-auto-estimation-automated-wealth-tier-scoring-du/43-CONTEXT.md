# Phase 43: Wealth Tier Auto-Estimation - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Source:** Brainstorm + codebase scout

<domain>
## Phase Boundary

Automatically estimate a prospect's wealth tier during the enrichment pipeline by synthesizing existing signals (SEC Form 4 transactions, Exa wealth signals, market data snapshots, title/company inference) through a dedicated LLM step. Persist the estimate (auto_wealth_tier) alongside the existing manual_wealth_tier column, so the UI can auto-populate the "Set wealth tier..." field while preserving the manual override.

**In scope:**
- New Inngest step (`estimate-wealth-tier`) between `fetch-market-data` and `generate-summary` in `enrich-prospect.ts`
- Dedicated LLM call (OpenRouter, gpt-4o-mini) with scoring rubric → structured JSON output
- 4 new columns on `prospects` table: `auto_wealth_tier`, `auto_wealth_tier_confidence`, `auto_wealth_tier_reasoning`, `auto_wealth_tier_estimated_at`
- Source status tracking in `enrichment_source_status.wealth_tier`
- UI: auto-populate existing `InlineEditField` in `profile-header.tsx` when no manual override exists, show derivation source on hover
- Backfill support: POST `/api/prospects/{id}/enrich?force=true` re-runs wealth-tier step with forceRefreshKey

**Out of scope (deferred to future phases):**
- Fetching SEC DEF 14A proxy statements for hard compensation data
- Adding new Exa queries specifically for wealth discovery (e.g., "[name] net worth")
- Cross-prospect wealth percentile / relative ranking
- Wealth tier as a search filter in persona builder
- Bulk re-estimation UI for admins

</domain>

<decisions>
## Implementation Decisions

### Tier Taxonomy (D-01)
- **D-01:** Align with existing `manual_wealth_tier` enum in `src/components/prospect/profile-header.tsx:246-251`. 5 tiers:
  - `ultra_high` — $50M+ (UHNW / top targets)
  - `very_high` — $10-50M (VHNW)
  - `high` — $5-10M (HNW)
  - `emerging` — $1-5M (Affluent entry)
  - `unknown` — insufficient data to classify
- **Rationale:** The codebase already has this taxonomy wired into the UI. Introducing a different 4-tier model (from brainstorm) would fracture the data contract and require a UI migration. Locked to this 5-value enum.

### Column Naming (D-02)
- **D-02:** Use `auto_wealth_tier` prefix (NOT `wealth_tier`) to disambiguate from `manual_wealth_tier`. Four columns:
  - `auto_wealth_tier` text — one of the 5 enum values above
  - `auto_wealth_tier_confidence` text — `high` | `medium` | `low`
  - `auto_wealth_tier_reasoning` text — 1-sentence human-readable reasoning (for UI tooltip + debugging)
  - `auto_wealth_tier_estimated_at` timestamptz — last estimation timestamp
- **Rationale:** Clear separation of concerns. UI logic: show `manual_wealth_tier` if set, else fall back to `auto_wealth_tier`.

### Data Sources (D-03)
- **D-03:** Priority order for wealth signals fed to the LLM (no new API calls — all already collected during enrichment):
  1. SEC Form 4 cash transactions (aggregate value from `insider_data.transactions` filtered to `tx.totalValue > 0`) — hardest signal
  2. SEC Form 4 RSU/option grants (count + latest share price from `stock_snapshot`) — paper wealth estimate
  3. Exa signals categorized as `wealth_signal` or `funding` from `prospect_signals` table
  4. `stock_snapshot.marketCap` and ticker for public-company context
  5. Title + company (structural inference) — weakest signal, always available

### Implementation Approach (D-04)
- **D-04:** Dedicated Inngest step (`estimate-wealth-tier`) — NOT extending `generateIntelligenceDossier`.
- **Rationale:** Wealth tier is a core data field with its own retry/failure handling, not narrative text. Mixing with dossier prompt degrades both. One additional LLM call at ~$0.001 with gpt-4o-mini is acceptable.
- **Position in pipeline:** After `fetch-market-data` (step 4.5), BEFORE `generate-summary` (step 5). The AI summary and dossier can then reference the wealth tier if available.

### LLM Prompt Design (D-05)
- **D-05:** Scoring rubric with first-match-wins rule ordering. Output is strict JSON with no prose:
  ```json
  {
    "tier": "ultra_high" | "very_high" | "high" | "emerging" | "unknown",
    "confidence": "high" | "medium" | "low",
    "primary_signal": "sec_cash" | "sec_equity" | "web_signals" | "career_inference" | "insufficient",
    "reasoning": "<1 sentence, cite specific numbers from input>"
  }
  ```
- **Model:** `openai/gpt-4o-mini` via OpenRouter (consistent with existing dossier step).
- **Anti-hallucination rules:** NEVER invent dollar amounts not in the input. NEVER cite Forbes/Bloomberg list unless explicitly in the Exa signals. Use first matching rule, not the highest tier that could be justified.
- **Rubric (first match wins):**
  - SEC cash aggregate > $50M → `ultra_high`, confidence: `high`
  - SEC cash aggregate $10M-$50M → `very_high`, confidence: `high`
  - SEC cash aggregate $5M-$10M → `high`, confidence: `high`
  - SEC cash aggregate $1M-$5M → `emerging`, confidence: `high`
  - Public-co C-suite (CEO/CFO/CTO/COO/President) with RSU grants + market cap >$10B → `very_high`, confidence: `medium`
  - Public-co C-suite at market cap $1-10B → `high`, confidence: `medium`
  - Exa: Forbes/Bloomberg list explicit mention → `ultra_high`, confidence: `medium`
  - Exa: company exit/IPO explicit mention → `very_high`, confidence: `medium`
  - Partner at PE/VC/AM100 law firm (inferred from title + company) → `high`, confidence: `medium`
  - Senior exec (VP+/Director+) at large company → `emerging`, confidence: `low`
  - Default / thin data → `unknown`, confidence: `low`

### Source Status Tracking (D-06)
- **D-06:** Add `wealth_tier` to the initial `enrichment_source_status` object in `mark-in-progress` step. Status values follow existing convention:
  - `pending` — step not yet run
  - `complete` — tier estimated successfully
  - `no_data` — ran but landed on `unknown` tier
  - `failed` — LLM error or JSON parse failure
- **Rationale:** Consistent with existing `contactout`, `exa`, `sec`, `market`, `claude`, `dossier` source tracking. Surfaces the step in the `/admin/automations` dashboard.

### UI Integration (D-07)
- **D-07:** `profile-header.tsx` — in the Wealth Tier `InlineEditField`:
  - If `manual_wealth_tier` set → show that (current behavior preserved)
  - Else if `auto_wealth_tier` set → show it with a subtle "auto" indicator (e.g., lucide `Sparkles` icon) and `auto_wealth_tier_reasoning` in the `title` attribute for hover tooltip
  - Else → show "Set wealth tier..." placeholder (current behavior)
- **Rationale:** Non-invasive change — reuses existing `InlineEditField` component. Users see the auto-estimate but can still override.

### Backfill / Re-enrichment (D-08)
- **D-08:** Existing `/api/prospects/{id}/enrich?force=true` with `forceRefreshKey` nonce pattern (see Phase 26+ memory notes) re-runs the entire pipeline including the new wealth-tier step. No new backfill endpoint needed.
- **Rationale:** The existing forceRefresh pattern already handles step-0 duplicate guard correctly. Adding wealth-tier to the pipeline gets it for free.

### Claude's Discretion
- Exact prompt wording — planner/executor may iterate
- Whether to also batch-expose a `/api/prospects/{id}/wealth-tier/re-estimate` endpoint (for surgical re-runs without full re-enrichment) — nice-to-have, ok to defer
- Icon choice for the "auto" indicator in the UI
- Whether to add a dedicated activity-log event type (`wealth_tier_estimated`) — recommend yes for timeline visibility

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Enrichment Pipeline
- `src/inngest/functions/enrich-prospect.ts` — Main Inngest function; wealth-tier step inserts between `fetch-market-data` (step 4.5) and `generate-summary` (step 5). Follow the existing pattern: `step.run("name", async () => { ... })` wrapper, `updateSourceStatus` helper, fire-and-forget activity logging.
- `src/lib/enrichment/claude.ts` — `generateProspectSummary` and `generateIntelligenceDossier` — reference implementations for OpenRouter JSON-output prompts, fence-stripping, and graceful-failure patterns. Copy the same safety patterns.
- `src/lib/enrichment/market-data.ts` — `fetchMarketSnapshot` — reference for input types.

### UI Contract
- `src/components/prospect/profile-header.tsx:237-256` — the `InlineEditField` for Wealth Tier. Modify to read `auto_wealth_tier` fallback.
- `src/components/ui/wealth-tier-badge.tsx` — legacy badge component (different tier taxonomy: $500M+, $100M+, $50M+, $30M+). **DO NOT USE for new code.** This is pre-aligned-enum code and will be reconciled in a later polish pass.
- `src/lib/prospects/types.ts` — Prospect type; add 4 new fields.
- `src/types/database.ts` — DB row type; add 4 new fields.

### Types & API
- `src/app/api/prospects/[prospectId]/profile/route.ts` — PATCH handler for manual_wealth_tier updates. Auto fields are read-only (set by Inngest), so route does not need to accept them.
- `src/app/api/prospects/[prospectId]/route.ts` — GET handler; ensure the 4 new fields are returned.

### DB Migration
- `supabase/migrations/20260329_intelligence_dossier_signals.sql` — reference for migration pattern (add columns, no RLS migration since RLS is managed via Supabase dashboard).
- New migration file: `supabase/migrations/20260417_auto_wealth_tier.sql`

### Memory
- `CLAUDE.md` project memory (MEMORY.md index) — especially:
  - Inngest enrich-prospect step-0 duplicate guard + forceRefreshKey nonce pattern
  - prospect_signals unique index is on `(prospect_id, source_url) WHERE source_url IS NOT NULL`
  - APOLLO_MOCK_ENRICHMENT flag interaction (if applicable — wealth-tier can run on mocked enrichment data too)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`chatCompletion(systemPrompt, userMessage, maxTokens, model?)`** in `src/lib/ai/openrouter.ts` — exact helper to call gpt-4o-mini. Follow the same invocation pattern as `generateIntelligenceDossier`.
- **`updateSourceStatus(prospectId, source, payload)`** in `enrich-prospect.ts:16-29` — atomic JSONB merge helper, use directly for the new `wealth_tier` source.
- **`logProspectActivity(...)`** from `@/lib/activity` — fire-and-forget activity logger. Use `category: 'data', eventType: 'ai_summary_updated'` (existing) OR add new `wealth_tier_estimated` event type if activity-log CHECK constraint allows it (see Phase 34 fix).
- **`trackApiUsage("openrouter")`** in `src/lib/enrichment/track-api-usage.ts` — use to track token spend.
- **`InlineEditField`** — already used for the Wealth Tier field. Just extend its value resolution.
- **`resolveField(manual, original)` + `isOverridden(manual)`** in `profile-header.tsx` — helpers already handle manual/auto precedence; wire `auto_wealth_tier` as the `original` arg.

### Established Patterns
- **Dual-write** is NOT needed here. Wealth tier is a single scalar; no prospect_signals row needed.
- **JSONB source_status merge** via `merge_enrichment_source_status` RPC (atomic, no read-modify-write).
- **Fence-stripping on LLM JSON output** — `jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)` — required because gpt-4o-mini sometimes wraps in fences despite instruction.
- **Graceful degradation** — catch block marks source as `failed`, returns null/unknown, pipeline continues.
- **Admin client (`createAdminClient`)** — used throughout Inngest function for RLS-bypassing writes.

### Integration Points
- Migration: `supabase/migrations/20260417_auto_wealth_tier.sql` (new file).
- Enrichment step insertion: `src/inngest/functions/enrich-prospect.ts` — add step between lines ~640 (end of `fetch-market-data`) and ~643 (`generate-summary` start). Pass wealth-tier result to downstream `generate-summary` and `generate-dossier` calls so they can reference it.
- Type additions: `src/lib/prospects/types.ts` + `src/types/database.ts` (4 fields each).
- UI tweak: `src/components/prospect/profile-header.tsx:239-243` — add `originalValue={prospect.auto_wealth_tier}` + reasoning tooltip.
- API surface: `src/app/api/prospects/[prospectId]/route.ts` GET handler auto-includes all columns via `.select('*')` pattern — verify no explicit column whitelist.

</code_context>

<specifics>
## Specific Ideas

- The Maria Lisa screenshot ("mlisa@saxllp.com", partner at Sax LLP — tax/accounting law firm) is a good real test case:
  - No Apollo wealth data, not a public company, no SEC filings expected
  - Should land on `high` or `emerging` with `medium` or `low` confidence, `primary_signal: career_inference`
  - Reasoning should cite "partner at established accounting firm" or similar
- Prompt should explicitly note that partners at law/accounting firms without Form 4 data → `high` confidence `low` or `medium`.
- Activity-log event type: strongly recommend surfacing "Wealth tier estimated: very_high (high confidence)" in the prospect timeline for transparency. Check `activity_log` CHECK constraint (Phase 34 fix) before committing to a new event type.

</specifics>

<deferred>
## Deferred Ideas

- **SEC DEF 14A proxy statement integration** — would give exact compensation for named execs at public companies. Meaningful accuracy gain but requires new EDGAR API work + a new parser. Defer to a future enrichment-depth phase.
- **Dedicated Exa queries for wealth discovery** — searches like `"[name] net worth"` or `"[name] real estate"`. Adds Exa credit cost and risk of wrong-person matches. Defer until we see the accuracy ceiling of the current approach.
- **Wealth tier as a persona filter** — filter saved searches by estimated tier. Depends on this phase shipping first to have any data to filter on.
- **Cross-prospect percentile ranking** — "top 5% by wealth in this list" style insights. Requires aggregate queries; better as a separate analytics phase.
- **Admin UI for bulk re-estimation** — useful for backfilling the prompt rubric when it's tuned. Can be added later; for now, the existing force-refresh endpoint handles per-prospect re-runs.

### Reviewed Todos (not folded)
None — no pending todos matched this phase scope.

</deferred>

---

*Phase: 43-wealth-tier-auto-estimation*
*Context gathered: 2026-04-17 via brainstorm + codebase scout*
