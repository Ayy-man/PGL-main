---
phase: quick
plan: 01
subsystem: enrichment
tags: [sec-edgar, redis, caching, efts, inngest]
dependency_graph:
  requires: []
  provides: [edgar-redis-cache, edgar-rebrand-aliases, edgar-owner-filter, edgar-efts-search, edgar-efts-fallback]
  affects: [enrichment-pipeline, prospect-insider-data]
tech_stack:
  added: []
  patterns: [redis-cache-aside, circuit-breaker, efts-name-search]
key_files:
  created: []
  modified:
    - src/lib/enrichment/edgar.ts
    - src/inngest/functions/enrich-prospect.ts
decisions:
  - "Used Array.from(matchAll()) instead of direct for-of on iterator to comply with tsconfig target"
  - "EFTS-only path added for non-public prospects: when no CIK but name exists, skip CIK path entirely"
  - "Fire-and-forget Redis write (catch silently) so cache failure never blocks enrichment"
metrics:
  duration: ~8min
  completed: 2026-04-06
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 260406-wbo: Fix SEC EDGAR Filings Enrichment for More Matches Summary

**One-liner:** Redis-cached ticker lookup, brand-name alias table, owner-filtered Form 4 parsing, and EFTS person-name search fallback in the SEC EDGAR enrichment pipeline.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Redis cache, rebrand aliases, owner-filtered Form 4 parsing | 425554d | src/lib/enrichment/edgar.ts |
| 2 | enrichEdgarByName + EFTS fallback wiring | aa2cb18 | src/lib/enrichment/edgar.ts, src/inngest/functions/enrich-prospect.ts |

## What Was Built

### Task 1: edgar.ts improvements

**Redis caching for company_tickers.json**
- `lookupCompanyCik` now checks Redis key `edgar:tickers:v1` before fetching the ~10MB JSON from SEC
- Cache TTL: 24 hours. Fire-and-forget write on miss
- Redis failures fall through to live fetch — enrichment never blocked by cache unavailability

**Rebrand / alias table (`COMPANY_ALIASES`)**
- Resolves common brand names to SEC legal entity names before fuzzy matching
- Examples: Google → "alphabet inc", Facebook → "meta platforms inc", Twitter → "x corp"
- Private subsidiaries (Instagram, WhatsApp, YouTube, AWS sub-entities) return `null` immediately, skipping the full ticker scan

**Owner-filtered Form 4 parsing (`parseForm4Xml`)**
- New optional `ownerName` parameter
- Extracts `<rptOwnerName>` tags from XML before processing transactions
- Filters filings where fewer than 2 name tokens overlap — prevents returning other insiders' transactions
- `enrichEdgarInternal` passes `params.name` through to `parseForm4Xml`

### Task 2: EFTS name search + pipeline wiring

**`enrichEdgarByName` (new export in edgar.ts)**
- Searches EFTS endpoint `https://efts.sec.gov/LATEST/search-index` by quoted person name
- Filters to Form 4 hits, fetches filing index HTML to locate XML document URL
- Parses XML with `parseForm4Xml(xml, name)` for owner-filtered transactions
- Wrapped with circuit breaker (20s timeout, 60s reset), same pattern as `enrichEdgar`

**fetch-edgar step restructure in enrich-prospect.ts**
- Import updated: `enrichEdgar, lookupCompanyCik, enrichEdgarByName`
- Early-return condition changed from `!effectiveIsPublic || !effectiveCik` to `!effectiveIsPublic && !name` — allows EFTS path for non-public prospects
- New EFTS-only path: when no CIK but name exists, calls `enrichEdgarByName` directly, saves results to `insider_data` and `prospect_signals`
- EFTS fallback after CIK path: if `enrichEdgar` returns 0 transactions, tries `enrichEdgarByName` and merges results if found

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error: matchAll iterator requires downlevelIteration**
- **Found during:** Task 1 verification (tsc --noEmit)
- **Issue:** Direct `for (const m of xml.matchAll(...))` fails with TS2802 because tsconfig target doesn't have `downlevelIteration` enabled
- **Fix:** Wrapped in `Array.from(xml.matchAll(ownerRegex))` — same pattern the original code used for `transactionRegex`
- **Files modified:** src/lib/enrichment/edgar.ts
- **Commit:** 425554d (fix applied inline before commit)

## Known Stubs

None — all data paths are wired to real SEC EDGAR endpoints.

## Threat Flags

None — no new network endpoints or auth paths introduced beyond what the plan's threat model already covers. EFTS URL construction uses only alphanumeric accession numbers in string templates pointing to sec.gov domains (T-quick-03 mitigated).

## Self-Check: PASSED

- src/lib/enrichment/edgar.ts: modified (COMPANY_ALIASES, Redis cache, rptOwnerName filter, enrichEdgarByName) — confirmed
- src/inngest/functions/enrich-prospect.ts: modified (import + EFTS paths) — confirmed
- Commit 425554d: present
- Commit aa2cb18: present
- `npx tsc --noEmit` on both files: 0 errors
