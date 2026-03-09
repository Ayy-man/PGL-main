---
phase: 03-enrich-ship
plan: 01
subsystem: infrastructure
tags: [inngest, database, background-jobs, activity-logging, enrichment]
dependency_graph:
  requires: [phase-02]
  provides: [inngest-client, inngest-serve-endpoint, activity-log-table, usage-metrics-table, enrichment-schema]
  affects: [enrichment-workflows, metrics-aggregation]
tech_stack:
  added: [inngest@3.51.0]
  patterns: [event-driven-architecture, partitioned-tables, RLS-tenant-isolation]
key_files:
  created:
    - src/inngest/types.ts
    - src/inngest/client.ts
    - src/app/api/inngest/route.ts
    - supabase/migrations/20260208_phase3_schema.sql
  modified:
    - src/app/api/activity/route.ts
    - src/lib/circuit-breaker.ts
    - src/lib/enrichment/edgar.ts
decisions:
  - Inngest chosen for background job orchestration (event-driven, reliable, built-in retries)
  - Activity log partitioned by month for performance (BRIN indexes efficient for time-series)
  - RLS tenant isolation using current_setting with missing_ok=true for safety
  - EventSchemas pattern for type-safe Inngest events
metrics:
  duration_minutes: 18
  tasks_completed: 2
  commits: 2
  files_created: 4
  files_modified: 3
  deviations: 4
  completed_at: "2026-02-09T17:41:41Z"
---

# Phase 3 Plan 1: Inngest + Phase 3 Schema Summary

**One-liner:** Background job infrastructure with Inngest client/serve endpoint and Phase 3 database schema for partitioned activity logging, daily usage metrics, and enrichment data storage.

## Overview

This plan established the foundation for Phase 3 by setting up Inngest for background job orchestration and creating the database schema to support activity logging, usage metrics aggregation, and prospect enrichment workflows.

## Tasks Completed

### Task 1: Inngest Client, Event Types, and Serve Endpoint

**Objective:** Install Inngest and create typed client with serve endpoint.

**Implementation:**
- Installed `inngest@3.51.0` package
- Created `src/inngest/types.ts` with event definitions:
  - `prospect/enrich.requested` — payload includes prospectId, tenantId, userId, email, linkedinUrl, name, company, title, isPublicCompany, companyCik
  - `metrics/aggregate.daily` — payload includes date (YYYY-MM-DD format)
- Created `src/inngest/client.ts` with typed Inngest client using EventSchemas pattern for type safety
- Created `src/app/api/inngest/route.ts` serving GET, POST, PUT endpoints with empty functions array (functions will be added in Plans 04 and 06)

**Verification:** Build passed with Inngest route visible in build output.

**Commit:** `0b456e1`

---

### Task 2: Phase 3 Database Schema Migration

**Objective:** Create SQL migration with activity_log, usage_metrics_daily, and enrichment columns.

**Implementation:**

**1. activity_log Table (Partitioned by created_at):**
- Created parent table with 11 action types: login, search_executed, profile_viewed, profile_enriched, add_to_list, remove_from_list, status_updated, note_added, csv_exported, persona_created, lookalike_search
- Created monthly partitions for 2026-02 through 2026-06
- Added per-partition indexes:
  - BRIN index on `created_at` (efficient for time-series)
  - B-tree composite index on `(tenant_id, action_type, created_at DESC)`
  - B-tree index on `(user_id, created_at DESC)`
  - GIN index on `metadata` JSONB
- Enabled RLS with tenant isolation policy

**2. usage_metrics_daily Table:**
- Created aggregation table with columns: date, tenant_id, user_id, total_logins, searches_executed, profiles_viewed, profiles_enriched, csv_exports, lists_created
- Added UNIQUE constraint on `(date, tenant_id, user_id)` to prevent duplicate aggregations
- Created indexes on `(tenant_id, date DESC)` and `(date DESC)`
- Enabled RLS with tenant isolation policy

**3. Enrichment Columns on prospects Table:**
- Added columns (idempotent using DO $$ blocks):
  - `enrichment_status` (enum: pending, in_progress, complete, failed)
  - `last_enriched_at` (timestamp)
  - `contact_data` (JSONB - ContactOut results)
  - `web_data` (JSONB - Exa results)
  - `insider_data` (JSONB - SEC EDGAR Form 4 transactions)
  - `ai_summary` (TEXT - Claude-generated summary)
  - `enrichment_source_status` (JSONB - per-source status tracking: { contactout: 'complete', exa: 'pending', sec: 'failed', claude: 'pending' })
- Created index on `enrichment_status` for filtering
- Enabled RLS with tenant isolation policy (if not already enabled)

**Safety Features:**
- All `current_setting` calls use `true` for `missing_ok` parameter to prevent errors when setting not configured
- Idempotent column additions using `information_schema.columns` checks
- Idempotent policy creation using `pg_policies` checks

**Verification:** SQL file validated with correct structure (222 lines, 11 action types, unique constraint, 3 RLS policies).

**Commit:** `3cebe32`

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript iterator error in edgar.ts**
- **Found during:** Task 1 build verification
- **Issue:** `matchAll()` returns RegExpStringIterator which requires downlevelIteration flag or ES2015+ target
- **Fix:** Wrapped iterator with `Array.from(xml.matchAll(transactionRegex))` for compatibility
- **Files modified:** `src/lib/enrichment/edgar.ts`
- **Commit:** `0b456e1`

