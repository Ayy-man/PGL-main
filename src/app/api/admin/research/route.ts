import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResearchStats } from "@/lib/search/telemetry";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/research
 *
 * Returns aggregated research telemetry for the admin dashboard:
 * - Total queries, avg latency, cache hit rate, error rate
 * - Per-channel breakdown (Exa, EDGAR)
 * - Entity type distribution (person/company/property/general)
 * - Daily sparkline data (14 days)
 * - Recent research sessions with prospect + tenant context
 *
 * Query params:
 *   ?days=14  — number of days to aggregate (default 14, max 90)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const days = Math.min(parseInt(url.searchParams.get("days") ?? "14", 10) || 14, 90);

    const admin = createAdminClient();

    // Run telemetry aggregation and recent sessions query in parallel
    const [telemetry, recentSessionsRes] = await Promise.all([
      getResearchStats(days),
      admin
        .from("research_sessions")
        .select(`
          id,
          prospect_id,
          tenant_id,
          user_id,
          created_at,
          updated_at
        `)
        .order("updated_at", { ascending: false })
        .limit(20),
    ]);

    // Enrich recent sessions with prospect names + tenant names
    const sessions = recentSessionsRes.data ?? [];
    const prospectIds = Array.from(new Set(sessions.map((s: { prospect_id: string }) => s.prospect_id)));
    const tenantIds = Array.from(new Set(sessions.map((s: { tenant_id: string }) => s.tenant_id)));

    const [prospectRes, tenantRes] = await Promise.all([
      prospectIds.length > 0
        ? admin.from("prospects").select("id, full_name, company").in("id", prospectIds)
        : Promise.resolve({ data: [] }),
      tenantIds.length > 0
        ? admin.from("tenants").select("id, name").in("id", tenantIds)
        : Promise.resolve({ data: [] }),
    ]);

    const prospectMap = new Map(
      (prospectRes.data ?? []).map((p: { id: string; full_name: string; company: string | null }) => [p.id, p])
    );
    const tenantMap = new Map(
      (tenantRes.data ?? []).map((t: { id: string; name: string }) => [t.id, t.name])
    );

    const recentSessions = sessions.map((s: { id: string; prospect_id: string; tenant_id: string; user_id: string; created_at: string; updated_at: string }) => {
      const prospect = prospectMap.get(s.prospect_id) as { full_name: string; company: string | null } | undefined;
      return {
        id: s.id,
        prospectName: prospect?.full_name ?? "Unknown",
        prospectCompany: prospect?.company ?? null,
        tenantName: tenantMap.get(s.tenant_id) ?? "Unknown",
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      };
    });

    return NextResponse.json({
      ...telemetry,
      recentSessions,
    });
  } catch (error) {
    console.error("[admin/research] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch research stats" },
      { status: 500 }
    );
  }
}
