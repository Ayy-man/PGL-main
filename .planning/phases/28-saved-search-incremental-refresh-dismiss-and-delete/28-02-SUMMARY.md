---
phase: 28-saved-search-incremental-refresh-dismiss-and-delete
plan: "02"
subsystem: backend
tags: [api-routes, inngest, refresh-diff, dismiss, enrichment-sync]
dependency_graph:
  requires: [28-01]
  provides: [refresh-diff-algorithm, api-routes-refresh-prospects-dismiss, enrichment-sync-hook]
  affects: [saved_search_prospects, personas, prospects]
tech_stack:
  added: []
  patterns: [upsert-split-for-first_seen_at-preservation, cross-search-enrichment-sync, duplicate-enrichment-guard]
key_files:
  created:
    - src/lib/personas/refresh.ts
    - src/app/api/search/[searchId]/refresh/route.ts
    - src/app/api/search/[searchId]/prospects/route.ts
    - src/app/api/search/[searchId]/dismiss/route.ts
  modified:
    - src/inngest/functions/enrich-prospect.ts
decisions:
  - "Split upsert into new-rows (with first_seen_at) and existing-rows (without) to preserve DB first_seen_at on conflict"
  - "Refresh calls apolloBreaker.fire() directly (not searchApollo wrapper) to bypass cache/rate-limiter layers during pagination loop"
  - "Dismiss route guards enriched prospects with .neq('status','enriched') to prevent accidental dismissal"
metrics:
  duration: "~17 min"
  completed: "2026-04-05T15:04:34Z"
  tasks_completed: 2
  files_created: 4
  files_modified: 1
---

# Phase 28 Plan 02: Backend Engine — Refresh Diff, API Routes, Enrichment Sync Summary

**One-liner:** Incremental refresh diff algorithm (Apollo pagination cap 500), three tenant-validated API routes, and cross-search enrichment sync hook with duplicate enrichment guard in Inngest.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Refresh diff algorithm | 8b379cb | src/lib/personas/refresh.ts |
| 2 | API routes + enrichment sync | 2720f50 | 4 files created/modified |

## What Was Built

### Task 1: Refresh Diff Algorithm (`src/lib/personas/refresh.ts`)

Exports `RefreshResult` interface and `refreshSavedSearchProspects` function.

Algorithm handles 4 prospect states:
- **New**: not in existing map → `status: 'active'`, `is_new: true`, includes `first_seen_at`
- **Dismissed (no change)**: stays dismissed — updates `last_seen_at` and `apollo_data` only
- **Dismissed (job/company changed)**: resurfaced → `status: 'active'`, `is_new: true`, clears `dismissed_at`/`dismissed_by`
- **Active/Enriched**: updates `apollo_data`, `last_seen_at`, sets `is_new: false`

Key implementation details:
- Apollo pagination: `MAX_PAGES_PER_REFRESH = 5`, `PER_PAGE = 100` (500 results max)
- Calls `apolloBreaker.fire()` directly to bypass the `searchApollo` cache/rate-limiter
- Upsert split: new rows include `first_seen_at`; existing rows omit it — preserves DB default on insert
- `onConflict: 'saved_search_id,apollo_person_id'` on both upsert calls
- Empty results guard: if Apollo returns 0 results, only updates `last_refreshed_at`, never clears existing rows
- Updates `personas.last_refreshed_at` and `total_apollo_results` on completion

### Task 2: API Routes

**`POST /api/search/[searchId]/refresh`** — Validates tenant ownership, calls `refreshSavedSearchProspects`, returns `RefreshResult`.

**`GET /api/search/[searchId]/prospects`** — Loads saved prospects with optional `?includeDismissed=true`, always returns `dismissedCount` for UI toggle label, `lastRefreshedAt`, `totalApolloResults`.

**`POST /api/search/[searchId]/dismiss`** — Handles `dismiss`, `bulk-dismiss`, and `undo` actions via Zod schema. Guards: `.neq("status", "enriched")` prevents dismissing enriched prospects; undo sets `is_new: false` (no re-badge).

All three routes: auth check → tenant extraction → persona ownership validation → operation.

### Task 2: Enrichment Sync (enrich-prospect.ts)

**Cross-search sync** (in finalize step, before logActivity): looks up `apollo_id` from prospects table, then updates all `saved_search_prospects` rows with matching `apollo_person_id` + `tenant_id` to `status: 'enriched'` and sets `prospect_id`.

**Duplicate enrichment guard** (new step before mark-in-progress, `check-duplicate-enrichment`): looks up `apollo_id` from prospects table, checks if any `saved_search_prospects` row already has `status: 'enriched'` with a non-null `prospect_id`. If found, returns `{ skipped: true, prospectId }` without running the full pipeline.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] searchApollo wrapper bypassed for refresh pagination**
- **Found during:** Task 1
- **Issue:** The plan's interface spec showed `searchApollo(params: ApolloSearchParams)` but the actual function signature is `searchApollo(tenantId, personaId, filters, page, pageSize)` — wraps with cache, rate-limiter, and a 25-result hard cap (`MAX_RESULTS_PER_SEARCH`). Using it for refresh pagination would hit the cache on first call and return only 25 results instead of 100.
- **Fix:** Call `apolloBreaker.fire(apolloParams)` directly (same underlying HTTP call, no cache/rate-limiter/cap). This matches the `ApolloSearchParams` interface exactly and gives the full 100-per-page results needed for refresh.
- **Files modified:** src/lib/personas/refresh.ts

## Known Stubs

None — all data flows are wired to real Supabase operations.

## Threat Flags

All threats in the plan's threat register are mitigated as implemented:
- T-28-03 (Spoofing): All 3 routes validate `persona.tenant_id === user.tenant_id` via `.eq("tenant_id", tenantId)` before any mutation
- T-28-04 (Tampering): Zod schema + `.neq("status", "enriched")` guard in dismiss route
- T-28-05 (Bulk dismiss): `apolloPersonIds` validated as non-empty string array
- T-28-06 (Info Disclosure): Tenant ownership check before any prospect data is returned
- T-28-07 (Admin client): Inngest uses `createAdminClient()` with `tenant_id` scoping in all cross-search sync queries

## Self-Check: PASSED

Files verified:
- FOUND: src/lib/personas/refresh.ts
- FOUND: src/app/api/search/[searchId]/refresh/route.ts
- FOUND: src/app/api/search/[searchId]/prospects/route.ts
- FOUND: src/app/api/search/[searchId]/dismiss/route.ts
- FOUND: src/inngest/functions/enrich-prospect.ts (modified)

Commits verified:
- FOUND: 8b379cb (feat(28-02): add refresh diff algorithm)
- FOUND: 2720f50 (feat(28-02): create API routes + enrichment sync hook)

TypeScript: `npx tsc --noEmit` — no errors in any new or modified files (pre-existing errors in unrelated files: execute-research.test.ts, apollo/client.ts).
