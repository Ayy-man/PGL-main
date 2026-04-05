# Codebase Concerns

**Analysis Date:** 2026-04-05

## Tech Debt

### Silent Failure Pattern in Enrichment Pipeline
- **Issue:** Multiple `.catch(() => {})` handlers suppress error logging without recovery
- **Files:** `src/inngest/functions/enrich-prospect.ts` (lines 86, 193, 293, 431, 492, 556)
- **Impact:** Failed activity logging, missed errors, no observability into partial enrichment failures
- **Fix approach:** Replace silent catches with conditional logging (only suppress non-critical errors like activity logging) or use Sentry/error tracking for suppressed errors

### JSON Parsing Without Error Boundary
- **Issue:** Multiple `JSON.parse()` calls in enrichment/research pipeline without try-catch
- **Files:** 
  - `src/lib/research/research-digest.ts` (line 82) - LLM response parsing
  - `src/lib/enrichment/lookalike.ts` (line 176) - Persona generation parsing
  - `src/lib/enrichment/exa-digest.ts` (line 89) - Exa results digestion
  - `src/lib/search/intent-classifier.ts` (line 67) - Intent classification parsing
- **Impact:** Unhandled SyntaxError crashes enrichment steps or research pipelines
- **Fix approach:** Wrap all JSON.parse in try-catch, fallback to empty array/null with error logging. Consider schema validation with Zod before parsing

### Unused State Variables Accumulating
- **Issue:** Multiple unused state variables (_currentCards, _streamingReasoning, _reasoningCollapsed, _exaResultCount) cluttering component
- **Files:** `src/components/prospect/research-panel.tsx` (lines 72, 79, 80, 82)
- **Impact:** Maintenance burden, misleading code, potential performance overhead
- **Fix approach:** Remove all unused prefixed variables, clean up unused state setters

### Type Coercion and Type Casting Antipattern
- **Issue:** Frequent use of `as unknown as RawType` pattern bypassing TypeScript type safety
- **Files:**
  - `src/lib/lists/queries.ts` (line 294) - List member insertion response
  - `src/inngest/functions/enrich-prospect.ts` (line 69) - Event data casting
  - Multiple API routes cast responses without validation
- **Impact:** Silent runtime type mismatches, null safety violations, hard-to-debug production issues
- **Fix approach:** Use Zod schemas to validate external data shapes before casting. Remove `as unknown as` patterns

## Known Bugs

### List Members Null Join Issue (Silent Data Loss)
- **Bug:** Prospect join in `list_members` query returns nullable `prospects` field
- **Symptoms:** 
  - Members whose prospect was deleted will have null `raw` value
  - Current code skips them (line 194 in `src/lib/lists/queries.ts`)
  - UI displays incomplete member counts without notifying user
- **Files:** `src/lib/lists/queries.ts` (lines 131-219)
- **Trigger:** Delete a prospect that's in multiple lists, view those lists — missing members without warning
- **Workaround:** Currently silently skipping with `if (!raw) continue;` — incomplete fix
- **Fix approach:** 
  1. Consider database-level CASCADE DELETE or soft deletes
  2. Or: Log warnings when skipping null prospects
  3. Or: Return partial data with "removed prospect" placeholder instead of silently skipping

### CompanySize Format Handling Regression Risk
- **Bug:** Apollo company size handling has complex normalization logic that assumes specific input formats
- **Symptoms:** 
  - Legacy dash format "51-200" converted to "51,200"
  - Split numbers from broken comma-split handled specially (lines 122-135 in `src/lib/apollo/client.ts`)
  - Multiple normalization points (line 56 in `translateFiltersToApolloParams`, line 119-136 in `searchApollo`)
  - No test coverage visible for edge cases
- **Files:** `src/lib/apollo/client.ts`, `src/lib/apollo/types.ts`
- **Impact:** Search results inconsistent or missing if format doesn't match expected patterns
- **Fix approach:** Consolidate normalization to single function, add unit tests for all format variations, document expected input format

### Rate Limit Reset Time Off-by-One Risk
- **Bug:** Rate limit waitMs calculation uses `Math.max(result.reset - Date.now(), 100)` floor
- **Symptoms:** High load scenarios may hit rate limits again immediately after wait completes
- **Files:** `src/lib/enrichment/edgar.ts` (line 44)
- **Impact:** Potential cascading rate limit failures in burst scenarios
- **Fix approach:** Add 100-200ms buffer to waitMs, or implement exponential backoff instead of fixed wait

## Security Considerations

### Apollo Mock Enrichment Flag Hard to Audit
- **Risk:** `APOLLO_MOCK_ENRICHMENT` env var silently switches real API to fake data
- **Files:** `src/app/api/apollo/bulk-enrich/route.ts` (line 16)
- **Current mitigation:** Comments explain how to disable, but no audit log when enabled
- **Recommendations:** 
  1. Add debug logging when mock mode is active
  2. Include mock indicator in response metadata for transparency
  3. Never deploy with mock=true to production

