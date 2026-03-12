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
}

interface ErrorLogRow {
  id: string;
  route: string;
  method: string;
  status_code: number;
  error_message: string;
  error_code: string | null;
  tenant_id: string | null;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface TenantRow {
  id: string;
  name: string;
}

// Unified error record returned to the frontend
interface UnifiedError {
  id: string;
  type: "enrichment" | "api";
  fullName: string;
  tenantName: string;
  tenantId: string | null;
  enrichmentStatus?: string | null;
  sourceDetails?: Record<string, { status: string; error?: string; at?: string }>;
  route?: string;
  method?: string;
  statusCode?: number;
  errorMessage?: string;
  errorCode?: string | null;
  updatedAt: string | null;
}

function normalizeSourceDetails(
  raw: Record<string, unknown> | string | null
): Record<string, { status: string; error?: string; at?: string }> {
  if (!raw) return {};

  if (typeof raw === "string") {
    return {};
  }

  const result: Record<string, { status: string; error?: string; at?: string }> = {};
  for (const [source, entry] of Object.entries(raw)) {
    if (typeof entry === "string") {
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
    const cutoffISO = cutoff.toISOString();

    const admin = createAdminClient();

    // Fetch both sources in parallel
    const [enrichmentResult, apiErrorResult] = await Promise.all([
      // Source 1: Enrichment failures from prospects table
      admin
        .from("prospects")
        .select(
          "id, full_name, enrichment_status, enrichment_source_status, updated_at, tenant_id"
        )
        .eq("enrichment_status", "failed")
        .gte("updated_at", cutoffISO)
        .order("updated_at", { ascending: false })
        .limit(200),

      // Source 2: API errors from error_log table
      admin
        .from("error_log")
        .select("*")
        .gte("created_at", cutoffISO)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (enrichmentResult.error) {
      throw new Error(`Enrichment query failed: ${enrichmentResult.error.message}`);
    }

    // error_log table may not exist yet — gracefully handle
    const apiErrors: ErrorLogRow[] =
      apiErrorResult.error ? [] : (apiErrorResult.data as ErrorLogRow[]) ?? [];
    const prospects = (enrichmentResult.data as ProspectRow[]) ?? [];

    // Collect all tenant IDs for name lookup
    const tenantIds = Array.from(
      new Set([
        ...prospects.map((p) => p.tenant_id).filter((id): id is string => id != null),
        ...apiErrors.map((e) => e.tenant_id).filter((id): id is string => id != null),
      ])
    );

    const { data: tenants } =
      tenantIds.length > 0
        ? await admin.from("tenants").select("id, name").in("id", tenantIds)
        : { data: [] };

    const tenantMap = new Map<string, string>(
      (tenants ?? []).map((t: TenantRow) => [t.id, t.name])
    );

    // Merge into unified list sorted by time descending
    const unified: UnifiedError[] = [];

    for (const p of prospects) {
      unified.push({
        id: p.id,
        type: "enrichment",
        fullName: p.full_name ?? "Unknown",
        tenantName: p.tenant_id ? (tenantMap.get(p.tenant_id) ?? "Unknown") : "Unknown",
        tenantId: p.tenant_id,
        enrichmentStatus: p.enrichment_status,
        sourceDetails: normalizeSourceDetails(p.enrichment_source_status),
        updatedAt: p.updated_at,
      });
    }

    for (const e of apiErrors) {
      unified.push({
        id: e.id,
        type: "api",
        fullName: `API ${e.status_code}`,
        tenantName: e.tenant_id ? (tenantMap.get(e.tenant_id) ?? "Unknown") : "System",
        tenantId: e.tenant_id,
        route: e.route,
        method: e.method,
        statusCode: e.status_code,
        errorMessage: e.error_message,
        errorCode: e.error_code,
        updatedAt: e.created_at,
      });
    }

    // Sort by time descending
    unified.sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });

    // Paginate
    const total = unified.length;
    const rangeFrom = (page - 1) * limit;
    const paged = unified.slice(rangeFrom, rangeFrom + limit);

    return NextResponse.json({ data: paged, total, page, limit });
  } catch (error) {
    console.error("Errors API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch error feed" },
      { status: 500 }
    );
  }
}
