---
phase: 30-admin-global-api-keys-management-view-rotate-and-test-all-ex
plan: "02"
subsystem: admin-api
tags: [api-routes, security, platform-config, circuit-breaker]
dependency_graph:
  requires: [30-01]
  provides: [GET /api/admin/api-keys, POST /api/admin/api-keys/config]
  affects: [30-04-UI]
tech_stack:
  added: []
  patterns: [discriminated-union-zod, server-side-secret-masking, circuit-breaker-state-inspection]
key_files:
  created:
    - src/types/admin-api-keys.ts
    - src/app/api/admin/api-keys/route.ts
    - src/app/api/admin/api-keys/config/route.ts
  modified: []
decisions:
  - maskSecret exposes first 4 chars + 8 bullet chars — no length info leaks about the key
  - discriminatedUnion on "key" field enables safe type narrowing when adding new config keys
  - getBreakerState guards halfOpen access with unknown cast for opossum version compatibility
metrics:
  duration: ~10 min
  completed: 2026-04-07
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 30 Plan 02: API Routes for Integration Status and Config Writes Summary

**One-liner:** Server-side integration status API with secret masking, breaker state, and DB-backed config toggle via super-admin-guarded routes.

## What Was Built

Two API routes backing the `/admin/api-keys` admin UI page:

1. **GET /api/admin/api-keys** — reads all tracked integration env vars, returns a sanitized list with configured/missing/partial status, masked secret previews (first 4 chars only), and Apollo circuit breaker state. Never exposes raw values.

2. **POST /api/admin/api-keys/config** — accepts a validated `{ key, value }` body (currently `apollo_mock_enrichment: boolean`) and writes to `platform_config` via `setPlatformConfig`. Guarded by super_admin role.

Both routes return 403 to non-super-admin users using the established guard pattern.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Integration registry types + GET route | c2ebaa5 | src/types/admin-api-keys.ts, src/app/api/admin/api-keys/route.ts |
| 2 | POST /api/admin/api-keys/config route | 39c1500 | src/app/api/admin/api-keys/config/route.ts |

## Key Decisions

**Secret masking strategy:** `maskSecret()` shows exactly first 4 characters + 8 bullet characters regardless of key length. This avoids leaking key length information while giving admins enough to confirm which key is set.

**Zod discriminatedUnion:** The config route uses `z.discriminatedUnion("key", [...])` instead of a flat object schema. This ensures TypeScript narrows the `value` type correctly per key, making future extension safe (add new union member without risking wrong value types).

**Circuit breaker halfOpen guard:** opossum's `halfOpen` property isn't typed in all versions, so we cast to `unknown as { halfOpen?: boolean }` rather than crashing if it's absent.

## Integration Registry

9 integrations registered in display order:

| ID | Label | Category | Env Vars | Mock Mode | Test Support |
|----|-------|----------|----------|-----------|-------------|
| apollo | Apollo.io | enrichment | APOLLO_API_KEY | yes | yes |
| contactout | ContactOut | enrichment | CONTACTOUT_API_KEY | no | yes |
| exa | Exa.ai | enrichment | EXA_API_KEY | no | yes |
| sec_edgar | SEC EDGAR | enrichment | SEC_EDGAR_USER_AGENT | no | yes |
| finnhub | Finnhub | enrichment | FINNHUB_API_KEY | no | yes |
| openrouter | OpenRouter (Claude AI) | ai | OPENROUTER_API_KEY | no | yes |
| inngest | Inngest | infra | INNGEST_SIGNING_KEY, INNGEST_EVENT_KEY | no | no |
| supabase | Supabase | infra | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY | no | yes |
| upstash_redis | Upstash Redis | infra | UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN | no | yes |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. Both routes are fully functional with no placeholder data.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new-network-endpoint | src/app/api/admin/api-keys/route.ts | New GET endpoint reads env vars — requires super_admin guard (present) |
| threat_flag: new-network-endpoint | src/app/api/admin/api-keys/config/route.ts | New POST endpoint mutates platform_config — requires super_admin guard (present) |

Both threats are mitigated: super_admin role check is the first operation in both handlers, returning 403 before any data access.

## Self-Check: PASSED

- src/types/admin-api-keys.ts: FOUND
- src/app/api/admin/api-keys/route.ts: FOUND
- src/app/api/admin/api-keys/config/route.ts: FOUND
- commit c2ebaa5: FOUND
- commit 39c1500: FOUND
