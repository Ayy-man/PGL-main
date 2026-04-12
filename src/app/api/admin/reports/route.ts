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

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch reports", details: error.message },
      { status: 500 }
    );
  }

  // Post-filter by tenant name/slug (join filter is tricky via supabase-js)
  let filtered = (data ?? []) as Array<{
    tenants: { name?: string; slug?: string } | null;
    [key: string]: unknown;
  }>;
  if (tenantSearch && tenantSearch.trim()) {
    const term = tenantSearch.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
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
