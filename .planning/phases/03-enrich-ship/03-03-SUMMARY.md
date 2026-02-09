---
phase: 03-enrich-ship
plan: 03
subsystem: enrichment-infrastructure
tags:
  - circuit-breaker
  - api-clients
  - resilience
  - enrichment
dependency_graph:
  requires:
    - opossum (circuit breaker library)
    - inngest (workflow orchestration)
  provides:
    - src/lib/circuit-breaker.ts (reusable circuit breaker factory)
    - src/lib/enrichment/contactout.ts (personal contact enrichment)
    - src/lib/enrichment/exa.ts (web presence + wealth signals)
    - src/lib/enrichment/edgar.ts (SEC insider transactions)
  affects:
    - Plan 04 (Inngest enrichment workflow will consume these clients)
tech_stack:
  added:
    - opossum@9.0.0 (circuit breaker pattern implementation)
    - inngest@3.51.0 (missing dependency - was used but not declared)
  patterns:
    - Circuit Breaker pattern for external API resilience
    - Rate limiting for SEC EDGAR compliance (150ms between requests)
    - Higher-order functions for circuit breaker wrapping
    - Regex-based XML parsing (simplified Form 4 parser)
key_files:
  created:
    - src/lib/circuit-breaker.ts (242 lines)
    - src/lib/enrichment/contactout.ts (121 lines)
    - src/lib/enrichment/exa.ts (202 lines)
    - src/lib/enrichment/edgar.ts (276 lines)
  modified:
    - package.json (added opossum, @types/opossum, inngest)
    - pnpm-lock.yaml (dependency tree updated)
decisions:
  - Use opossum for circuit breaker (Node.js standard, battle-tested)
  - 50% error threshold, 30s reset for general APIs
  - 15s timeout for Exa and Edgar (slower endpoints)
  - 60s reset for Edgar (SEC rate limits require longer cooldown)
  - Regex-based Form 4 XML parsing (avoids heavy XML parser dependencies)
  - Simplified wealth signal extraction (keyword matching in content)
metrics:
  duration: 11 min
  tasks_completed: 2
  files_created: 4
  commits: 2
  lines_added: 841
  completed_date: 2026-02-09
---

# Phase 03 Plan 03: Circuit Breaker Infrastructure + Enrichment Clients Summary

**One-liner:** Circuit breaker factory with three enrichment API clients (ContactOut for personal contact info, Exa.ai for web presence/wealth signals, SEC EDGAR for insider transactions).

## What Was Built

### Circuit Breaker Infrastructure

Created reusable circuit breaker factory using opossum library:

- **Default configuration**: 50% error threshold, 30s reset, 10s timeout
- **`createCircuitBreaker<T>`**: Factory function for creating breaker instances with event logging
- **`withCircuitBreaker<TArgs, TResult>`**: HOF for wrapping async functions with automatic fallback
- **Fallback behavior**: Returns `{ error: 'Service temporarily unavailable', circuitOpen: true }` when circuit is open

### ContactOut Client (`src/lib/enrichment/contactout.ts`)

Personal email and phone enrichment from LinkedIn URL or work email:

- **Input**: `{ email?: string; linkedinUrl?: string }`
- **Output**: `{ found: boolean; personalEmail?: string; phone?: string }`
- **Error handling**:
  - 404 → Not found (person not in ContactOut database)
  - 429 → Rate limit with Retry-After header
- **Circuit breaker**: 10s timeout, standard config

### Exa.ai Client (`src/lib/enrichment/exa.ts`)

Web presence and wealth signal detection:

- **Input**: `{ name: string; company: string; title?: string }`
- **Output**: News mentions + extracted wealth signals
- **Wealth keywords**: funding, acquisition, IPO, exit, billion, million, net worth, board, investor, raised
- **Signal extraction**: Contextual snippets (150 chars around keyword)
- **Search query**: `"Name" "Company" executive OR founder OR investor`
- **Circuit breaker**: 15s timeout (Exa can be slow), standard reset

### SEC EDGAR Client (`src/lib/enrichment/edgar.ts`)

Form 4 insider transaction data for public company executives:

