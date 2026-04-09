---
phase: 33-tenant-issue-reporting-system
plan: 04
type: execute
wave: 2
depends_on: ["33-01"]
files_modified:
  - src/app/api/admin/reports/route.ts
  - src/app/api/admin/reports/[id]/route.ts
  - src/app/api/admin/reports/unread-count/route.ts
  - src/app/admin/reports/page.tsx
  - src/app/admin/reports/reports-table.tsx
  - src/app/admin/reports/[id]/page.tsx
  - src/app/admin/reports/[id]/report-detail.tsx
autonomous: true
requirements:
  - REQ-33-19  # GET /api/admin/reports (list with filters + pagination, super_admin gate)
  - REQ-33-20  # GET /api/admin/reports/[id] (detail + signed screenshot URL)
  - REQ-33-21  # PATCH /api/admin/reports/[id] (status + admin_notes, auto-populate resolved_by/resolved_at on resolve)
  - REQ-33-22  # GET /api/admin/reports/unread-count ({open: N})
  - REQ-33-23  # /admin/reports list page (server component + requireSuperAdmin + initial fetch)
  - REQ-33-24  # ReportsTable client component (mirrors tenant-table.tsx: desktop table + mobile cards)
  - REQ-33-25  # /admin/reports/[id] detail page (server + signed URL generation)
  - REQ-33-26  # ReportDetail client component (status dropdown + notes textarea + Save)

must_haves:
  truths:
    - "GET /api/admin/reports returns paginated list joined to tenants + users, filtered by ?status/?category/?tenant, accepts ?limit & ?offset"
    - "GET /api/admin/reports/[id] returns a single report plus a 3600s signed URL for the screenshot if present"
    - "PATCH /api/admin/reports/[id] accepts { status?, admin_notes? } JSON and persists. On status transition to 'resolved', sets resolved_by = user.id and resolved_at = now()"
    - "GET /api/admin/reports/unread-count returns { open: N } — count of rows with status='open'"
    - "All four admin routes return 403 for non-super_admin callers"
    - "Non-super_admin hitting /admin/reports redirects via requireSuperAdmin() in the admin layout"
    - "Tenant cannot read any row from issue_reports via user-scoped client (RLS configured in Plan 01 Task 4)"
    - "Admin list view shows: Created (relative), Tenant, User, Category badge, Target, Status badge, quick-view link"
    - "Admin detail view renders: Header, Submitter, Description, Target snapshot JSON, Screenshot (hidden if no path), Original URL, Context, Admin actions"
    - "Admin PATCH via UI changes status and refreshes the list; unread-count endpoint reflects the change on next poll"
  artifacts:
    - path: "src/app/api/admin/reports/route.ts"
      provides: "GET list handler"
      min_lines: 80
    - path: "src/app/api/admin/reports/[id]/route.ts"
      provides: "GET detail + PATCH"
      min_lines: 120
    - path: "src/app/api/admin/reports/unread-count/route.ts"
      provides: "GET {open: N}"
      min_lines: 30
    - path: "src/app/admin/reports/page.tsx"
      provides: "Server component list page"
      min_lines: 50
    - path: "src/app/admin/reports/reports-table.tsx"
      provides: "Client component list table"
      min_lines: 150
    - path: "src/app/admin/reports/[id]/page.tsx"
      provides: "Server component detail page with signed URL fetch"
      min_lines: 60
    - path: "src/app/admin/reports/[id]/report-detail.tsx"
      provides: "Client component detail view with status dropdown + notes"
      min_lines: 120
  key_links:
    - from: "src/app/api/admin/reports/route.ts"
      to: "issue_reports (admin client)"
      via: "createAdminClient().from('issue_reports').select(...join tenant, user...)"
      pattern: "from\\(['\"]issue_reports['\"]\\)"
    - from: "src/app/admin/reports/[id]/page.tsx"
      to: "Supabase Storage signed URL"
      via: "admin.storage.from('issue-reports').createSignedUrl(path, 3600)"
      pattern: "createSignedUrl"
    - from: "src/app/admin/reports/[id]/report-detail.tsx"
      to: "PATCH /api/admin/reports/[id]"
      via: "fetch with { status, admin_notes } JSON body"
      pattern: "method: ['\"]PATCH['\"]"
