---
phase: 26-targeted-multi-source-search-intent-routed-channels-sec-attom-news-proxycurl-faa-crunchbase
plan: 01
subsystem: search
tags: [typescript, upstash, redis, ratelimit, openrouter, llm, cache]

requires: []
provides:
  - "ChannelResult, ChannelOutput, ChannelParams, ChannelFn type contracts for all channel implementations"
  - "CHANNEL_REGISTRY map + registerChannel/getChannel helpers for self-registering channels"
  - "CHANNEL_TTLS constant (1h to 7d per-channel)"
  - "CHANNEL_DISPLAY_NAMES for UI badges"
  - "classifyIntent() LLM-backed intent classifier returning IntentClassification"
  - "getChannelCache/setChannelCache tenant-scoped cache helpers with per-channel TTLs"
  - "gNewsRateLimiter, openCorporatesRateLimiter, crunchbaseRateLimiter in limiters.ts"
affects:
  - 26-02
  - 26-03
  - 26-04
  - 26-05
  - 26-06
  - search-orchestrator
  - channel-implementations

tech-stack:
  added: []
  patterns:
    - "Channel self-registration: channel modules call registerChannel() at import time, wiring themselves into CHANNEL_REGISTRY"
    - "Intent classifier: LLM call with 200 max tokens + JSON parse + fallback to exa-only on failure"
    - "Per-channel cache: tenant-scoped key via buildCacheKey with channel-specific TTL from CHANNEL_TTLS"
    - "Environment key filtering: optional channels filtered out when their API key env var is absent"

key-files:
  created:
    - src/lib/search/channels/index.ts
    - src/lib/search/intent-classifier.ts
    - src/lib/search/channel-cache.ts
  modified:
    - src/lib/rate-limit/limiters.ts

key-decisions:
  - "ChannelId is a string literal union (not enum) for JSON-serialization compatibility"
  - "CHANNEL_REGISTRY uses a mutable Map with self-registration pattern to avoid circular imports"
  - "classifyIntent filters channels by API key presence at runtime — channels with unconfigured keys are silently excluded"
  - "Cache TTL for attom set to 7 days (604800s) — property records are stable; news/exa set to 1 hour"
  - "Intent classifier always ensures 'exa' is in channels array even if LLM omits it"

patterns-established:
  - "Channel self-registration via registerChannel() at module top-level"
  - "All channels return ChannelOutput with cached flag, latencyMs, and optional error string"
  - "Tenant-scoped cache keys use resource format 'research-channel:{channelId}'"

requirements-completed:
  - MSS-01
  - MSS-02
  - MSS-03

duration: 2min
completed: 2026-03-29
---

# Phase 26 Plan 01: Multi-Source Search Infrastructure Summary

**Shared type contracts, LLM intent classifier, tenant-scoped channel cache, and rate limiters that all channel implementations and the search orchestrator depend on**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-28T23:50:16Z
- **Completed:** 2026-03-28T23:52:23Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Defined ChannelResult, ChannelOutput, ChannelParams, ChannelFn type contracts in `src/lib/search/channels/index.ts` — single source of truth for all channel implementations
- Implemented `classifyIntent()` using LLM (claude-3.5-haiku via OpenRouter) with JSON parse fallback and runtime API-key filtering, ensuring "exa" is always present
- Created per-channel cache helpers (`getChannelCache`/`setChannelCache`) that use tenant-scoped keys and CHANNEL_TTLS for correct TTL per source
- Added gNewsRateLimiter, openCorporatesRateLimiter, crunchbaseRateLimiter to existing `limiters.ts` without modifying existing limiters

## Task Commits

Each task was committed atomically:

1. **Task 1: Create channel type contracts and registry** - `64b1486` (feat)
2. **Task 2: Create intent classifier + channel cache + rate limiters** - `25fb45e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/search/channels/index.ts` - ChannelId union type, ChannelResult/Output/Params/Fn types, CHANNEL_TTLS, CHANNEL_REGISTRY, CHANNEL_DISPLAY_NAMES, registerChannel/getChannel helpers
- `src/lib/search/intent-classifier.ts` - classifyIntent() using LLM with 200 max tokens, channel filtering by API key presence, exa always guaranteed, JSON parse fallback
- `src/lib/search/channel-cache.ts` - getChannelCache/setChannelCache wrapping getCachedData/setCachedData with per-channel TTLs and tenant-scoped keys
- `src/lib/rate-limit/limiters.ts` - Added gNewsRateLimiter (10/s), openCorporatesRateLimiter (5/s), crunchbaseRateLimiter (10/s)

## Decisions Made
- ChannelId as string literal union (not enum) for JSON-serialization compatibility with LLM output
- CHANNEL_REGISTRY uses a mutable Map with self-registration pattern to avoid circular imports
- Intent classifier filters channels by API key presence at runtime — channels with unconfigured keys are silently excluded
- Cache TTL for attom set to 7 days (604800s); news/exa at 1 hour reflecting data volatility
- Intent classifier always ensures "exa" is in channels array even if LLM omits it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing build failure in `src/app/api/prospects/[prospectId]/research/route.ts` (`Module not found: Can't resolve 'ai'`) — confirmed to exist before this plan's changes by stashing and re-running build. Not caused by this plan, out of scope per deviation rules. Documented here for awareness.

## User Setup Required

None - no external service configuration required for this plan. (Channel API keys for gnews/opencorporates/crunchbase/attom will be needed when those channel implementations are executed in subsequent plans.)

## Next Phase Readiness
- All type contracts are compiled and importable by channel implementations in 26-02 through 26-06
- classifyIntent() is ready for the search orchestrator to call
- Cache helpers are ready for channels to use without any additional setup
- Rate limiters are ready for gnews, opencorporates, and crunchbase channel implementations

---
*Phase: 26-targeted-multi-source-search*
*Completed: 2026-03-29*
