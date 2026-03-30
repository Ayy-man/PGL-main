---
phase: 27-research-chat-ux-polish-streaming-indicators-exa-response-surfacing-chat-ui-templates
plan: 01
subsystem: api
tags: [exa, typescript, research, scrapbook, digest]

# Dependency graph
requires:
  - phase: 25-exa-research-scrapbook
    provides: ScrapbookCard type, searchExaForResearch function, digestForScrapbook function
  - phase: 26-targeted-multi-source-search-intent-routed-channels-sec-attom-news-proxycurl-faa-crunchbase
    provides: ExaSearchResult type, Exa API constants

provides:
  - Extended ExaSearchResult with author, image, favicon, highlights, highlightScores, summary fields
  - Enhanced Exa API request body fetching highlights (maxCharacters: 600) and LLM-generated summary
  - Extended ScrapbookCard with 5 optional Exa-sourced fields for UI consumption
  - Upgraded digest prompt using Exa summary > highlights > raw text fallback chain
  - source_favicon preferring Exa-provided favicon over computed domain favicon

affects:
  - plan 27-02 (UI will consume exa_highlights, exa_summary, exa_image, exa_author from ScrapbookCard)
  - plan 27-03 (streaming indicators build on this enriched data pipeline)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Exa content fields requested via maxCharacters (not deprecated numSentences)
    - Optional fields on persisted JSONB types for backward compatibility
    - Summary > highlights > text fallback pattern for LLM input quality

key-files:
  created: []
  modified:
    - src/types/research.ts
    - src/lib/research/exa-search.ts
    - src/lib/research/research-digest.ts

key-decisions:
  - "Used maxCharacters: 600 for highlights (not numSentences — deprecated Feb 2026)"
  - "All new ScrapbookCard fields are optional to avoid breaking persisted JSONB cards"
  - "No changes to route.ts — new fields flow through automatically since cards are typed as ScrapbookCard[]"
  - "source_favicon prefers Exa-provided favicon (higher quality) over computed domain favicon"

patterns-established:
  - "Exa richer content fields: request highlights + summary in same API call (zero extra latency)"
  - "Backward-compatible JSONB extension: add optional fields only, no migration needed"
  - "Digest input quality: LLM-processed Exa summary > extracted highlights > raw text slice"

requirements-completed: [RCH-01, RCH-02, RCH-03]

# Metrics
duration: 8min
completed: 2026-03-29
---

# Phase 27 Plan 01: Exa Richer Data Pipeline Summary

**Exa API upgraded to request highlights + LLM summary per result, with types extended for backward-compatible ScrapbookCard enrichment and digest prompt using higher-signal Exa output**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-29T00:00:00Z
- **Completed:** 2026-03-29T00:08:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- ExaSearchResult extended with 6 optional fields: author, image, favicon, highlights, highlightScores, summary
- Exa API fetch body updated to request `highlights: { maxCharacters: 600 }` and `summary: { query: "Key facts about this person..." }` alongside existing text — zero added latency
- ScrapbookCard extended with 5 optional Exa-sourced fields (exa_highlights, exa_highlight_scores, exa_summary, exa_author, exa_image) — all optional so persisted JSONB cards in research_messages do not break
- Digest prompt userMessage uses r.summary when present, falls back to r.highlights[0], then r.text slice — higher-signal input for the LLM
- source_favicon now prefers Exa-provided favicon over the computed `https://${domain}/favicon.ico` fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend type contracts + enhance Exa API request** - `e9afebb` (feat)
2. **Task 2: Upgrade digest prompt + wire Exa fields through route to ScrapbookCard** - `5aebbf8` (feat)

## Files Created/Modified

- `src/types/research.ts` - Added 5 optional Exa fields to ScrapbookCard interface
- `src/lib/research/exa-search.ts` - Extended ExaSearchResult type + updated Exa fetch body with highlights/summary
- `src/lib/research/research-digest.ts` - Upgraded digest userMessage construction + wired Exa fields to ScrapbookCard mapping + favicon preference

## Decisions Made

- Used `maxCharacters: 600` for highlights (plan specified this explicitly — `numSentences` was deprecated Feb 2026)
- No changes to route.ts — ExaSearchResult fields flow through automatically to ScrapbookCard without any route modification
- All new ScrapbookCard fields are optional (`?`) — old persisted cards in research_messages JSONB column will not have them and must not break

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `src/lib/search/__tests__/execute-research.test.ts` (mock.calls tuple typing). These errors existed before this plan and were not introduced by these changes — confirmed via git stash test.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 27-02 can now consume exa_highlights, exa_summary, exa_image, and exa_author from ScrapbookCard for richer UI rendering
- Plan 27-03 streaming indicator improvements can build on the enriched data pipeline
- No blockers

---
*Phase: 27-research-chat-ux-polish-streaming-indicators-exa-response-surfacing-chat-ui-templates*
*Completed: 2026-03-29*
