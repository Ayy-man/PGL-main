import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Guard: Only super admin can access dashboard stats
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    // 1. Prospect counts and enrichment coverage
    const { data: prospects, error: prospectsError } = await admin
      .from("prospects")
      .select("enrichment_status", { count: "exact" });

    if (prospectsError) {
      throw new Error(`Prospects query failed: ${prospectsError.message}`);
    }

    const totalProspects = prospects?.length ?? 0;
    const enrichedCount =
      prospects?.filter((p) => p.enrichment_status === "complete").length ?? 0;
    const failedCount =
      prospects?.filter((p) => p.enrichment_status === "failed").length ?? 0;
    const enrichmentCoverage =
      totalProspects > 0 ? Math.round((enrichedCount / totalProspects) * 100) : 0;

    // 2. Active users today — distinct users who logged in today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayLogins, error: todayLoginsError } = await admin
      .from("activity_log")
      .select("user_id")
      .eq("action_type", "login")
      .gte("created_at", todayStart.toISOString());

    if (todayLoginsError) {
      throw new Error(`Activity log query failed: ${todayLoginsError.message}`);
    }

    const activeUsersToday = new Set(
      todayLogins?.map((r) => r.user_id) ?? []
    ).size;

    // 3. 7-day average active users from usage_metrics_daily
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: metricsData, error: metricsError } = await admin
      .from("usage_metrics_daily")
      .select("total_logins")
      .gte("date", sevenDaysAgo.toISOString().split("T")[0]);

    if (metricsError) {
      throw new Error(`Usage metrics query failed: ${metricsError.message}`);
    }

    const totalLogins7d =
      metricsData?.reduce((sum, row) => sum + (row.total_logins ?? 0), 0) ?? 0;
    const activeUsers7dAvg = Math.round(totalLogins7d / 7);

    return NextResponse.json({
      totalProspects,
      enrichmentCoverage,
      enrichmentFailed: failedCount,
      activeUsersToday,
      activeUsers7dAvg,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
