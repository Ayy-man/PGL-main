---
phase: 26-targeted-multi-source-search
plan: 02
subsystem: api
tags: [exa, sec-edgar, gnews, search, channel-adapters, circuit-breaker, redis-cache, rate-limiting]

# Dependency graph
requires:
  - phase: 26-01
    provides: ChannelResult/ChannelOutput/ChannelParams types, CHANNEL_REGISTRY, getChannelCache/setChannelCache helpers, gNewsRateLimiter, edgarRateLimiter

provides:
  - Exa channel adapter (searchExa) registered in CHANNEL_REGISTRY
  - EDGAR EFTS full-text filing search channel (searchEdgarEfts) registered in CHANNEL_REGISTRY
  - GNews news article search channel (searchGNews) registered in CHANNEL_REGISTRY

affects: [26-03, 26-04, 26-05, orchestrator, research-route]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Channel adapter pattern: internal fn + withCircuitBreaker wrap + registerChannel(id, fn)"
    - "Graceful degradation: missing API key or error returns empty ChannelOutput, never throws"
    - "Cache-first: getChannelCache check at top of every channel before external API call"

key-files:
  created:
    - src/lib/search/channels/exa-channel.ts
    - src/lib/search/channels/edgar-efts-channel.ts
    - src/lib/search/channels/gnews-channel.ts
  modified:
    - src/lib/search/channels/index.ts (Plan 01 infra — created in same execution)
    - src/lib/search/channel-cache.ts (Plan 01 infra — created in same execution)
    - src/lib/search/intent-classifier.ts (Plan 01 infra — created in same execution)
    - src/lib/rate-limit/limiters.ts (Plan 01 infra — added gNews/openCorporates/crunchbase limiters)

key-decisions:
  - "Plan 01 infrastructure (channels/index.ts, channel-cache.ts, intent-classifier.ts, limiters.ts additions) was implemented in same execution since Plan 01 had no SUMMARY.md and the search/ directory did not exist"
  - "Exa channel replicates API call pattern rather than reusing enrichExa (different return type — ExaResult vs ChannelOutput)"
  - "EDGAR EFTS uses efts.sec.gov LATEST/search-index endpoint (full-text) vs enrichEdgar which uses submissions API (CIK-based) — distinct channels, shared edgarRateLimiter"
  - "withCircuitBreaker fallback returns { error, circuitOpen: true } which satisfies ChannelOutput via TypeScript cast — circuit-open case falls back naturally"

patterns-established:
  - "Channel registration pattern: define internal fn → withCircuitBreaker wrap → registerChannel at module level"
  - "API key guard: check env var at top of internal fn, return { channelId, results: [], error } immediately if missing"
  - "Cache-first: getChannelCache → if hit return with cached:true and refreshed latencyMs; miss → API call → setChannelCache → return"

requirements-completed: [MSS-04, MSS-05, MSS-06]

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 26 Plan 02: Channel Adapters (Exa + EDGAR EFTS + GNews) Summary

**Three channel adapters wrapping Exa web search, SEC EDGAR full-text filing search, and GNews news articles into the unified ChannelOutput contract with per-channel Redis caching and circuit breaker protection**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T23:55:37Z
- **Completed:** 2026-03-29T00:00:00Z
- **Tasks:** 2 (Plan 02) + Plan 01 infrastructure (4 files as prerequisite)
- **Files created:** 7 (3 Plan 02 channels + 4 Plan 01 infra)
- **Files modified:** 1 (limiters.ts for new rate limiters)

## Accomplishments

- Implemented Exa channel adapter: POST `api.exa.ai/search`, maps results to ChannelResult[], wrapped in circuit breaker (10s timeout), cache-first with 1hr TTL
- Implemented EDGAR EFTS channel: `efts.sec.gov/LATEST/search-index` full-text search for SEC filings (Forms 4, 13F, 8-K, 10-K, 10-Q), uses shared `edgarRateLimiter`, 24hr cache TTL
- Implemented GNews channel: `gnews.io/api/v4/search`, uses `gNewsRateLimiter`, circuit breaker (8s timeout), 1hr cache TTL
- All three channels gracefully degrade (return empty results, never throw) on missing API keys or API failures
- Also implemented Plan 01 prerequisite infrastructure: channel type contracts (ChannelId, ChannelResult, ChannelOutput, ChannelParams, ChannelFn), CHANNEL_REGISTRY, CHANNEL_TTLS, getChannelCache/setChannelCache helpers, classifyIntent LLM function, three new rate limiters

