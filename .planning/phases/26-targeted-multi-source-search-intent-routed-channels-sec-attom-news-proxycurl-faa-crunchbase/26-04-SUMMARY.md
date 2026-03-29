---
phase: 26-targeted-multi-source-search
plan: 04
subsystem: api
tags: [search, multi-source, orchestration, dedup, ranking, typescript]

# Dependency graph
requires:
  - phase: 26-01
    provides: channel types (ChannelId, ChannelResult, ChannelOutput, CHANNEL_REGISTRY)
  - phase: 26-02
    provides: individual channel adapter implementations (exa, edgar-efts, gnews, opencorporates, crunchbase, attom)
  - phase: 26-03
    provides: classifyIntent LLM-based intent classifier

provides:
  - executeResearch orchestrator function that runs full classify->fan-out->merge pipeline
  - mergeAndRank dedup+ranking utility for flat ChannelResult arrays
  - register-all.ts side-effect barrel that wires all 6 channels on import
  - ResearchResult type used by the API route layer

affects: [26-05, api-route, research-ui, profile-view]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Parallel Exa + classifyIntent fan-out for latency reduction (start Exa before classifier returns)"
    - "Promise.allSettled for fault-isolated parallel channel execution"
    - "Side-effect barrel import (register-all.ts) to populate CHANNEL_REGISTRY without knowing individual channel files"
    - "Heuristic merge/dedup: normalize URL as dedup key, sort by relevance -> channel priority -> recency"

key-files:
  created:
    - src/lib/search/merge-results.ts
    - src/lib/search/execute-research.ts
    - src/lib/search/channels/register-all.ts
  modified: []

key-decisions:
  - "Exa fires in parallel with classifyIntent — total latency = max(classifier, exa) not sum"
  - "Promise.allSettled (not Promise.all) so a single failing channel doesn't drop all results"
  - "Heuristic ranking over LLM re-rank for MVP (per RESEARCH.md Open Question 4)"
  - "URL normalization as dedup key: lowercase, strip query params/fragment, strip trailing slash"
  - "register-all.ts side-effect barrel keeps orchestrator decoupled from individual channel files"

patterns-established:
  - "Orchestrator imports register-all.ts first (side-effect) to guarantee CHANNEL_REGISTRY is populated"
  - "channelStatuses included in ResearchResult for UI badge/status rendering"
  - "Rejected promises in allSettled produce synthetic ChannelOutput with error — never thrown"

requirements-completed: [MSS-10, MSS-11, MSS-12]

# Metrics
duration: 8min
completed: 2026-03-29
---

# Phase 26 Plan 04: Research Orchestrator Summary

**executeResearch pipeline: parallel Exa+classifier fan-out, Promise.allSettled fault isolation, URL-normalized dedup with heuristic relevance+channel-priority ranking**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-29T00:00:00Z
- **Completed:** 2026-03-29T00:08:00Z
- **Tasks:** 2
- **Files modified:** 3 created

## Accomplishments

- `mergeAndRank` deduplicates ChannelResult arrays by normalized URL, with heuristic sort by relevance -> channel priority -> recency
- `register-all.ts` side-effect barrel wires all 6 channel adapters into CHANNEL_REGISTRY via a single import
- `executeResearch` orchestrates the full pipeline: fires Exa in parallel with classifyIntent, then fans out to remaining recommended channels, collects all outputs via Promise.allSettled, and returns a deduplicated ranked ResearchResult

## Task Commits

1. **Task 1: Create merge/dedup utility and channel registration barrel** - `38a7598` (feat)
2. **Task 2: Create executeResearch orchestrator** - `4ec8a0f` (feat)

## Files Created/Modified

- `src/lib/search/merge-results.ts` - normalizeUrl helper, RELEVANCE_SCORES, CHANNEL_PRIORITY, mergeAndRank export
- `src/lib/search/channels/register-all.ts` - Side-effect barrel importing all 6 channel modules
- `src/lib/search/execute-research.ts` - Main orchestrator: ResearchParams, ResearchResult types, executeResearch function

## Decisions Made

- Fired Exa immediately alongside classifyIntent to eliminate the classifier latency from the Exa wait path; total latency is max(classifier, Exa) not their sum
- Used Promise.allSettled so a single channel failure (network, auth, rate-limit) does not discard results from other channels
- Chose heuristic ranking (RELEVANCE_SCORES + CHANNEL_PRIORITY + recency) over LLM re-rank for MVP — matches RESEARCH.md Open Question 4 recommendation
- URL dedup key normalizes to lowercase, removes query params/fragment, removes trailing slash to collapse near-duplicate URLs across channels

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing build failure in `src/app/api/prospects/[prospectId]/research/route.ts` (`Cannot find module 'ai'`) from phase 25-03 — unrelated to this plan's files. Logged as deferred item; none of the 3 files created in this plan have TypeScript errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `executeResearch` is ready to be called from the `/api/research` route (Plan 26-05)
- All 6 channels are registered and ready — the orchestrator just needs a valid `ResearchParams` input
- `ResearchResult.channelStatuses` is wired for UI channel badge rendering in the profile view

---
*Phase: 26-targeted-multi-source-search*
*Completed: 2026-03-29*
