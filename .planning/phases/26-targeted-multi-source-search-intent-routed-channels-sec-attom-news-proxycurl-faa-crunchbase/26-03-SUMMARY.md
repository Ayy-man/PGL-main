---
phase: 26-targeted-multi-source-search-intent-routed-channels-sec-attom-news-proxycurl-faa-crunchbase
plan: 03
subsystem: search
tags: [typescript, ratelimit, cache, circuit-breaker, opencorporates, crunchbase, attom, channel]

requires:
  - "26-01: ChannelResult/Output/Params/Fn types, CHANNEL_REGISTRY, registerChannel, getChannelCache/setChannelCache, openCorporatesRateLimiter, crunchbaseRateLimiter"

provides:
  - "searchOpenCorporates: ChannelFn searching US company registration data by company name via OpenCorporates API v0.4"
  - "searchCrunchbase: ChannelFn searching organizations via Crunchbase Basic free tier (short_description, company_type, founded_on, homepage_url)"
  - "searchAttom: ChannelFn searching property records by address via ATTOM API (optional premium, key-gated)"
  - "All 3 channels self-registered in CHANNEL_REGISTRY"

affects:
  - 26-04 (search orchestrator can now invoke all 6 channels)
  - channel-registry

tech-stack:
  added: []
  patterns:
    - "Graceful degradation: return { channelId, results: [], error: 'KEY not configured' } when env var absent"
    - "Crunchbase Basic free tier protection: field_ids limited to [short_description, company_type, founded_on, homepage_url] — no funding_rounds/founders/investors"
    - "ATTOM premium channel: documented with error string 'ATTOM_API_KEY not configured (premium channel)'"
    - "Address parsing: location field split at first comma into addressLine + cityState for ATTOM property search"

key-files:
  created:
    - src/lib/search/channels/opencorporates-channel.ts
    - src/lib/search/channels/crunchbase-channel.ts
    - src/lib/search/channels/attom-channel.ts
  modified: []

key-decisions:
  - "Crunchbase Basic free tier: field_ids limited to 4 safe fields to avoid 403 — per RESEARCH.md Pitfall 8"
  - "ATTOM scoped to first 3 results (property search rarely returns many usable matches per address)"
  - "OpenCorporates scoped to US (jurisdiction_code=us) to reduce noise for typical US-focused prospects"
  - "ATTOM property relevance set to 'high' — when queried with a real address, matches are directly relevant"
  - "No dedicated ATTOM rate limiter — paid tier has generous limits; can add later if needed"

metrics:
  duration: ~2 min
  completed: "2026-03-29"
  tasks: 2
  files_created: 3
  files_modified: 0
---

# Phase 26 Plan 03: OpenCorporates + Crunchbase + ATTOM Channel Adapters Summary

**OpenCorporates, Crunchbase (Basic free tier), and ATTOM (optional premium) channel adapters implemented and registered — completing the 3-channel batch for company, startup, and property data**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-28T23:55:58Z
- **Completed:** 2026-03-29T00:00:00Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- Created `opencorporates-channel.ts` — searches US company registration data via OpenCorporates API v0.4, scoped to `jurisdiction_code=us`, maps first 5 matches to ChannelResult with `category: "corporate"`
- Created `crunchbase-channel.ts` — searches Crunchbase organizations using Basic free tier fields only (`short_description`, `company_type`, `founded_on`, `homepage_url`), returns 3 results with `confidence_note: "Crunchbase Basic tier — limited fields available"`
- Created `attom-channel.ts` — optional premium property search ($95/mo), silently returns empty with `"ATTOM_API_KEY not configured (premium channel)"` when key absent; parses prospect.location into address1/address2 for ATTOM API format
- All 3 channels use `getChannelCache/setChannelCache`, circuit breaker wrapping via `withCircuitBreaker`, and self-register in CHANNEL_REGISTRY

## Task Commits

1. **Task 1: Implement OpenCorporates + Crunchbase channels** — `08fb725` (feat)
2. **Task 2: Implement ATTOM property channel** — `04ca154` (feat)

## Files Created

- `src/lib/search/channels/opencorporates-channel.ts` — OCCompany type, searchOpenCorporatesInternal, exported via withCircuitBreaker, registered as "opencorporates"
- `src/lib/search/channels/crunchbase-channel.ts` — CrunchbaseEntity type, searchCrunchbaseInternal, Basic-tier-safe POST body, exported via withCircuitBreaker, registered as "crunchbase"
- `src/lib/search/channels/attom-channel.ts` — ATTOMProperty type, parseLocation helper, searchAttomInternal, exported via withCircuitBreaker, registered as "attom"

## Decisions Made

- Crunchbase `field_ids` restricted to 4 safe fields per RESEARCH.md Pitfall 8 (free tier returns 403 on premium fields)
- OpenCorporates search scoped to `jurisdiction_code=us` to reduce noise for US-focused prospect context
- ATTOM results limited to first 3 properties (address-based queries rarely have many matches)
- ATTOM property results use `relevance: "high"` — address-matched property data is directly relevant
- No dedicated ATTOM rate limiter — paid tier has generous limits; placeholder comment added if needed later

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all channels are fully implemented. Crunchbase `confidence_note` explicitly documents the free-tier limitation to users.

## Build Status

Pre-existing build failure in `src/app/api/prospects/[prospectId]/research/route.ts` (`Module not found: Can't resolve 'ai'`) — confirmed pre-existing before this plan, documented in 26-01-SUMMARY.md. Not caused by this plan's changes.

All new channel files pass TypeScript compilation with the full project tsconfig (zero errors for opencorporates-channel.ts, crunchbase-channel.ts, attom-channel.ts).

## Self-Check: PASSED

- [x] `src/lib/search/channels/opencorporates-channel.ts` exists
- [x] `src/lib/search/channels/crunchbase-channel.ts` exists
- [x] `src/lib/search/channels/attom-channel.ts` exists
- [x] Commit `08fb725` exists (Task 1)
- [x] Commit `04ca154` exists (Task 2)

---
*Phase: 26-targeted-multi-source-search*
*Completed: 2026-03-29*