## Task Commits

1. **Plan 01 infrastructure** - `09d91e4` (feat: channel type contracts, intent classifier, cache helpers, rate limiters)
2. **Task 1+2: Exa, EDGAR EFTS, GNews channels** - `93b571b` (feat: implement Exa, EDGAR EFTS, and GNews channel adapters)

## Files Created/Modified

- `src/lib/search/channels/index.ts` - ChannelId union, ChannelResult/ChannelOutput/ChannelParams/ChannelFn types, CHANNEL_REGISTRY map, CHANNEL_TTLS, CHANNEL_DISPLAY_NAMES, registerChannel/getChannel
- `src/lib/search/channel-cache.ts` - getChannelCache/setChannelCache wrapping getCachedData/setCachedData with per-channel TTLs
- `src/lib/search/intent-classifier.ts` - classifyIntent LLM function (chatCompletion → JSON parse → fallback to exa-only)
- `src/lib/search/channels/exa-channel.ts` - Exa channel adapter, POST api.exa.ai/search, circuit breaker 10s
- `src/lib/search/channels/edgar-efts-channel.ts` - EDGAR EFTS full-text filing search, efts.sec.gov, shared edgarRateLimiter
- `src/lib/search/channels/gnews-channel.ts` - GNews news search, gnews.io/api/v4/search, gNewsRateLimiter, circuit breaker 8s
- `src/lib/rate-limit/limiters.ts` - Added gNewsRateLimiter, openCorporatesRateLimiter, crunchbaseRateLimiter

## Decisions Made

- **Plan 01 as prerequisite**: Plan 01 infrastructure didn't exist (no SUMMARY, no search/ directory), so it was implemented in this execution as a required foundation. Both Plan 01 and Plan 02 work committed atomically.
- **Exa does NOT reuse enrichExa**: `enrichExa` returns `ExaResult` for enrichment flows; the channel needs `ChannelOutput`. Separate implementation avoids type impedance and keeps the channel contract clean.
- **EDGAR EFTS vs enrichEdgar**: These are distinct APIs. `enrichEdgar` uses CIK-based submissions endpoint. `searchEdgarEfts` uses `efts.sec.gov` full-text search index — finds filings mentioning a person/company by keyword. They share `edgarRateLimiter` as intended.
- **Rate limit retry logic**: On initial rate limit hit, waits `max(reset - now, 100ms)` then retries once. If still rate-limited, returns empty with error (never blocks indefinitely).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Implemented Plan 01 infrastructure as prerequisite**

- **Found during:** Pre-execution check (Task 1 read_first)
- **Issue:** `src/lib/search/` directory did not exist; Plan 02's `read_first` requires channels/index.ts and channel-cache.ts from Plan 01. Plan 01 has no SUMMARY.md and was never executed.
- **Fix:** Implemented all 4 Plan 01 artifacts (channels/index.ts, channel-cache.ts, intent-classifier.ts, limiters.ts additions) before implementing Plan 02 channels.
- **Files modified:** src/lib/search/channels/index.ts, src/lib/search/channel-cache.ts, src/lib/search/intent-classifier.ts, src/lib/rate-limit/limiters.ts
- **Verification:** TypeScript project check passes with 0 errors in new files
- **Committed in:** 09d91e4

---

**Total deviations:** 1 auto-fixed (1 blocking — missing prerequisite)
**Impact on plan:** Plan 01 infrastructure is exactly what Plan 01 specified. No scope creep.

## Issues Encountered

- Pre-existing build failure in `src/app/api/prospects/[prospectId]/research/route.ts` (missing `ai` module) — pre-dates these changes, confirmed by git stash test. Logged for deferred resolution.

## User Setup Required

None — GNews, EDGAR EFTS all use existing env vars (`GNEWS_API_KEY`, `SEC_EDGAR_USER_AGENT`, `EXA_API_KEY`). No new external service configuration required.

## Next Phase Readiness

- All 6 ChannelId adapters partially complete (3 of 6 done: exa, edgar-efts, gnews)
- Plan 03 can implement opencorporates, crunchbase, attom channels using the same pattern
- classifyIntent is ready for Plan 04 (orchestrator)
- CHANNEL_REGISTRY will auto-populate as channel modules are imported

---
*Phase: 26-targeted-multi-source-search*
*Completed: 2026-03-29*