- **Input**: `{ cik: string; name: string }` (CIK = Central Index Key)
- **Output**: Up to 30 recent insider transactions with shares, price, total value
- **Rate limiting**: 150ms between requests (~6.67/sec, well under SEC's 10/sec limit)
- **Form 4 XML parsing**: Regex-based extraction of transaction details
- **Transaction types**: Purchase (P), Sale (S), Award (A)
- **User-Agent requirement**: SEC mandates contact info in header (enforced via `SEC_EDGAR_USER_AGENT` env var)
- **Circuit breaker**: 15s timeout, 60s reset (longer cooldown for SEC rate limits)
- **Error handling**: 404 → CIK not found (company not public)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added inngest dependency**
- **Found during:** Task 1 verification
- **Issue:** Plan 03-02 added inngest code (`src/inngest/client.ts`, `src/app/api/inngest/route.ts`) but didn't add the dependency to package.json. Build failed with "Module not found: Can't resolve 'inngest'"
- **Fix:** Added `inngest@3.51.0` to package.json
- **Files modified:** package.json, pnpm-lock.yaml
- **Commit:** 6366ca7

## User Setup Required

Before enrichment clients can be used, set these environment variables:

### ContactOut API
```bash
CONTACTOUT_API_KEY=<key>  # From: ContactOut Dashboard → API → API Key
```

### Exa.ai API
```bash
EXA_API_KEY=<key>  # From: Exa.ai Dashboard → API Keys
```

### SEC EDGAR API
```bash
SEC_EDGAR_USER_AGENT="AppName admin@email.com"  # Required by SEC - must include contact info
```

All three clients return structured errors when API keys are missing (they don't throw).

## Technical Highlights

### Circuit Breaker Pattern

All three clients use the same resilience pattern:

```typescript
export const enrichContactOut = withCircuitBreaker(
  enrichContactOutInternal,
  { name: 'contactout' }
);
```

Benefits:
- **Fail-fast**: When external API is down, circuit opens and requests fail immediately
- **Automatic recovery**: Circuit closes after successful test request (half-open → closed)
- **Observability**: State changes logged to console (open, halfOpen, close)

### SEC EDGAR Rate Limiting

Implemented respectful rate limiting as required by SEC:

```typescript
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 150; // 150ms = 6.67/sec (under 10/sec limit)

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}
```

This ensures we never exceed SEC's 10 requests/second limit.

### Simplified Form 4 XML Parsing

Used regex-based extraction instead of adding XML parser dependency:

```typescript
const transactionRegex = /<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/g;
const codeMatch = txBlock.match(/<transactionCode>([A-Z])<\/transactionCode>/);
const sharesMatch = txBlock.match(/<transactionShares>\s*<value>([\d.]+)<\/value>/);
```

Trade-offs:
- **Pro**: No heavy dependencies, works for common Form 4 structures
- **Con**: May miss edge cases in complex filings
- **Future**: Can enhance with full XML parser if needed

## Verification

All tasks completed:
- [x] Circuit breaker factory created with reusable exports
- [x] ContactOut client handles enrichment, 404s, rate limits
- [x] Exa.ai client searches web and extracts wealth signals
- [x] SEC EDGAR client fetches Form 4 transactions with XML parsing
- [x] All three clients wrapped with circuit breakers
- [x] Rate limiting implemented for SEC EDGAR compliance
- [x] User-Agent header enforced for SEC requests

## Files Modified

| File | Change | Lines | Commit |
|------|--------|-------|--------|
| src/lib/circuit-breaker.ts | Created | +95 | 6366ca7 |
| src/lib/enrichment/contactout.ts | Created | +121 | 6366ca7 |
| src/lib/enrichment/exa.ts | Created | +202 | cb73cf5 |
| src/lib/enrichment/edgar.ts | Created | +276 | cb73cf5 |
| package.json | Modified (add deps) | +3 | 6366ca7 |
| pnpm-lock.yaml | Modified (lockfile) | +2147 | 6366ca7 |

## Next Steps

These enrichment clients are ready to be consumed by the Inngest enrichment workflow in Plan 04. The workflow will:

1. Trigger enrichment based on lazy strategy (on-demand)
2. Call each client with prospect data
3. Store enrichment results in database
4. Handle circuit breaker failures gracefully

## Self-Check

Verifying all created files exist:

```bash
[ -f "src/lib/circuit-breaker.ts" ] && echo "FOUND: src/lib/circuit-breaker.ts" || echo "MISSING"
[ -f "src/lib/enrichment/contactout.ts" ] && echo "FOUND: src/lib/enrichment/contactout.ts" || echo "MISSING"
[ -f "src/lib/enrichment/exa.ts" ] && echo "FOUND: src/lib/enrichment/exa.ts" || echo "MISSING"
[ -f "src/lib/enrichment/edgar.ts" ] && echo "FOUND: src/lib/enrichment/edgar.ts" || echo "MISSING"
```

Verifying commits exist:

```bash
git log --oneline --all | grep -q "6366ca7" && echo "FOUND: 6366ca7" || echo "MISSING"
git log --oneline --all | grep -q "cb73cf5" && echo "FOUND: cb73cf5" || echo "MISSING"
```

## Self-Check: PASSED

All files verified:
- FOUND: src/lib/circuit-breaker.ts
- FOUND: src/lib/enrichment/contactout.ts
- FOUND: src/lib/enrichment/exa.ts
- FOUND: src/lib/enrichment/edgar.ts

All commits verified:
- FOUND: 6366ca7 (circuit breaker + ContactOut)
- FOUND: cb73cf5 (Exa + Edgar)
