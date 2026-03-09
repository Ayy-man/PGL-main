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

    // Run all counts in parallel
    const [totalRes, coverageRes, failedRes, todayActivityRes, weekActivityRes] =
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

    return NextResponse.json({
      totalProspects,
      enrichmentCoverage,
      enrichmentFailed,
      activeUsersToday,
      activeUsers7dAvg,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
