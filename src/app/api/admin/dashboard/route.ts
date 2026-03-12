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
    const [totalRes, coverageRes, failedRes, todayActivityRes, weekActivityRes, prospectDailyRes, userDailyRes] =
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
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
