---
phase: 02-persona-search-lists
plan: 01
subsystem: infra
tags: [redis, upstash, rate-limiting, circuit-breaker, opossum, apollo-api, zod, caching]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: TypeScript types, Supabase client patterns, environment validation
provides:
  - Redis singleton client for caching and rate limiting
  - Tenant-scoped cache key builder preventing cross-tenant leakage
  - Per-tenant rate limiters (100 Apollo calls/hour)
  - Circuit breaker for Apollo API resilience
  - Apollo API type definitions and Zod validation schemas
  - Rate limit middleware with 429 response helpers
affects: [02-03-persona-crud, 02-04-search-api, 02-05-list-management, 02-06-search-ui, 02-07-list-ui]

# Tech tracking
tech-stack:
  added: [@upstash/redis, @upstash/ratelimit, opossum, zod, nuqs, @tanstack/react-table, @types/opossum]
  patterns: [Redis singleton, tenant-scoped caching, sliding window rate limiting, circuit breaker with fallback]

key-files:
  created:
    - src/lib/cache/redis.ts
    - src/lib/cache/keys.ts
    - src/lib/rate-limit/limiters.ts
    - src/lib/rate-limit/middleware.ts
    - src/lib/circuit-breaker/apollo-breaker.ts
    - src/lib/apollo/types.ts
    - src/lib/apollo/schemas.ts
  modified:
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Use Upstash Redis REST API via Redis.fromEnv() for serverless compatibility"
  - "Enforce tenant:{tenantId}: prefix on all cache keys (SHA-256 hash for object identifiers)"
  - "Sliding window rate limiting (100 calls/hour) per tenant for Apollo API"
  - "Circuit breaker opens at 50% failure rate with 30s reset timeout"
  - "Apollo API uses X-Api-Key header (not Authorization Bearer)"

patterns-established:
  - "Cache key pattern: tenant:{tenantId}:{resource}:{identifier}"
  - "Rate limiter identifier pattern: tenant:{tenantId}"
  - "Circuit breaker fallback returns empty results (never throws)"
  - "Zod schemas export both schema and inferred type"

# Metrics
duration: 6min
completed: 2026-02-08
---

# Phase 02 Plan 01: Infrastructure Layer Summary

**Redis caching with mandatory tenant prefixes, 100-calls/hour rate limiting, and circuit breaker for Apollo API with empty-result fallback**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-08T12:51:25Z
- **Completed:** 2026-02-08T12:57:33Z
- **Tasks:** 2
- **Files created:** 7

## Accomplishments

- Redis singleton client using Upstash REST API (serverless-ready)
- Tenant-scoped cache key builder with SHA-256 hashing for deterministic object keys
- Per-tenant rate limiter enforcing 100 Apollo API calls per hour (sliding window)
- Circuit breaker protecting against Apollo API cascading failures (50% threshold, 30s reset)
- Complete Apollo API type definitions and Zod validation schemas
- Rate limit middleware with reusable 429 response helpers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Redis client, cache key builder, and cache utilities** - `4c16245` (feat)
   - Redis singleton using Redis.fromEnv()
   - buildCacheKey with mandatory tenant:{tenantId}: prefix
   - getCachedData, setCachedData, invalidateCache helpers
   - Installed all dependencies

2. **Task 2: Create rate limiters, rate limit middleware, circuit breaker, and Apollo types/schemas** - `f1135d1` (feat)
   - apolloRateLimiter with sliding window (100, "1 h")
   - withRateLimit, rateLimitHeaders, rateLimitResponse middleware
   - apolloBreaker with 10s timeout, 50% error threshold
   - Apollo API types (ApolloSearchParams, ApolloPerson, ApolloSearchResponse)
   - Zod schemas (searchRequestSchema, PersonaFilters)

## Files Created/Modified

