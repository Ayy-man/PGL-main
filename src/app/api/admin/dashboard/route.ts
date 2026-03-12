import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Run all counts in parallel
    const [totalRes, coverageRes, failedRes, todayActivityRes, weekActivityRes, prospectDailyRes, userDailyRes, sourceStatsRes, topTenantsRes] =
      await Promise.all([
        // Total prospects
        admin
          .from("prospects")
          .select("*", { count: "exact", head: true }),

        // Enrichment coverage: prospects with enrichment_status = 'complete'
        admin
          .from("prospects")
          .select("*", { count: "exact", head: true })
          .eq("enrichment_status", "complete"),

        // Failed enrichments
        admin
          .from("prospects")
          .select("*", { count: "exact", head: true })
          .eq("enrichment_status", "failed"),

        // Active users today (distinct users with activity today)
        admin
          .from("activity_log")
          .select("user_id")
          .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),

        // Active users in last 7 days (for average)
        admin
          .from("activity_log")
          .select("user_id, created_at")
          .gte(
            "created_at",
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          ),

        // Prospects created per day (last 14 days) for sparkline
        admin
          .from("prospects")
          .select("created_at")
          .gte("created_at", fourteenDaysAgo)
          .order("created_at", { ascending: true }),

        // Active users per day (last 14 days) for sparkline
        admin
          .from("activity_log")
          .select("user_id, created_at")
          .gte("created_at", fourteenDaysAgo),

        // Source stats: enrichment_source_status from prospects (last 14 days)
        admin
          .from("prospects")
          .select("enrichment_source_status")
          .not("enrichment_source_status", "is", null)
          .gte("updated_at", fourteenDaysAgo)
          .limit(10000),

        // Top tenants by activity (last 14 days)
        admin
          .from("activity_log")
          .select("tenant_id")
          .gte("created_at", fourteenDaysAgo),
      ]);

    const totalProspects = totalRes.count ?? 0;
    const enrichedCount = coverageRes.count ?? 0;
    const enrichmentFailed = failedRes.count ?? 0;
    const enrichmentCoverage =
      totalProspects > 0
        ? Math.round((enrichedCount / totalProspects) * 100)
        : 0;

    // Distinct active users today
    const todayUserIds = new Set(
      (todayActivityRes.data ?? []).map(
        (r: { user_id: string }) => r.user_id
      )
    );
    const activeUsersToday = todayUserIds.size;

    // 7-day average: distinct users per day, averaged
    const dayBuckets = new Map<string, Set<string>>();
    for (const row of weekActivityRes.data ?? []) {
      const r = row as { user_id: string; created_at: string };
      const day = r.created_at.slice(0, 10); // YYYY-MM-DD
      if (!dayBuckets.has(day)) dayBuckets.set(day, new Set());
      dayBuckets.get(day)!.add(r.user_id);
    }
    const dayCounts = Array.from(dayBuckets.values()).map((s) => s.size);
    const activeUsers7dAvg =
      dayCounts.length > 0
        ? Math.round(
            dayCounts.reduce((a, b) => a + b, 0) / dayCounts.length
          )
        : 0;

    // Build 14-day sparkline arrays (one value per day)
    const today = new Date();
    const dayLabels: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dayLabels.push(d.toISOString().slice(0, 10));
    }

    // Prospects created per day
    const prospectsByDay = new Map<string, number>();
    for (const label of dayLabels) prospectsByDay.set(label, 0);
    for (const row of prospectDailyRes.data ?? []) {
      const day = (row as { created_at: string }).created_at.slice(0, 10);
      if (prospectsByDay.has(day)) {
        prospectsByDay.set(day, (prospectsByDay.get(day) ?? 0) + 1);
      }
    }
    const prospectsSparkline = dayLabels.map((d) => prospectsByDay.get(d) ?? 0);

    // Distinct active users per day
    const usersByDay = new Map<string, Set<string>>();
    for (const label of dayLabels) usersByDay.set(label, new Set());
    for (const row of userDailyRes.data ?? []) {
      const r = row as { user_id: string; created_at: string };
      const day = r.created_at.slice(0, 10);
      if (usersByDay.has(day)) {
        usersByDay.get(day)!.add(r.user_id);
      }
    }
    const usersSparkline = dayLabels.map((d) => usersByDay.get(d)?.size ?? 0);

    // --- Source Stats Aggregation ---
    const SOURCE_DISPLAY: Record<string, string> = {
      contactout: "ContactOut",
      exa: "Exa",
      sec: "SEC EDGAR",
      edgar: "SEC EDGAR",
      claude: "Claude AI",
    };
    const SOURCE_KEYS = ["contactout", "exa", "sec", "claude"] as const;

    const sourceCounts: Record<string, { success: number; failed: number }> = {};
    for (const k of SOURCE_KEYS) {
      sourceCounts[k] = { success: 0, failed: 0 };
    }

    for (const row of (sourceStatsRes.data ?? []) as { enrichment_source_status: Record<string, unknown> | string | null }[]) {
      if (!row.enrichment_source_status || typeof row.enrichment_source_status === "string") continue;

      for (const [source, entry] of Object.entries(row.enrichment_source_status)) {
        const key = source.toLowerCase();
        // Merge "edgar" key into "sec" bucket (both represent SEC EDGAR)
        const normalizedKey = key === "edgar" ? "sec" : key;
        if (!sourceCounts[normalizedKey]) continue;

        let status = "unknown";
        if (typeof entry === "string") {
          status = entry;
        } else if (typeof entry === "object" && entry !== null) {
          status = (entry as Record<string, unknown>).status as string ?? "unknown";
        }

        if (status === "complete" || status === "success") {
          sourceCounts[normalizedKey].success++;
        } else if (status === "failed" || status === "error") {
          sourceCounts[normalizedKey].failed++;
        }
      }
    }

    const sourceStats = SOURCE_KEYS.map((key) => {
      const { success, failed } = sourceCounts[key];
      const total = success + failed;
      return {
        source: SOURCE_DISPLAY[key],
        key,
        success,
        failed,
        total,
        successRate: total > 0 ? Math.round((success / total) * 100) : 0,
      };
    });

    // --- Top Tenants Aggregation ---
    const tenantCounts = new Map<string, number>();
    for (const row of (topTenantsRes.data ?? []) as { tenant_id: string }[]) {
      if (!row.tenant_id) continue;
      tenantCounts.set(row.tenant_id, (tenantCounts.get(row.tenant_id) ?? 0) + 1);
    }

    const topTenantIds = Array.from(tenantCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    const { data: tenantNames } = topTenantIds.length > 0
      ? await admin.from("tenants").select("id, name").in("id", topTenantIds)
      : { data: [] as { id: string; name: string }[] };

    const nameMap = new Map((tenantNames ?? []).map((t: { id: string; name: string }) => [t.id, t.name]));

    const topTenants = topTenantIds.map((id) => ({
      tenantId: id,
      tenantName: nameMap.get(id) ?? "Unknown",
      activityCount: tenantCounts.get(id) ?? 0,
    }));

    return NextResponse.json({
      totalProspects,
      enrichmentCoverage,
      enrichmentFailed,
      activeUsersToday,
      activeUsers7dAvg,
      sparklines: {
        days: dayLabels,
        prospects: prospectsSparkline,
        users: usersSparkline,
      },
      sourceStats,
      topTenants,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
