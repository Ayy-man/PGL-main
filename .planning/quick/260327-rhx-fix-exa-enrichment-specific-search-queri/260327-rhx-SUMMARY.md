---
phase: quick
plan: 260327-rhx
subsystem: enrichment
tags: [exa, enrichment, llm-digest, wealth-signals, ui]
dependency_graph:
  requires: []
  provides: [digested-exa-signals, specific-exa-search, wealth-signals-ui-v2]
  affects: [enrich-prospect-inngest, profile-view, wealth-signals]
tech_stack:
  added: [exa-digest.ts (new module)]
  patterns: [LLM batch digest, post-filter relevance, category icon mapping]
key_files:
  created:
    - src/lib/enrichment/exa-digest.ts
  modified:
    - src/lib/enrichment/exa.ts
    - src/inngest/functions/enrich-prospect.ts
    - src/components/prospect/wealth-signals.tsx
    - src/components/prospect/profile-view.tsx
decisions:
  - "Exact-match quoted query (name + company only) replaces role-keyword-biased query"
  - "Post-filter on result text ensures only on-person results pass through"
  - "Single LLM batch call to Claude Haiku for all mentions (1500 token budget)"
  - "JSON fence stripping handles LLM responses wrapped in markdown code blocks"
  - "DigestedSignal.raw_text kept server-side for debugging, never rendered in UI"
  - "Failed digest returns empty array (graceful degradation), never blocks enrichment"
metrics:
  duration: "~8 minutes"
  completed: "2026-03-27"
  tasks_completed: 2
  files_changed: 5
---

# Quick Task 260327-rhx: Fix Exa Enrichment — Specific Search Queries + LLM Digest

**One-liner:** Exact-match Exa search with post-filter + Claude Haiku LLM digest produces categorized DigestedSignal[] rendered with per-category icons in WealthSignals UI.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix Exa search query, create digest module, update Inngest wiring | 98af662 | exa.ts, exa-digest.ts (new), enrich-prospect.ts |
| 2 | Update Wealth Signals UI and ProfileView interface for digested signals | e5b11dc | wealth-signals.tsx, profile-view.tsx |

## What Was Built

### Task 1: Exa Search + Digest Module

**`src/lib/enrichment/exa.ts` changes:**
- Query changed from `"name" "company" executive OR founder OR investor` to `"name" "company"` — exact quoted matching only, no role keyword bias
- numResults increased from 5 to 10 to give more candidates before post-filtering
- Post-filter added: discards any result where neither the prospect's name nor company appears in the title or text — prevents wrong-person results from reaching the digest step

**`src/lib/enrichment/exa-digest.ts` (new):**
- Exports `SignalCategory` union type and `DigestedSignal` interface
- `digestExaResults(personName, companyName, mentions)` sends all mentions in a single batch to Claude Haiku via OpenRouter
- LLM determines relevance, categorizes each result (career_move | funding | media | wealth_signal | company_intel | recognition), generates a sub-10-word headline and 1-2 sentence plain-text summary
- JSON fence stripping handles markdown-wrapped responses
- Irrelevant items filtered out before returning
- All errors caught and logged — returns `[]` on any failure (never blocks enrichment pipeline)

**`src/inngest/functions/enrich-prospect.ts` changes:**
- Added `digestExaResults` import
- `fetch-exa` step now calls `digestExaResults` after `enrichExa` if results are found
- Stores `{ signals: DigestedSignal[], source, enriched_at }` in `web_data` (no more raw `mentions`/`wealth_signals`)
- `generate-summary` step maps digested signals to summary-friendly format: headlines as mention titles, wealth_signal + funding categories as wealth signals

### Task 2: UI Components

**`src/components/prospect/profile-view.tsx` changes:**
- `Prospect.web_data` type updated from `{ mentions, wealth_signals }` to `{ signals: DigestedSignal[] }` shape

**`src/components/prospect/wealth-signals.tsx` rewrite:**
- Removed `ExaMention`, `ExaResult` interfaces and all `webData.mentions` / `webData.wealth_signals` references
- New `DigestedSignal` interface inline with category union type
- `getCategoryIcon()` maps category to lucide icon: Briefcase, DollarSign, Mic2, Gem, Building2, Trophy
- `getCategoryLabel()` maps category to human-readable string
- Each signal card: category icon + gold pill badge (category label), bold serif headline, muted summary text, gold "View Source" link
- Last card spans full width when signal count is odd (same as old mention cards)
- `raw_text` never rendered anywhere in UI
- SEC Filings table section unchanged

## Verification

- `npx tsc --noEmit`: PASSED (zero errors)
- `pnpm build`: PASSED (exit 0)
- exa-digest.ts exports `DigestedSignal` type and `digestExaResults` function: CONFIRMED
- exa.ts query uses exact quoted name+company (no role keywords): CONFIRMED
- exa.ts has post-filter checking name OR company in result text: CONFIRMED
- enrich-prospect.ts calls `digestExaResults` and stores `{ signals, source, enriched_at }` in web_data: CONFIRMED
- wealth-signals.tsx renders category icons, headlines, summaries — never raw_text: CONFIRMED

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are wired. WealthSignals renders from real `prospect.web_data.signals` coming from the enrichment pipeline.

## Self-Check: PASSED

- `src/lib/enrichment/exa-digest.ts` — FOUND
- `src/lib/enrichment/exa.ts` — modified, FOUND
- `src/inngest/functions/enrich-prospect.ts` — modified, FOUND
- `src/components/prospect/wealth-signals.tsx` — modified, FOUND
- `src/components/prospect/profile-view.tsx` — modified, FOUND
- Commit 98af662 — FOUND
- Commit e5b11dc — FOUND
