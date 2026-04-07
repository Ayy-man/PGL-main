---
phase: 30-admin-global-api-keys-management-view-rotate-and-test-all-ex
plan: "01"
subsystem: platform-config
tags: [supabase, feature-flags, platform-config, apollo, mock-mode]
dependency_graph:
  requires: []
  provides: [platform_config-table, getPlatformConfig, setPlatformConfig, isApolloMockMode]
  affects: [src/app/api/apollo/bulk-enrich/route.ts]
tech_stack:
  added: [src/lib/platform-config/index.ts, src/types/platform-config.ts]
  patterns: [db-backed-feature-flags, in-memory-cache-with-ttl, env-var-fallback]
key_files:
  created:
    - supabase/migrations/20260407_platform_config.sql
    - src/types/platform-config.ts
    - src/lib/platform-config/index.ts
  modified:
    - src/app/api/apollo/bulk-enrich/route.ts
decisions:
  - "DB takes precedence over env var for apollo_mock_enrichment to enable runtime toggle"
  - "30s TTL in-memory cache prevents DB hammering on hot paths"
  - "createAdminClient() used for platform_config reads — bypasses RLS for server-side config"
metrics:
  duration: "~4 min"
  completed: "2026-04-07T15:16:17Z"
  tasks: 2
  files: 4
---

# Phase 30 Plan 01: Platform Config — DB-backed runtime feature flags

DB-backed key/value `platform_config` table with typed TS helpers, 30s in-memory cache, and env-var fallback; Apollo bulk-enrich route migrated to use `isApolloMockMode()` runtime check.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Create platform_config migration + types + config helper | 9827ae0 | supabase/migrations/20260407_platform_config.sql, src/types/platform-config.ts, src/lib/platform-config/index.ts |
| 2 | Migrate Apollo bulk-enrich to DB-backed isApolloMockMode() | a415458 | src/app/api/apollo/bulk-enrich/route.ts |

## What Was Built

A runtime-configurable `platform_config` key/value table that lets super admins toggle feature flags (starting with `APOLLO_MOCK_ENRICHMENT`) without a Vercel redeploy.

**Migration (`supabase/migrations/20260407_platform_config.sql`):**
- `CREATE TABLE IF NOT EXISTS platform_config` with TEXT primary key, JSONB value, description, timestamps
- `ENABLE ROW LEVEL SECURITY` (policies must be added in Supabase dashboard)
- Seeds `apollo_mock_enrichment` key with default `false`

**Types (`src/types/platform-config.ts`):**
- `PlatformConfigKey` union type (currently `"apollo_mock_enrichment"`)
- `PlatformConfigRow` interface matching table schema
- `PlatformConfigMap` mapping each key to its typed value

**Config helper (`src/lib/platform-config/index.ts`):**
- `getPlatformConfig(key)` — typed getter with 30s TTL in-memory cache
- `setPlatformConfig(key, value, updatedBy?)` — typed setter that busts cache on write
- `isApolloMockMode()` — DB-first check, falls back to `APOLLO_MOCK_ENRICHMENT` env var

**Updated route (`src/app/api/apollo/bulk-enrich/route.ts`):**
- Removed module-level `const USE_MOCK_ENRICHMENT = process.env.APOLLO_MOCK_ENRICHMENT === "true"`
- Added `import { isApolloMockMode } from "@/lib/platform-config"`
- Replaced with `const useMock = await isApolloMockMode()` inside POST handler
- Updated comment block to document DB-backed resolution order

## Deviations from Plan

None — plan executed exactly as written.

## Pending Manual Steps

**RLS policies must be added in Supabase dashboard** for `platform_config` table:
- SELECT policy: `auth.jwt() ->> 'role' = 'super_admin'`
- INSERT/UPDATE/DELETE policy: `auth.jwt() ->> 'role' = 'super_admin'`

**Migration must be pushed to Supabase:**
- Run `pnpm supabase db push` or paste migration SQL in Supabase SQL editor

## Known Stubs

None — no placeholder data or UI stubs in this plan.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: rls-manual | supabase/migrations/20260407_platform_config.sql | platform_config table has RLS enabled but policies are NOT applied in migration — must be configured in Supabase dashboard before table is safe for multi-user access |

## Self-Check

Checking that all created files exist and commits are recorded:

- supabase/migrations/20260407_platform_config.sql — FOUND
- src/types/platform-config.ts — FOUND
- src/lib/platform-config/index.ts — FOUND
- src/app/api/apollo/bulk-enrich/route.ts — FOUND (modified)
- commit 9827ae0 — FOUND
- commit a415458 — FOUND

## Self-Check: PASSED