---

<objective>
Build the admin-side triage surface: four API routes (list, detail, patch, unread-count), a list page with mobile-card variant, and a detail page with screenshot preview + status/notes editor. All gated by `requireSuperAdmin()` and `createAdminClient()`.

Purpose: Super admins need to see, prioritize, and resolve tenant reports across tenants without cross-tenant data access. This plan delivers that entire surface.

Output: `/admin/reports` and `/admin/reports/[id]` work end-to-end, including PATCH state transitions.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md
@.planning/phases/33-tenant-issue-reporting-system/33-RESEARCH.md
@.planning/phases/33-tenant-issue-reporting-system/33-01-SUMMARY.md
@src/app/api/admin/tenants/route.ts
@src/app/admin/tenants/tenant-table.tsx
@src/app/admin/tenants/page.tsx
@src/lib/supabase/admin.ts
@src/lib/supabase/server.ts
@src/lib/auth/rbac.ts
@src/app/admin/layout.tsx
@src/types/database.ts

<interfaces>
<!-- From Plan 01: -->
```typescript
export type IssueCategory = "incorrect_data" | "missing_data" | "bad_source" | "bug" | "other";
export type IssueStatus = "open" | "investigating" | "resolved" | "wontfix" | "duplicate";
export interface IssueReport { /* 19 fields, see src/types/database.ts */ }
```

<!-- Super admin gate (from src/app/api/admin/tenants/route.ts): -->
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user || user.app_metadata?.role !== "super_admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
const admin = createAdminClient();
// ... use admin client for queries
```

<!-- Signed URL (net-new in this project): -->
```typescript
const { data: signedData, error } = await admin.storage
  .from("issue-reports")
  .createSignedUrl(report.screenshot_path, 3600);  // 60 minutes