- `src/lib/cache/redis.ts` - Redis singleton using Upstash REST API
- `src/lib/cache/keys.ts` - Tenant-scoped cache key builder with SHA-256 hashing
- `src/lib/rate-limit/limiters.ts` - apolloRateLimiter with 100 calls/hour per tenant
- `src/lib/rate-limit/middleware.ts` - Rate limit middleware and 429 response helpers
- `src/lib/circuit-breaker/apollo-breaker.ts` - Circuit breaker for Apollo API with event logging
- `src/lib/apollo/types.ts` - Apollo API request/response type definitions
- `src/lib/apollo/schemas.ts` - Zod validation schemas for search requests
- `package.json` - Added @upstash/redis, @upstash/ratelimit, opossum, zod, nuqs, @tanstack/react-table
- `pnpm-lock.yaml` - Locked dependency versions

## Decisions Made

1. **Redis.fromEnv() for environment-based configuration**
   - Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env
   - Serverless-compatible (REST API, no persistent connections)
   - Singleton pattern prevents connection leaks

2. **Mandatory tenant:{tenantId}: prefix on all cache keys**
   - Primary defense against cross-tenant data leakage
   - buildCacheKey function requires tenantId parameter (not optional)
   - SHA-256 hash for object identifiers ensures deterministic keys

3. **Sliding window rate limiting (100 calls/hour)**
   - More accurate than fixed window (no boundary reset spikes)
   - Per-tenant isolation via identifier: `tenant:${tenantId}`
   - Analytics enabled for monitoring

4. **Circuit breaker with empty-result fallback**
   - Opens at 50% failure rate (errorThresholdPercentage: 50)
   - 30 second reset timeout (resetTimeout: 30000)
   - Fallback returns `{ people: [], pagination: {...} }` (graceful degradation)
   - Event logging for open/halfOpen/close state changes

5. **Apollo API authentication via X-Api-Key header**
   - Uses X-Api-Key header (not Authorization: Bearer)
   - Endpoint: /api/v1/mixed_people/search
   - Throws APOLLO_RATE_LIMIT_HIT on 429 for circuit breaker tracking

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**pnpm install permission issue with Next.js binary**
- **Issue:** ENOENT error when installing dependencies (chmod failure on next/dist/bin/next)
- **Resolution:** Cleaned node_modules/.pnpm/next@* and re-ran pnpm install
- **Impact:** Brief delay, no changes to code or architecture

## User Setup Required

**External services require manual configuration.** See user_setup section in plan for:

**Upstash Redis:**
- `UPSTASH_REDIS_REST_URL` - From Upstash Console → Database → REST API
- `UPSTASH_REDIS_REST_TOKEN` - From Upstash Console → Database → REST API

**Apollo.io:**
- `APOLLO_API_KEY` - From Apollo.io account settings

**Verification:**
```bash
# After adding env vars, test Redis connection:
pnpm tsx -e "import {redis} from './src/lib/cache/redis'; redis.ping().then(console.log)"

# Test rate limiter:
pnpm tsx -e "import {apolloRateLimiter} from './src/lib/rate-limit/limiters'; apolloRateLimiter.limit('test').then(console.log)"
```

## Next Phase Readiness

**Ready for Plans 02-03 through 02-07:**
- Redis caching infrastructure available for search results and persona data
- Rate limiting enforced for all Apollo API calls (prevents quota overruns)
- Circuit breaker protects against cascading failures during Apollo API outages
- Apollo types and schemas ready for import in search API route
- Cache utilities ready for import in CRUD operations

**No blockers:**
- All infrastructure utilities compile without errors
- All exports verified and importable
- Tenant isolation enforced via cache key prefixes
- No hardcoded tenant IDs anywhere

**Dependencies for next plans:**
- Plans 02-03 through 02-07 can safely import from this infrastructure layer
- Rate limiter should be called before every Apollo API request
- Cache utilities should be used for persona data and search results
- Circuit breaker should wrap all Apollo API calls

---
*Phase: 02-persona-search-lists*
*Completed: 2026-02-08*