### ContactOut LinkedIn URL Validation Weak
- **Risk:** Only checks for `/in/` or `/pub/` in URL string
- **Files:** `src/lib/enrichment/contactout.ts` (lines 68)
- **Current mitigation:** Returns error for invalid URLs, but validation is substring-based
- **Recommendations:** Use URL parsing + regex validation for LinkedIn domain check

### Potential XSS in URL Processing
- **Risk:** URLs extracted from Exa/research results used in favicons and source links without sanitization
- **Files:** `src/lib/research/research-digest.ts` (lines 107-114, 125-127)
- **Current mitigation:** URLs only displayed in links and favicons, not in HTML content
- **Recommendations:** Validate URLs are HTTPS before using in favicons, use URL() constructor for parsing

## Performance Bottlenecks

### Large Component Files Risk Poor Interaction Performance
- **Problem:** Component files over 1000 lines have hidden re-render risks
- **Files:**
  - `src/components/prospect/research-panel.tsx` (1130 lines)
  - `src/components/admin/tenant-detail-drawer.tsx` (1098 lines)
  - `src/components/prospect/profile-view.tsx` (931 lines)
  - `src/app/[orgId]/search/components/search-content.tsx` (826 lines)
- **Cause:** Multiple useState/callback hooks, complex event handlers, no memo boundaries
- **Impact:** User interactions (clicks, typing) may lag due to re-render size
- **Improvement path:** 
  1. Extract sub-components for isolated state (e.g., ResearchCard as separate component)
  2. Use React.memo on card/list item components
  3. Split search-content.tsx into smaller files by feature area

### Research Digest LLM Call Not Batched Per Query
- **Problem:** Each research query calls LLM for digest even if same results appear
- **Files:** `src/lib/research/research-digest.ts` (line 63)
- **Cause:** No caching of digest results by result set hash
- **Impact:** High LLM latency if user reruns searches
- **Improvement path:** Cache digest results by SHA256(sortedResultUrls) with 24h TTL in Redis

### Prospect Enrichment Has No Deduplication on Retry
- **Problem:** If enrichment task retries, all enrichment sources run again (ContactOut, Exa, EDGAR)
- **Files:** `src/inngest/functions/enrich-prospect.ts` (line 62 - retry: 3)
- **Cause:** No check if enrichment_status is "enriching" or "completed"
- **Impact:** Wasted API credits and enrichment quota on unnecessary retries
- **Improvement path:** Check enrichment_status before starting steps, skip completed sources

## Fragile Areas

### Lookalike Persona Generation Relies on AI JSON Output
- **Files:** `src/lib/enrichment/lookalike.ts` (lines 105-180+)
- **Why fragile:**
  - LLM might return non-JSON response (logs get checked, but then what?)
  - Structured output validation missing
  - No fallback persona if generation fails
  - Apollo filter format assumptions (company size ranges hardcoded)
- **Safe modification:**
  1. Always wrap with try-catch and return empty result instead of throwing
  2. Validate response structure with Zod schema
  3. Add fallback: if LLM fails, use prospect's own title/company as naive filters
- **Test coverage:** No visible tests for lookalike generation

### Inngest Event Data Type Coercion Fragile
- **Files:** `src/inngest/functions/enrich-prospect.ts` (lines 69, 81)
- **Why fragile:** Event data cast to unknown then recast per field
- **Safe modification:** Define strict Zod schema for event payload, validate before using
- **Test coverage:** Some test coverage in enrich-prospect.test.ts but edge cases missing

### Search Content Component Selection State Not Cleared on Persona Change
- **Files:** `src/app/[orgId]/search/components/search-content.tsx` (lines 89-92)
- **Why fragile:** 
  - `setSelectedIds` reset only on persona change, not on manual clear
  - Bulk action bar might show stale counts if filter overrides change
  - No validation that selected prospects still exist in new results
- **Safe modification:**
  1. Reset selection on any search parameter change (filters, keywords, pageSize)
  2. Clear invalid selections when results change
  3. Add test for selection persistence across persona switches
- **Test coverage:** No visible tests for selection behavior

### Research Panel Session History Missing Cleanup
- **Files:** `src/components/prospect/research-panel.tsx` (lines 73-77, 98-100)
- **Why fragile:**
  - Sessions loaded on mount but no cleanup logic
  - Memory leak if component mounted/unmounted repeatedly
  - No pagination for session list (could grow unbounded)
- **Safe modification:**
  1. Add session count limit query (`LIMIT 50`)
  2. Add AbortController cleanup in useEffect return
  3. Implement manual clear history button
- **Test coverage:** No visible tests for session management

## Scaling Limits

### Apollo Search Result Cap at 25 Results
- **Current capacity:** `MAX_RESULTS_PER_SEARCH = 25` hard limit
- **Limit:** Users can't paginate beyond 25 per page
- **Scaling path:**
  1. Increase cap to 50-100 (depends on UI table rendering performance)
  2. Consider virtual scrolling if pagination disabled
  3. Measure rendering time for 100-row table before change

