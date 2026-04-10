---
phase: 37-llm-prompt-overhaul-fix-hallucination-model-selection-weak-p
plan: "05"
subsystem: research
tags: [research, scrapbook, llm, relevance-filtering, intent-classifier]
dependency_graph:
  requires: [37-01]
  provides: [relevance-filtered-scrapbook-digest, no-direct-results-ui-signal, simplified-intent-classifier]
  affects: [research-panel, research-route, scrapbook-digest, intent-classifier]
tech_stack:
  added: []
  patterns: [post-processing-filter, streaming-quality-signal, prompt-simplification]
key_files:
  created: []
  modified:
    - src/lib/research/research-digest.ts
    - src/app/api/prospects/[prospectId]/research/route.ts
    - src/components/prospect/research-panel.tsx
    - src/lib/search/intent-classifier.ts
decisions:
  - "Return type of digestForScrapbook changed to object { cards, hasDirectResults } to carry quality signal alongside cards"
  - "entityType hardcoded to 'general' in all paths rather than parsed from LLM output — only flows to telemetry counters, no behavioral branching"
  - "no_direct_results stream event piggybacks on existing data-reasoning type to avoid new event type"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-10T22:15:42Z"
  tasks_completed: 2
  files_modified: 4
---

# Phase 37 Plan 05: Relevance Filtering, hasDirectResults, and Intent Classifier Cleanup Summary

Scrapbook digest now filters background results when direct results exist, returns a hasDirectResults flag, uses 6000 max tokens, and surfaces a no-direct-results amber banner in the research panel UI. Intent classifier prompt simplified by removing entityType rules, saving tokens while keeping the type non-optional.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add relevance filtering, hasDirectResults flag, increase max tokens, surface no_direct_results in UI | 651f289 | research-digest.ts, route.ts, research-panel.tsx |
| 2 | Clean up intent classifier entityType from prompt only, keep type non-optional | 17fffce | intent-classifier.ts |

## What Was Built

**Task 1 (D-06) — Scrapbook digest relevance filtering and UI signal:**

- `digestForScrapbook` return type changed from `Promise<ScrapbookCard[]>` to `Promise<{ cards: ScrapbookCard[]; hasDirectResults: boolean }>`
- System prompt updated with STRICT answer_relevance definitions distinguishing direct/tangential/background by example
- Post-processing filter: when `directCards.length > 0`, background cards are dropped from the result set — reduces noise without losing tangential context
- Max tokens increased from 4000 to 6000 to handle larger result sets
- Early returns (`!results`, `!Array.isArray(parsed)`, catch block) all updated to return the new object shape
- `route.ts` destructures `{ cards, hasDirectResults }` and emits a `data-reasoning` event with `status: "no_direct_results"` when applicable
- `has_direct_results` added to assistant message metadata in DB
- `research-panel.tsx` adds `noDirectResultsMsg` state, resets it on each new search, handles the `no_direct_results` status in the data-reasoning handler, and renders an amber-tinted banner above the card list

**Task 2 (D-10) — Intent classifier prompt cleanup:**

- Removed "Entity type rules" block from `CLASSIFY_SYSTEM_PROMPT` (6 lines, saves prompt tokens)
- Removed `"entityType": "person"` from the JSON example
- Replaced 5-line entityType validation block with single `entityType: "general" as const`
- `IntentClassification.entityType` stays NON-optional — `ResearchTelemetryEvent.entityType` typed as `IntentClassification["entityType"]` requires a concrete string
- Fallback path already had `entityType: "general"` — unchanged

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing return type update on early-return guard**
- **Found during:** Build verification after Task 1
- **Issue:** `if (!Array.isArray(parsed)) return [];` still returned `never[]` after function signature changed to `Promise<{ cards: ScrapbookCard[]; hasDirectResults: boolean }>`
- **Fix:** Changed to `return { cards: [], hasDirectResults: false };`
- **Files modified:** src/lib/research/research-digest.ts
- **Commit:** 651f289 (included in Task 1 commit)

## Known Stubs

None. All data flows are wired. The `noDirectResultsMsg` state is populated from a real server-side signal, not hardcoded.

## Threat Flags

No new network endpoints, auth paths, or schema changes introduced beyond what the plan's threat model covers. The `no_direct_results` message is hardcoded server-side and rendered as a text node (no dangerouslySetInnerHTML). `answer_relevance` values are validated against a known Set before the filter runs.

## Self-Check: PASSED

- `src/lib/research/research-digest.ts` — exists, contains `hasDirectResults` (6 matches), `6000` (1 match), `Directly answers the user` (1 match)
- `src/app/api/prospects/[prospectId]/research/route.ts` — exists, contains `hasDirectResults` (3 matches), `no_direct_results` (1 match)
- `src/components/prospect/research-panel.tsx` — exists, contains `noDirectResultsMsg` (3 matches), `no_direct_results` (1 match)
- `src/lib/search/intent-classifier.ts` — exists, `Entity type rules` (0 matches), `entityType:` (3 matches), `"general"` (3 matches)
- Commit 651f289 — confirmed in git log
- Commit 17fffce — confirmed in git log
- `pnpm build` — PASSED (no type errors, only pre-existing img warnings)