const screenshotUrl = signedData?.signedUrl ?? null;
```

<!-- Relative time formatter (inline per project convention, from src/components/admin/error-feed.tsx): -->
```typescript
function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create all three admin API routes (GET list, GET/PATCH detail, GET unread-count) with super_admin gates</name>
  <files>src/app/api/admin/reports/route.ts, src/app/api/admin/reports/[id]/route.ts, src/app/api/admin/reports/unread-count/route.ts</files>
  <read_first>
    - src/app/api/admin/tenants/route.ts (FULL file — canonical super_admin gate + createAdminClient query pattern)
    - src/lib/supabase/admin.ts (createAdminClient signature)
    - src/lib/supabase/server.ts (createClient signature)
    - .planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md (Admin API routes LOCKED lines 141-147)
    - .planning/phases/33-tenant-issue-reporting-system/33-RESEARCH.md (Pattern 3 Super-Admin Gate lines 182-199, Pitfall 5 createSignedUrl lines 454-459)
  </read_first>
  <action>
    **File 1: `src/app/api/admin/reports/route.ts` (GET list with filters + pagination)**

    ```typescript
    import { NextResponse } from "next/server";
    import { createClient } from "@/lib/supabase/server";
    import { createAdminClient } from "@/lib/supabase/admin";

    export const dynamic = "force-dynamic";

    const DEFAULT_LIMIT = 25;
    const MAX_LIMIT = 100;
    const VALID_STATUSES = ["open", "investigating", "resolved", "wontfix", "duplicate"] as const;
    const VALID_CATEGORIES = ["incorrect_data", "missing_data", "bad_source", "bug", "other"] as const;

    export async function GET(request: Request) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.app_metadata?.role !== "super_admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const url = new URL(request.url);
      const status = url.searchParams.get("status");
      const category = url.searchParams.get("category");
      const tenantSearch = url.searchParams.get("tenant");
      const limit = Math.min(
        parseInt(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
        MAX_LIMIT
      );
      const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10) || 0, 0);

      const admin = createAdminClient();
      let query = admin
        .from("issue_reports")
        .select(
          `
          id, category, description, status, target_type, target_id, target_snapshot,
          screenshot_path, page_url, page_path, created_at, updated_at, resolved_at,
          tenants:tenant_id ( id, name, slug ),
          users:user_id ( id, email, full_name )
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
        query = query.eq("status", status);
      }
      if (category && (VALID_CATEGORIES as readonly string[]).includes(category)) {
        query = query.eq("category", category);
      }
      // Tenant search handled post-query (join filter is tricky via supabase-js)

      const { data, count, error } = await query;
      if (error) {
        return NextResponse.json({ error: "Failed to fetch reports", details: error.message }, { status: 500 });
      }

      let filtered = data ?? [];
      if (tenantSearch && tenantSearch.trim()) {
        const term = tenantSearch.trim().toLowerCase();
        filtered = filtered.filter((r: { tenants: { name?: string; slug?: string } | null }) =>
          r.tenants?.name?.toLowerCase().includes(term) ||
          r.tenants?.slug?.toLowerCase().includes(term)
        );
      }

      return NextResponse.json({
        reports: filtered,
        total: count ?? filtered.length,
        limit,
        offset,
      });
    }
    ```

    **File 2: `src/app/api/admin/reports/[id]/route.ts` (GET detail + PATCH)**

    ```typescript
    import { NextResponse } from "next/server";
    import { createClient } from "@/lib/supabase/server";
    import { createAdminClient } from "@/lib/supabase/admin";

    export const dynamic = "force-dynamic";

    const VALID_STATUSES = ["open", "investigating", "resolved", "wontfix", "duplicate"] as const;
    type Status = typeof VALID_STATUSES[number];

    async function requireSuperAdmin() {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.app_metadata?.role !== "super_admin") {
        return { ok: false as const, user: null };
      }
      return { ok: true as const, user };
    }

    export async function GET(
      _request: Request,
      { params }: { params: Promise<{ id: string }> }
    ) {
      const gate = await requireSuperAdmin();
      if (!gate.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { id } = await params;

      const admin = createAdminClient();
      const { data: report, error } = await admin
        .from("issue_reports")
        .select(
          `
          *,
          tenants:tenant_id ( id, name, slug ),
          users:user_id ( id, email, full_name ),
          resolver:resolved_by ( id, email, full_name )
        `
        )
        .eq("id", id)
        .single();

      if (error || !report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      // Generate signed URL for screenshot if path is set
      let screenshotUrl: string | null = null;
      if (report.screenshot_path) {
        const { data: signedData } = await admin.storage
          .from("issue-reports")
          .createSignedUrl(report.screenshot_path, 3600); // 60 minutes
        screenshotUrl = signedData?.signedUrl ?? null;
      }

      return NextResponse.json({ report, screenshotUrl });
    }

    export async function PATCH(
      request: Request,
      { params }: { params: Promise<{ id: string }> }
    ) {
      const gate = await requireSuperAdmin();
      if (!gate.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { id } = await params;
      const user = gate.user!;

      let body: { status?: Status; admin_notes?: string | null };
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const update: Record<string, unknown> = {};
      if (body.status !== undefined) {
        if (!(VALID_STATUSES as readonly string[]).includes(body.status)) {
          return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }
        update.status = body.status;
        if (body.status === "resolved") {
          update.resolved_by = user.id;
          update.resolved_at = new Date().toISOString();
        }
      }
      if (body.admin_notes !== undefined) {
        update.admin_notes = body.admin_notes;
      }

      if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
      }

      const admin = createAdminClient();
      const { data, error } = await admin
        .from("issue_reports")
        .update(update)
        .eq("id", id)
        .select("id, status, admin_notes, resolved_by, resolved_at, updated_at")
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Failed to update", details: error?.message }, { status: 500 });
      }

      return NextResponse.json({ report: data });
    }
    ```

    **File 3: `src/app/api/admin/reports/unread-count/route.ts` (GET {open: N})**

    ```typescript
    import { NextResponse } from "next/server";
    import { createClient } from "@/lib/supabase/server";
    import { createAdminClient } from "@/lib/supabase/admin";

    export const dynamic = "force-dynamic";

    export async function GET() {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.app_metadata?.role !== "super_admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const admin = createAdminClient();
      const { count, error } = await admin
        .from("issue_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");

      if (error) {
        return NextResponse.json({ open: 0, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ open: count ?? 0 });
    }
    ```

    All three routes MUST:
    - Use `createClient()` for auth check and `createAdminClient()` for DB operations
    - Return 403 when `user.app_metadata?.role !== "super_admin"`
    - Set `export const dynamic = "force-dynamic"`
    - Never use `await logActivity` (no activity logging on admin-side per CONTEXT.md — only tenant POST logs)
  </action>
  <verify>
    <automated>test -f src/app/api/admin/reports/route.ts && test -f src/app/api/admin/reports/\[id\]/route.ts && test -f src/app/api/admin/reports/unread-count/route.ts && grep -q "super_admin" src/app/api/admin/reports/route.ts && grep -q "super_admin" src/app/api/admin/reports/\[id\]/route.ts && grep -q "super_admin" src/app/api/admin/reports/unread-count/route.ts && grep -q "createSignedUrl" src/app/api/admin/reports/\[id\]/route.ts && grep -q "resolved_by" src/app/api/admin/reports/\[id\]/route.ts && grep -q "resolved_at" src/app/api/admin/reports/\[id\]/route.ts && grep -q "\"open\"" src/app/api/admin/reports/unread-count/route.ts && npx tsc --noEmit 2>&1 | tee /tmp/tsc-33-04-t1.log && ! grep -q "src/app/api/admin/reports" /tmp/tsc-33-04-t1.log</automated>
  </verify>
  <acceptance_criteria>
    - All three route files exist
    - All three contain `user.app_metadata?.role !== "super_admin"` guard returning 403
    - `[id]/route.ts` exports both `GET` and `PATCH`
    - `[id]/route.ts` contains `createSignedUrl(report.screenshot_path, 3600)`
    - `[id]/route.ts` PATCH transitions to `resolved` AUTO-populate `resolved_by = user.id` and `resolved_at = ISO string`
    - `[id]/route.ts` rejects invalid status values with 400
    - `unread-count/route.ts` returns `{ open: N }` shape
    - `unread-count/route.ts` uses `.eq("status", "open")`
    - List route accepts `?status`, `?category`, `?tenant`, `?limit`, `?offset` query params
    - List route joins `tenants` and `users` via `tenants:tenant_id` and `users:user_id` FK syntax
    - `npx tsc --noEmit` passes with zero new errors
  </acceptance_criteria>
  <done>All three API routes compile, gate super_admin correctly, and handle all the CRUD scenarios from CONTEXT.md.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create /admin/reports list page + ReportsTable client component (desktop table + mobile cards)</name>
  <files>src/app/admin/reports/page.tsx, src/app/admin/reports/reports-table.tsx</files>
  <read_first>
    - src/app/admin/tenants/page.tsx (canonical server component list page pattern)
    - src/app/admin/tenants/tenant-table.tsx (FULL file — clone the desktop table + mobile card structure, status badges, formatting)
    - src/lib/auth/rbac.ts (requireSuperAdmin signature)
    - src/app/admin/layout.tsx (confirm requireSuperAdmin is already called in the admin layout so the page can assume super_admin)
    - .planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md (Admin UI LOCKED lines 131-140)
  </read_first>
  <action>
    **File 1: `src/app/admin/reports/page.tsx`** (Server Component)

    ```typescript
    import { createAdminClient } from "@/lib/supabase/admin";
    import { requireSuperAdmin } from "@/lib/auth/rbac";
    import { ReportsTable } from "./reports-table";

    export const dynamic = "force-dynamic";

    export default async function AdminReportsPage({
      searchParams,
    }: {
      searchParams: Promise<{ status?: string; category?: string; tenant?: string }>;
    }) {
      await requireSuperAdmin();
      const params = await searchParams;
      const initialStatus = params.status ?? "open";

      const admin = createAdminClient();
      const { data: reports } = await admin
        .from("issue_reports")
        .select(
          `
          id, category, description, status, target_type, target_id, target_snapshot,
          screenshot_path, page_path, created_at,
          tenants:tenant_id ( id, name, slug ),
          users:user_id ( id, email, full_name )
        `
        )
        .eq("status", initialStatus)
        .order("created_at", { ascending: false })
        .limit(25);

      return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary-ds)" }}>
              Issue Reports
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary-ds)" }}>
              Tenant-submitted bug reports and data quality issues across all tenants.
            </p>
          </div>
          <ReportsTable initialReports={reports ?? []} initialStatus={initialStatus} />
        </div>
      );
    }
    ```

    **File 2: `src/app/admin/reports/reports-table.tsx`** (Client Component)

    Pattern: clone the structure from `src/app/admin/tenants/tenant-table.tsx` — desktop `<table>` + mobile card variants, status badges, filter dropdowns above the table, pagination via query params.

    Required elements:
    - `"use client"` at the top
    - Inline `formatRelativeTime` function (do NOT extract to shared util — project convention is per-file)
    - Filter bar above the table with:
      - Status dropdown (default: `open`; options: all 5 statuses + "All")
      - Category dropdown (options: all 5 categories + "All")
      - Tenant search input (free text)
    - Desktop table with columns: Created (relative time), Tenant, User, Category (badge), Target (type + snapshot name if present), Status (badge), View (link to `/admin/reports/{id}`)
    - Mobile card variant (hidden `md:hidden`) with the same fields stacked
    - Status badge colors: open=amber, investigating=blue, resolved=green, wontfix=gray, duplicate=gray
    - Category badge colors: use neutral gray with the category label
    - Empty state: "No reports match these filters."
    - Refresh button that re-fetches via `/api/admin/reports?status=...&category=...&tenant=...`
    - Use `useState` + `useEffect` + `fetch` for client-side re-fetch (no server actions)
    - Row click navigates to `/admin/reports/{id}` via `next/link`
    - Use CSS variables from the design system: `var(--text-primary-ds)`, `var(--text-secondary-ds)`, `var(--bg-elevated)`, `var(--border-subtle)`, `var(--gold-primary)` — match tenant-table.tsx exactly
    - Do NOT use raw Tailwind colors like `text-blue-500` — use design system variables

    Minimum 150 lines. Structure (pseudocode):

    ```typescript
    "use client";
    import { useState, useEffect, useCallback } from "react";
    import Link from "next/link";
    import { RefreshCw } from "lucide-react";

    interface ReportRow {
      id: string;
      category: string;
      description: string;
      status: string;
      target_type: string | null;
      target_id: string | null;
      target_snapshot: Record<string, unknown> | null;
      screenshot_path: string | null;
      page_path: string;
      created_at: string;
      tenants: { id: string; name: string; slug: string } | null;
      users: { id: string; email: string; full_name: string | null } | null;
    }

    function formatRelativeTime(dateStr: string): string { /* inline as per canonical pattern */ }

    function StatusBadge({ status }: { status: string }) { /* mapped colors via CSS vars */ }
    function CategoryBadge({ category }: { category: string }) { /* neutral badge */ }

    export function ReportsTable({
      initialReports,
      initialStatus,
    }: {
      initialReports: ReportRow[];
      initialStatus: string;
    }) {
      const [rows, setRows] = useState<ReportRow[]>(initialReports);
      const [status, setStatus] = useState(initialStatus);
      const [category, setCategory] = useState<string>("");
      const [tenantQuery, setTenantQuery] = useState("");
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);

      const fetchRows = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
          const params = new URLSearchParams();
          if (status) params.set("status", status);
          if (category) params.set("category", category);
          if (tenantQuery) params.set("tenant", tenantQuery);
          const res = await fetch(`/api/admin/reports?${params.toString()}`);
          if (!res.ok) throw new Error("Failed to fetch");
          const data = await res.json();
          setRows(data.reports ?? []);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed");
        } finally {
          setLoading(false);
        }
      }, [status, category, tenantQuery]);

      useEffect(() => {
        fetchRows();
      }, [status, category]); // tenantQuery refreshed on button click only

      // ... render filter bar + desktop table + mobile cards + empty state ...
    }
    ```

    Fill out the render with full desktop `<table>` (hidden `md:table`) and mobile card `<div className="md:hidden">` variants. Category label map: `incorrect_data` → "Incorrect data", `missing_data` → "Missing data", `bad_source` → "Bad source", `bug` → "Bug", `other` → "Other".
  </action>
  <verify>
    <automated>test -f src/app/admin/reports/page.tsx && test -f src/app/admin/reports/reports-table.tsx && grep -q "requireSuperAdmin" src/app/admin/reports/page.tsx && grep -q "ReportsTable" src/app/admin/reports/page.tsx && grep -q "\"use client\"" src/app/admin/reports/reports-table.tsx && grep -q "formatRelativeTime" src/app/admin/reports/reports-table.tsx && grep -q "StatusBadge" src/app/admin/reports/reports-table.tsx && grep -q "md:hidden" src/app/admin/reports/reports-table.tsx && grep -q "md:table" src/app/admin/reports/reports-table.tsx && grep -q "/api/admin/reports" src/app/admin/reports/reports-table.tsx && npx tsc --noEmit 2>&1 | tee /tmp/tsc-33-04-t2.log && ! grep -q "src/app/admin/reports" /tmp/tsc-33-04-t2.log</automated>
  </verify>
  <acceptance_criteria>
    - Both files exist
    - `page.tsx` calls `requireSuperAdmin()` BEFORE any data fetch
    - `page.tsx` does initial server-side fetch filtered by `status = 'open'` (the default)
    - `page.tsx` passes `initialReports` prop to `<ReportsTable>`
    - `reports-table.tsx` starts with `"use client"`
    - `reports-table.tsx` contains an inline `formatRelativeTime` function (not imported)
    - `reports-table.tsx` contains both desktop table (`md:table`) and mobile card (`md:hidden`) variants
    - `reports-table.tsx` contains status filter dropdown, category filter dropdown, tenant search input
    - `reports-table.tsx` fetches via `/api/admin/reports?...` on filter change
    - `reports-table.tsx` renders Link to `/admin/reports/{id}` for row click-through
    - `npx tsc --noEmit` passes with zero new errors
    - Minimum 150 lines in `reports-table.tsx` (verify with `wc -l`)
  </acceptance_criteria>
  <done>List page renders with initial data, client table handles filter changes via fetch, navigation to detail works.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Create /admin/reports/[id] detail page + ReportDetail client component (status dropdown + notes + Save)</name>
  <files>src/app/admin/reports/[id]/page.tsx, src/app/admin/reports/[id]/report-detail.tsx</files>
  <read_first>
    - src/app/admin/reports/page.tsx (from Task 2 — pattern for server component)
    - src/app/admin/reports/reports-table.tsx (from Task 2 — shared badge/formatting patterns)
    - src/lib/auth/rbac.ts (requireSuperAdmin)
    - src/app/admin/layout.tsx (confirm layout already gates)
    - .planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md (Detail sections LOCKED line 139)
  </read_first>
  <action>
    **File 1: `src/app/admin/reports/[id]/page.tsx`** (Server Component)

    ```typescript
    import { notFound } from "next/navigation";
    import { createAdminClient } from "@/lib/supabase/admin";
    import { requireSuperAdmin } from "@/lib/auth/rbac";
    import { ReportDetail } from "./report-detail";

    export const dynamic = "force-dynamic";

    export default async function AdminReportDetailPage({
      params,
    }: {
      params: Promise<{ id: string }>;
    }) {
      await requireSuperAdmin();
      const { id } = await params;

      const admin = createAdminClient();
      const { data: report, error } = await admin
        .from("issue_reports")
        .select(
          `
          *,
          tenants:tenant_id ( id, name, slug ),
          users:user_id ( id, email, full_name ),
          resolver:resolved_by ( id, email, full_name )
        `
        )
        .eq("id", id)
        .single();

      if (error || !report) {
        notFound();
      }

      // Generate signed URL for screenshot (60 min TTL)
      let screenshotUrl: string | null = null;
      if (report.screenshot_path) {
        const { data: signedData } = await admin.storage
          .from("issue-reports")
          .createSignedUrl(report.screenshot_path, 3600);
        screenshotUrl = signedData?.signedUrl ?? null;
      }

      return <ReportDetail report={report} screenshotUrl={screenshotUrl} />;
    }
    ```

    **File 2: `src/app/admin/reports/[id]/report-detail.tsx`** (Client Component)

    Required sections (per CONTEXT.md line 139):
    1. Header: category badge + status badge + `Created X ago` relative time
    2. Submitter: Tenant name + slug + User email + full_name
    3. Description: full text with preserved whitespace (`whitespace-pre-wrap`)
    4. Target snapshot: prettified JSON block (`<pre>` with `JSON.stringify(report.target_snapshot, null, 2)`) — HIDE if `target_snapshot` is null
    5. Screenshot: `<img src={screenshotUrl}>` with border and max-width — HIDE entire block if `screenshotUrl` is null
    6. Original URL: `<a href={report.page_url} target="_blank">` (informational only, labeled "Tenant URL (informational)")
    7. Context (collapsible details): user_agent, viewport, page_path, resolved_by, resolved_at
    8. Admin actions: status dropdown + admin_notes textarea + Save button

    Required behavior:
    - `"use client"` directive
    - `useState` + `useTransition` for form state (no react-hook-form)
    - Save button calls `PATCH /api/admin/reports/{id}` with `{ status, admin_notes }`
    - On successful PATCH: show success banner, update local `report` state with returned row, do NOT navigate away
    - On failure: show error banner (mirror the dialog pattern)
    - Back link to `/admin/reports`
    - Status dropdown options: open, investigating, resolved, wontfix, duplicate (disable "open" if the current status is already non-open? — no, allow all transitions per CONTEXT.md)
    - When user selects `resolved` and saves, the server sets `resolved_by` + `resolved_at` automatically

    Pseudocode skeleton (fill out to min 120 lines):

    ```typescript
    "use client";
    import { useState, useTransition } from "react";
    import Link from "next/link";
    import { ArrowLeft } from "lucide-react";
    import type { IssueStatus } from "@/types/database";

    interface ReportDetailProps {
      report: {
        id: string;
        category: string;
        description: string;
        page_url: string;
        page_path: string;
        user_agent: string | null;
        viewport: { w: number; h: number } | null;
        target_type: string | null;
        target_id: string | null;
        target_snapshot: Record<string, unknown> | null;
        screenshot_path: string | null;
        status: IssueStatus;
        admin_notes: string | null;
        resolved_by: string | null;
        resolved_at: string | null;
        created_at: string;
        updated_at: string;
        tenants: { id: string; name: string; slug: string } | null;
        users: { id: string; email: string; full_name: string | null } | null;
        resolver: { id: string; email: string; full_name: string | null } | null;
      };
      screenshotUrl: string | null;
    }

    export function ReportDetail({ report: initialReport, screenshotUrl }: ReportDetailProps) {
      const [report, setReport] = useState(initialReport);
      const [status, setStatus] = useState<IssueStatus>(initialReport.status);
      const [notes, setNotes] = useState(initialReport.admin_notes ?? "");
      const [error, setError] = useState<string | null>(null);
      const [success, setSuccess] = useState<string | null>(null);
      const [isPending, startTransition] = useTransition();

      const handleSave = () => {
        setError(null);
        setSuccess(null);
        startTransition(async () => {
          try {
            const res = await fetch(`/api/admin/reports/${report.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status, admin_notes: notes }),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              setError(body.error ?? "Failed to save");
              return;
            }
            const data = await res.json();
            setReport((r) => ({ ...r, ...data.report }));
            setSuccess("Saved");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Unexpected error");
          }
        });
      };

      // ... render all 8 sections using CSS variables for styling ...
    }
    ```

    Render the full JSX with all 8 sections. Use CSS variables from the design system (`var(--text-primary-ds)`, `var(--bg-elevated)`, etc.). Match the visual style of `src/app/admin/tenants/*`.
  </action>
  <verify>
    <automated>test -f src/app/admin/reports/\[id\]/page.tsx && test -f src/app/admin/reports/\[id\]/report-detail.tsx && grep -q "requireSuperAdmin" src/app/admin/reports/\[id\]/page.tsx && grep -q "createSignedUrl" src/app/admin/reports/\[id\]/page.tsx && grep -q "\"use client\"" src/app/admin/reports/\[id\]/report-detail.tsx && grep -q "useTransition" src/app/admin/reports/\[id\]/report-detail.tsx && grep -q "method: \"PATCH\"" src/app/admin/reports/\[id\]/report-detail.tsx && grep -q "JSON.stringify" src/app/admin/reports/\[id\]/report-detail.tsx && grep -q "screenshotUrl" src/app/admin/reports/\[id\]/report-detail.tsx && ! grep -q "react-hook-form" src/app/admin/reports/\[id\]/report-detail.tsx && npx tsc --noEmit 2>&1 | tee /tmp/tsc-33-04-t3.log && ! grep -q "src/app/admin/reports" /tmp/tsc-33-04-t3.log</automated>
  </verify>
  <acceptance_criteria>
    - Both files exist
    - `page.tsx` calls `requireSuperAdmin()` and `createSignedUrl(..., 3600)`
    - `page.tsx` passes both `report` and `screenshotUrl` props to the client component
    - `page.tsx` calls `notFound()` if the report doesn't exist
    - `report-detail.tsx` starts with `"use client"`
    - `report-detail.tsx` uses `useState` + `useTransition` (zero react-hook-form)
    - `report-detail.tsx` posts to `/api/admin/reports/${id}` with `method: "PATCH"` and JSON body `{ status, admin_notes }`
    - `report-detail.tsx` renders JSON snapshot via `JSON.stringify(..., null, 2)` inside `<pre>`
    - `report-detail.tsx` conditionally hides the screenshot block when `screenshotUrl` is null
    - `report-detail.tsx` contains a back `Link` to `/admin/reports`
    - `npx tsc --noEmit` passes with zero new errors
    - Minimum 120 lines in `report-detail.tsx`
  </acceptance_criteria>
  <done>Admin detail view renders all 8 sections, status + notes update via PATCH, screenshot signed URL loads.</done>
</task>

</tasks>

<verification>
- All 7 new files exist under `src/app/admin/reports/` and `src/app/api/admin/reports/`
- Zero `react-hook-form` imports anywhere in the new admin code
- `npx tsc --noEmit` is clean
- `npm run lint` is clean
- `npm run build` succeeds
- Smoke test (after Plan 01 Task 4 policies are configured): `curl -s localhost:3000/api/admin/reports/unread-count` returns 403 when logged out, 200 with `{open: N}` when super_admin cookie is present (manual verification)
</verification>

<success_criteria>
1. Super admin visits `/admin/reports` and sees list of open reports with filters
2. Super admin can filter by status (open/investigating/resolved/wontfix/duplicate), category, and tenant name
3. Clicking a row opens the detail at `/admin/reports/[id]` with all 8 sections rendered
4. Screenshot preview loads via signed URL (if screenshot_path is set)
5. Changing status + saving via the form persists to the DB and refreshes the view
6. Setting status to `resolved` auto-populates `resolved_by` and `resolved_at` in the DB
7. Non-super_admin hitting `/admin/reports` is redirected by the layout's `requireSuperAdmin()` gate (inherited behavior, not net-new)
8. `GET /api/admin/reports/unread-count` returns `{open: N}` — ready for Plan 05 to consume
</success_criteria>

<output>
After completion, create `.planning/phases/33-tenant-issue-reporting-system/33-04-SUMMARY.md` documenting:
- All 7 new files created with line counts
- Final tenant + user join syntax used (Supabase FK join)
- Status transition matrix tested (open→investigating, investigating→resolved, etc.)
- Any deviations from tenant-table.tsx pattern
</output>
