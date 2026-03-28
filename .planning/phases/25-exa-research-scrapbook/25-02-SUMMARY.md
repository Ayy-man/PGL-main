---
phase: 25-exa-research-scrapbook
plan: 02
subsystem: api
tags: [exa, openrouter, upstash, ratelimit, llm, research, scrapbook]

# Dependency graph
requires:
  - phase: 25-exa-research-scrapbook plan 01
    provides: ScrapbookCard and ScrapbookCardCategory types from src/types/research.ts
provides:
  - searchExaForResearch function — neural Exa search with 10 results, 3000 char text
  - digestForScrapbook function — LLM digest returning ScrapbookCard[] with extended fields
  - researchRateLimiter — Upstash fixed window 100 searches/day/tenant
affects: [25-exa-research-scrapbook plan 03, api routes, research feature]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Never-throw pattern: all library functions catch errors and return empty arrays"
    - "LLM batch digest: single chatCompletion call for all results, JSON output, strip markdown fences"
    - "Source metadata extraction: domain from URL, favicon as https://{domain}/favicon.ico"

key-files:
  created:
    - src/lib/research/exa-search.ts
    - src/lib/research/research-digest.ts
    - src/lib/research/research-rate-limit.ts
  modified: []

key-decisions:
  - "chatCompletion returns {text: string} object, not raw string — access via response.text"
  - "Neural search type (not 'auto') for better semantic matching in research context"
  - "Rate limiter prefix set to ratelimit:research (not research:) to match Upstash convention"

patterns-established:
  - "Research library functions: never-throw, return empty on failure, console.error on errors"
  - "LLM digest: filter is_about_target:false, sort by answer_relevance order (direct/tangential/background)"

requirements-completed: [RES-04, RES-05, RES-06]

# Metrics
duration: 8min
completed: 2026-03-28
---

# Phase 25 Plan 02: Research Library Functions Summary

**Neural Exa search (10 results, 3000 chars), LLM scrapbook digest with answer_relevance/is_about_target/confidence_note fields, and Upstash 100/day rate limiter**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-28T23:20:00Z
- **Completed:** 2026-03-28T23:28:51Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `searchExaForResearch` — neural Exa queries with higher limits than enrichment pipeline (10 results, 3000 chars vs 3 results, 500 chars)
- Created `digestForScrapbook` — LLM digest extending exa-digest pattern with scrapbook-specific fields: answer_relevance, is_about_target, confidence_note, event_date_precision, source_name, source_favicon
- Created `researchRateLimiter` — Upstash fixed window enforcing 100 searches/day per tenant with analytics enabled

## Task Commits

Each task was committed atomically:

1. **Task 1: Exa search function for research** - `5de432c` (feat)
2. **Task 2: Research digest + rate limiter** - `567a98b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/research/exa-search.ts` - Neural Exa search, no circuit breaker, never throws
- `src/lib/research/research-digest.ts` - LLM digest with scrapbook fields, filters/sorts by relevance
- `src/lib/research/research-rate-limit.ts` - Upstash fixed window 100/day/tenant

## Decisions Made
- Used `response.text` to extract string from `chatCompletion` return value (returns `{text, inputTokens, outputTokens}` not raw string)
- Rate limiter prefix: `ratelimit:research` (consistent with Upstash convention)
- `digestForScrapbook` references `@/types/research` — types from Plan 01 (parallel execution, will resolve on merge)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed chatCompletion return type mismatch**
- **Found during:** Task 2 (research-digest.ts)
- **Issue:** Plan template used `const raw = await chatCompletion(...)` then `raw.replace(...)`, but `chatCompletion` returns `{text: string}` not a plain string
- **Fix:** Used `response.text` to extract the string before calling `.replace()`
- **Files modified:** src/lib/research/research-digest.ts
- **Verification:** grep confirmed correct usage
- **Committed in:** 567a98b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — return type mismatch)
**Impact on plan:** Essential correction; the template code would have crashed at runtime.

## Issues Encountered
- `src/types/research.ts` not yet created (Plan 01 runs in parallel in wave 1) — `research-digest.ts` imports from it will resolve when Plan 01 merges; TypeScript types won't validate until then.

## User Setup Required
None - no external service configuration required. EXA_API_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, and OPENROUTER_API_KEY already configured.

## Next Phase Readiness
- All three library functions ready for consumption by Plan 03 API routes
- `searchExaForResearch` → called by `/api/research/search`
- `digestForScrapbook` → called by research API after Exa results arrive
- `researchRateLimiter` → called at route level before Exa search

---
*Phase: 25-exa-research-scrapbook*
*Completed: 2026-03-28*