**2. [Rule 1 - Bug] Fixed ESLint no-explicit-any errors in circuit-breaker.ts**
- **Found during:** Task 1 build verification
- **Issue:** ESLint errors for `any[]` type parameters in generic functions
- **Fix:** Changed `any[]` to `unknown[]` for type parameters in `createCircuitBreaker` and `withCircuitBreaker`
- **Files modified:** `src/lib/circuit-breaker.ts`
- **Commit:** `0b456e1`

**3. [Rule 1 - Bug] Fixed ESLint no-explicit-any error in activity route**
- **Found during:** Task 1 build verification
- **Issue:** Type assertion `type as any` in array filter
- **Fix:** Changed to `type as (typeof ACTION_TYPES)[number]` for proper type narrowing
- **Files modified:** `src/app/api/activity/route.ts`
- **Commit:** `0b456e1`

**4. [Rule 3 - Blocking] Added missing dependencies**
- **Found during:** Task 1 build verification
- **Issue:** Build failed with "Module not found" errors for `tailwind-merge` and `debug`
- **Fix:** Added `tailwind-merge@3.4.0` and `debug@4.4.3` to dependencies (pre-existing usage in codebase)
- **Files modified:** `package.json`
- **Commit:** `0b456e1`

---

## Key Decisions

1. **Inngest for background jobs:** Chosen for reliable event-driven job orchestration with built-in retries, observability, and Next.js integration.

2. **Monthly table partitioning:** Activity log partitioned by month (Feb-Jun 2026) for query performance and efficient data management.

3. **BRIN indexes on time-series data:** Used BRIN indexes on `created_at` columns for space efficiency and good performance on append-only time-series data.

4. **Composite indexes for filtered queries:** Created `(tenant_id, action_type, created_at DESC)` indexes to optimize common query patterns (filtering by tenant + action type + time range).

5. **EventSchemas pattern:** Used Inngest's `EventSchemas().fromRecord<Events>()` pattern for compile-time type safety on event payloads.

6. **current_setting with missing_ok:** All RLS policies use `current_setting('app.current_tenant_id', true)` with the `true` parameter to prevent errors when the setting hasn't been set yet.

---

## Artifacts Delivered

### Code

- **src/inngest/types.ts** — Event type definitions (prospect/enrich.requested, metrics/aggregate.daily)
- **src/inngest/client.ts** — Typed Inngest client instance
- **src/app/api/inngest/route.ts** — Inngest serve endpoint (GET, POST, PUT)

### Database

- **supabase/migrations/20260208_phase3_schema.sql** — Phase 3 schema:
  - Partitioned activity_log table with 11 action types
  - usage_metrics_daily aggregation table
  - Enrichment columns on prospects table
  - RLS policies and indexes

---

## Verification Results

### Build Status

✅ `pnpm build` passed successfully
- All TypeScript compilation succeeded
- Inngest route visible in build output: `ƒ /api/inngest`
- No blocking errors (env variable warnings expected)

### SQL Validation

✅ Migration file validated:
- 222 lines of SQL
- 8 CREATE TABLE statements (parent + 5 partitions + 2 tables)
- 11 action types in CHECK constraint
- UNIQUE constraint on (date, tenant_id, user_id)
- 3 RLS policies created
- All partitions indexed correctly

---

## Self-Check

**Files Created:**
- ✅ `src/inngest/types.ts` — FOUND
- ✅ `src/inngest/client.ts` — FOUND
- ✅ `src/app/api/inngest/route.ts` — FOUND
- ✅ `supabase/migrations/20260208_phase3_schema.sql` — FOUND

**Commits:**
- ✅ `0b456e1` — Task 1 commit (Inngest infrastructure)
- ✅ `3cebe32` — Task 2 commit (database schema)

**Build Verification:**
- ✅ `/api/inngest` route present in build output
- ✅ No TypeScript or ESLint errors
- ✅ All imports resolve correctly

## Self-Check: PASSED

---

## Success Criteria Met

✅ Inngest client is typed with event definitions
✅ Serve endpoint exports GET/POST/PUT
✅ Build passes without errors
✅ activity_log table defined with PARTITION BY RANGE, RLS enabled, all 11 action types in CHECK constraint
✅ usage_metrics_daily has UNIQUE constraint on (date, tenant_id, user_id)
✅ prospects table enrichment columns are added
✅ All tables have RLS policies

---

## Next Steps

**Ready for Phase 3 Plan 2-3:** ContactOut and Exa enrichment API clients can now be built on this infrastructure.

**Ready for Phase 3 Plan 4:** Enrichment workflow can register Inngest functions using the typed client.

**Ready for Phase 3 Plan 6:** Daily metrics aggregation can use the activity_log and usage_metrics_daily tables.

**User action required:** Configure Inngest environment variables:
- `INNGEST_EVENT_KEY` (from Inngest Dashboard → Manage → Event Keys)
- `INNGEST_SIGNING_KEY` (from Inngest Dashboard → Manage → Signing Keys)

---

## Performance

- **Duration:** 18 minutes
- **Tasks:** 2/2 completed
- **Commits:** 2 (atomic per task)
- **Files created:** 4
- **Files modified:** 3 (deviations)
- **Build time:** ~45 seconds
