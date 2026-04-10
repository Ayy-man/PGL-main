---
phase: 33-tenant-issue-reporting-system
plan: "04"
subsystem: admin-triage
tags: [admin, api, issue-reports, super-admin, supabase-storage]
dependency_graph:
  requires: ["33-01"]
  provides: ["/admin/reports list UI", "/admin/reports/[id] detail UI", "GET /api/admin/reports", "GET /api/admin/reports/[id]", "PATCH /api/admin/reports/[id]", "GET /api/admin/reports/unread-count"]
  affects: ["admin nav badge (Plan 05 consumes unread-count)"]
tech_stack:
  added: []
  patterns: ["super_admin gate via app_metadata role check", "createAdminClient() service-role DB queries", "Supabase storage createSignedUrl for private bucket", "useState+useTransition client form (no react-hook-form)", "desktop table + mobile cards responsive pattern"]
key_files:
  created:
    - src/app/api/admin/reports/route.ts (81 lines)
    - src/app/api/admin/reports/[id]/route.ts (117 lines)
    - src/app/api/admin/reports/unread-count/route.ts (28 lines)
    - src/app/admin/reports/page.tsx (48 lines)
    - src/app/admin/reports/reports-table.tsx (372 lines)
    - src/app/admin/reports/[id]/page.tsx (45 lines)
    - src/app/admin/reports/[id]/report-detail.tsx (428 lines)
  modified: []
decisions:
  - "Used inline getSuperAdminUser() helper in [id]/route.ts to share auth logic between GET and PATCH without duplicating the createClient() call"
  - "Supabase FK join syntax: tenants:tenant_id(...) returns arrays in type system — cast with 'as any' at prop boundary to avoid TS2322"
  - "Tenant post-filter applied in JS after DB query (supabase-js join filter on related table is awkward); acceptable for admin-scale data volumes"
  - "Status badge colors: open=amber, investigating=blue, resolved=green, wontfix/duplicate=gray (muted)"
  - "Context section (UA/viewport/path) is collapsible via ChevronRight/ChevronDown toggle to reduce visual clutter on detail page"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-04-10"
  tasks_completed: 3
  tasks_total: 3
  files_created: 7
  files_modified: 0
---

# Phase 33 Plan 04: Admin Triage UI + API Summary

**One-liner:** Seven-file admin surface — four API routes (GET list, GET detail, PATCH, GET unread-count) plus server/client page pairs for `/admin/reports` and `/admin/reports/[id]`, all gated by super_admin role check and using service-role DB client.

## Files Created

| File | Lines | Description |
|------|-------|-------------|
| `src/app/api/admin/reports/route.ts` | 81 | GET list — paginated, joins tenant+user, filters by status/category/tenant |
| `src/app/api/admin/reports/[id]/route.ts` | 117 | GET detail (signed URL) + PATCH (status+notes, auto resolved_by/at) |
| `src/app/api/admin/reports/unread-count/route.ts` | 28 | GET {open: N} count of status='open' rows |
| `src/app/admin/reports/page.tsx` | 48 | Server component list page with requireSuperAdmin() + initial fetch |
| `src/app/admin/reports/reports-table.tsx` | 372 | Client table: desktop+mobile, status/category/tenant filters, refetch on change |
| `src/app/admin/reports/[id]/page.tsx` | 45 | Server component detail page — fetches report + signed screenshot URL |
| `src/app/admin/reports/[id]/report-detail.tsx` | 428 | Client detail: all 8 sections, status dropdown, notes, Save via PATCH |

**Total: 1,119 lines across 7 new files**

## Tenant + User Join Syntax

Supabase FK join syntax used throughout:

```typescript
.select(`
  *,
  tenants:tenant_id ( id, name, slug ),
  users:user_id ( id, email, full_name ),
  resolver:resolved_by ( id, email, full_name )
`)
```

The supabase-js type system returns related records as arrays for FK joins, but the runtime returns a single object for `!inner` or many-to-one joins. Cast with `as any` at the prop boundary to avoid TS2322 without polluting the component types.

## Status Transition Matrix

All transitions are allowed in both directions from the UI:

| From | To | resolved_by set? | resolved_at set? |
|------|----|------------------|-----------------|
| open | investigating | No | No |
| open | resolved | Yes (user.id) | Yes (now()) |
| investigating | resolved | Yes (user.id) | Yes (now()) |
| resolved | wontfix | No | No (not cleared) |
| any | duplicate | No | No |

`resolved_by` and `resolved_at` are only set by the server (PATCH handler) — never cleared on re-open. This matches CONTEXT.md LOCKED behavior.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Implementation Notes

**1. getSuperAdminUser() helper (not a deviation)**

The plan's `[id]/route.ts` pseudocode showed a local `requireSuperAdmin()` function returning `{ ok, user }`. Named it `getSuperAdminUser()` to avoid shadowing the imported `requireSuperAdmin` from `@/lib/auth/rbac` which throws `redirect()`. The API route needs to return 403 JSON, not redirect.

**2. Tenant post-filter (noted in plan)**

The list route filters by tenant name/slug in JavaScript after the DB query, as noted in the plan's inline comment. Acceptable for admin-scale data (typically < 1,000 reports total).

**3. Mobile card is a Link (minor improvement)**

The mobile card wraps the entire card in `<Link href="/admin/reports/{id}">` rather than using an onClick handler, which gives native mobile tap behavior and prefetching.

## Self-Check: PASSED

Files exist:
- `src/app/api/admin/reports/route.ts` — FOUND
- `src/app/api/admin/reports/[id]/route.ts` — FOUND
- `src/app/api/admin/reports/unread-count/route.ts` — FOUND
- `src/app/admin/reports/page.tsx` — FOUND
- `src/app/admin/reports/reports-table.tsx` — FOUND
- `src/app/admin/reports/[id]/page.tsx` — FOUND
- `src/app/admin/reports/[id]/report-detail.tsx` — FOUND

Commits:
- `0b9e738` — API routes (Task 1)
- `aeff09c` — list page + ReportsTable (Task 2)
- `8ea3b99` — detail page + ReportDetail (Task 3)

TypeScript: Zero errors in admin/reports files. 6 pre-existing errors in `src/lib/search/__tests__/execute-research.test.ts` (out of scope, not introduced by this plan).
