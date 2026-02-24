import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;
const ERROR_WINDOW_DAYS = 7;

interface ProspectRow {
  id: string;
  full_name: string | null;
  enrichment_status: string | null;
  enrichment_source_status: Record<string, unknown> | string | null;
  updated_at: string | null;
  tenant_id: string | null;
  user_id: string | null;
}

interface TenantRow {
  id: string;
  name: string;
}

interface UserRow {
  id: string;
  full_name: string | null;
}

function normalizeSourceDetails(
  raw: Record<string, unknown> | string | null
): Record<string, { status: string; error?: string; at?: string }> {
  if (!raw) return {};

  if (typeof raw === "string") {
    // Legacy: plain string entry — treat as unknown source status
    return {};
  }

  const result: Record<string, { status: string; error?: string; at?: string }> = {};
  for (const [source, entry] of Object.entries(raw)) {
    if (typeof entry === "string") {
      // Backward compat: "complete" | "failed" as plain string value
      result[source] = { status: entry };
    } else if (typeof entry === "object" && entry !== null) {
      const e = entry as Record<string, unknown>;
      result[source] = {
        status: (e.status as string) ?? "unknown",
        ...(e.error ? { error: e.error as string } : {}),
        ...(e.at ? { at: e.at as string } : {}),
      };
    }
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    // Guard: Only super admin can access error feed
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
    const limit = isNaN(limitParam) || limitParam < 1 ? DEFAULT_LIMIT : Math.min(limitParam, MAX_LIMIT);
    const pageParam = parseInt(searchParams.get("page") ?? String(DEFAULT_PAGE), 10);
    const page = isNaN(pageParam) || pageParam < 1 ? DEFAULT_PAGE : pageParam;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ERROR_WINDOW_DAYS);

    const admin = createAdminClient();

    // Count total failed prospects in window (for pagination metadata)
    const { count: totalCount, error: countError } = await admin
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("enrichment_status", "failed")
      .gte("updated_at", cutoff.toISOString());

    if (countError) {
      throw new Error(`Count query failed: ${countError.message}`);
    }

    const total = totalCount ?? 0;

    // Paginated query for failed prospects
    const rangeFrom = (page - 1) * limit;
    const rangeTo = rangeFrom + limit - 1;

    const { data: prospects, error: prospectsError } = await admin
      .from("prospects")
      .select(
        "id, full_name, enrichment_status, enrichment_source_status, updated_at, tenant_id, user_id"
      )
      .eq("enrichment_status", "failed")
      .gte("updated_at", cutoff.toISOString())
      .order("updated_at", { ascending: false })
      .range(rangeFrom, rangeTo);

    if (prospectsError) {
      throw new Error(`Prospects query failed: ${prospectsError.message}`);
    }

    if (!prospects || prospects.length === 0) {
      return NextResponse.json({ data: [], total, page, limit });
    }

    // Collect distinct tenant and user IDs from result set
    const tenantIds = Array.from(new Set(
      (prospects as ProspectRow[])
        .map((p) => p.tenant_id)
        .filter((id): id is string => id != null)
    ));

    const userIds = Array.from(new Set(
      (prospects as ProspectRow[])
        .map((p) => p.user_id)
        .filter((id): id is string => id != null)
    ));

    // Fetch tenant names
    const { data: tenants, error: tenantsError } =
      tenantIds.length > 0
        ? await admin
            .from("tenants")
            .select("id, name")
            .in("id", tenantIds)
        : { data: [], error: null };

    if (tenantsError) {
      throw new Error(`Tenants query failed: ${tenantsError.message}`);
    }

    // Fetch user names
    const { data: users, error: usersError } =
      userIds.length > 0
        ? await admin
            .from("users")
            .select("id, full_name")
            .in("id", userIds)
        : { data: [], error: null };

    if (usersError) {
      throw new Error(`Users query failed: ${usersError.message}`);
    }

    // Build lookup maps
    const tenantMap = new Map<string, string>(
      (tenants ?? []).map((t: TenantRow) => [t.id, t.name])
    );
    const userMap = new Map<string, string>(
      (users ?? []).map((u: UserRow) => [u.id, u.full_name ?? "Unknown"])
    );

    // Assemble response
    const data = (prospects as ProspectRow[]).map((p) => ({
      id: p.id,
      fullName: p.full_name ?? "Unknown",
      userName: p.user_id ? (userMap.get(p.user_id) ?? "Unknown") : "Unknown",
      tenantName: p.tenant_id ? (tenantMap.get(p.tenant_id) ?? "Unknown") : "Unknown",
      tenantId: p.tenant_id,
      enrichmentStatus: p.enrichment_status,
      sourceDetails: normalizeSourceDetails(p.enrichment_source_status),
      updatedAt: p.updated_at,
    }));

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    console.error("Errors API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch error feed" },
      { status: 500 }
    );
  }
}