### Inngest Concurrency Limit May Be Insufficient
- **Current capacity:** `concurrency: [{ limit: 5 }]` for enrichment
- **Limit:** Only 5 enrichments run in parallel, blocks on high-volume onboarding
- **Scaling path:**
  1. Monitor queue depth in production
  2. Increase to 10-15 if infrastructure supports (API rate limits)
  3. Add per-org rate limiting instead of global limit

### Redis Cache Key Size Explosion Risk
- **Problem:** Apollo search cache keys include full filter object serialization (line 158 in `src/lib/apollo/client.ts`)
- **Limit:** Long filter objects = long keys = higher memory usage
- **Scaling path:**
  1. Hash filter object to fixed-size SHA256 instead of serializing full object
  2. Already partially done with `apollo:search:v3` versioning, but filters still serialized
  3. Implement key size monitoring in Redis

## Dependencies at Risk

### Zod Schema Validation Coverage Incomplete
- **Risk:** Many API routes validate with Zod, but some skip validation
- **Impact:** Type errors at runtime instead of request validation
- **Files:**
  - `src/app/api/search/apollo/route.ts` - Has validation (good)
  - `src/app/api/prospects/upsert/route.ts` - No visible Zod schema
  - `src/app/api/prospects/[prospectId]/research/multi-source/route.ts` - Unclear validation
- **Migration plan:** Create Zod schemas for all API request bodies in `src/lib/**/schemas.ts`

### CircuitBreaker Fallback Returns Wrong Type
- **Risk:** Circuit breaker fallback returns `{ error, circuitOpen }` but function expects full success type
- **Files:** `src/lib/circuit-breaker.ts` (lines 84-88)
- **Impact:** Uncaught type errors if callers don't check `circuitOpen` flag
- **Migration plan:** Use `Result<T, CircuitBreakerError>` return type instead of fallback casting

## Missing Critical Features

### No Audit Trail for Data Mutations
- **Problem:** Prospect enrichment, list operations, tag changes don't log full payload
- **Blocks:** Compliance questions like "what data changed?" or "who enriched this prospect?"
- **Affected areas:** Enrichment pipeline, list member operations, prospect profile updates
- **Recommendation:** Implement event sourcing for critical mutations with timestamp + user context

### No Background Job Visibility for Users
- **Problem:** Enrichment queued via Inngest but user can't see job status or ETA
- **Blocks:** Users wondering "is enrichment running?" or "why isn't it done yet?"
- **Affected areas:** Research panel, enrichment tab, bulk enrich modal
- **Recommendation:** Add `/api/prospects/[prospectId]/enrichment/status` endpoint returning job queue position

### No Rollback Mechanism for Bulk Operations
- **Problem:** Bulk enrichment or bulk list operations can't be undone
- **Blocks:** Users can't recover from accidental bulk changes
- **Affected areas:** Bulk enrich, bulk add-to-list, bulk tag operations
- **Recommendation:** Implement undo queue per tenant (Redis) with 24h TTL

## Test Coverage Gaps

### Enrichment Pipeline Integration Not Tested End-to-End
- **What's not tested:** Full enrichment flow (search → upsert → Inngest → update) with real API responses
- **Files:** `src/inngest/functions/__tests__/enrich-prospect.test.ts` mocks all APIs
- **Risk:** Integration bugs at API boundaries surface only in production
- **Priority:** High — enrichment is revenue-critical
- **Recommendation:**
  1. Add integration test for ContactOut+Exa path (use APOLLO_MOCK_ENRICHMENT)
  2. Add integration test for EDGAR lookup with real CIK matching
  3. Test error scenarios: ContactOut 404, Exa rate limit, EDGAR timeout

### Apollo Search Caching Logic Not Tested
- **What's not tested:** Cache hit/miss, filter normalization edge cases, pagination
- **Files:** `src/lib/apollo/client.ts` (lines 154-227) — no visible tests
- **Risk:** Cache bugs surface as stale results or pagination breaks
- **Priority:** Medium — affects UX but not critical
- **Recommendation:**
  1. Test cache key generation with dash/comma format mixes
  2. Test pagination across cache boundaries
  3. Test cache TTL expiration behavior

### Research Panel Session Management Not Tested
- **What's not tested:** Session loading, history persistence, message rendering phases
- **Files:** `src/components/prospect/research-panel.tsx` — no visible component tests
- **Risk:** Stale session data, broken streaming states, UI crashes on edge cases
- **Priority:** Medium
- **Recommendation:**
  1. Add component snapshot tests for all StreamPhase states
  2. Test session loading lifecycle
  3. Test message deduplication logic

### List Member Null Join Behavior Not Tested
- **What's not tested:** Prospect deletion while in list, null joins, member count sync
- **Files:** `src/lib/lists/queries.ts` (lines 131-219) — no visible tests
- **Risk:** Silent data loss, incorrect member counts, orphaned records
- **Priority:** High — data integrity concern
- **Recommendation:**
  1. Test getListMembers with deleted prospect (null join)
  2. Test syncListMemberCount accuracy
  3. Test cascade delete vs. soft delete behavior

---

*Concerns audit: 2026-04-05*
