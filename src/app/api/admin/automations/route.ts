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
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Parallel queries
    const [enrichRuns24h, enrichFailed24h, lastEnrichment, cronRuns, sourceHealthData] =
      await Promise.all([
        // Count enrichment runs in last 24h (status changed from none)
        admin
          .from("prospects")
          .select("id", { count: "exact", head: true })
          .neq("enrichment_status", "none")
          .gte("enrichment_started_at", oneDayAgo.toISOString()),

        // Count failed enrichments in last 24h
        admin
          .from("prospects")
          .select("id", { count: "exact", head: true })
          .eq("enrichment_status", "failed")
          .gte("enrichment_started_at", oneDayAgo.toISOString()),

        // Last enrichment run
        admin
          .from("prospects")
          .select(
            "id, full_name, enrichment_status, enrichment_started_at, enriched_at"
          )
          .neq("enrichment_status", "none")
          .order("enrichment_started_at", { ascending: false })
          .limit(1)
          .single(),

        // Cron runs from activity_log
        admin
          .from("activity_log")
          .select("id, created_at, metadata")
          .eq("action_type", "metrics_aggregated")
          .order("created_at", { ascending: false })
          .limit(10),

        // Source health from enrichment_source_status (last 24h)
        admin
          .from("prospects")
          .select("enrichment_source_status")
          .not("enrichment_source_status", "is", null)
          .gte("enrichment_started_at", oneDayAgo.toISOString()),
      ]);

    // Aggregate source health
    const sourceHealth = {
      contactout: { success: 0, failed: 0 },
      exa: { success: 0, failed: 0 },
      sec: { success: 0, failed: 0 },
      claude: { success: 0, failed: 0 },
    };

    for (const row of sourceHealthData.data || []) {
      const status = row.enrichment_source_status as Record<
        string,
        { status: string }
      >;
      for (const [source, info] of Object.entries(status)) {
        const key = source as keyof typeof sourceHealth;
        if (key in sourceHealth && info?.status) {
          if (info.status === "complete") sourceHealth[key].success++;
          else if (info.status === "failed") sourceHealth[key].failed++;
        }
      }
    }

    // Compute next cron run (1 AM UTC)
    const nextCron = new Date(now);
    nextCron.setUTCHours(1, 0, 0, 0);
    if (nextCron <= now) nextCron.setUTCDate(nextCron.getUTCDate() + 1);

    const enrichCount24h = enrichRuns24h.count || 0;
    const failCount24h = enrichFailed24h.count || 0;
    const cronCount24h = (cronRuns.data || []).filter(
      (r) => new Date(r.created_at) >= oneDayAgo
    ).length;
    const totalSuccessRate =
      enrichCount24h > 0
        ? Math.round(
            ((enrichCount24h - failCount24h) / enrichCount24h) * 100
          )
        : 100;

    return NextResponse.json({
      summary: {
        totalAutomations: 2,
        activeSchedules: 1,
        runs24h: enrichCount24h + cronCount24h,
        failures24h: failCount24h,
        successRate: totalSuccessRate,
      },
      functions: [
        {
          id: "enrich-prospect",
          name: "Enrich Prospect",
          description:
            "Multi-source enrichment: ContactOut, Exa, SEC EDGAR, Claude AI",
          type: "event-driven",
          trigger: "prospect/enrich.requested",
          runs24h: enrichCount24h,
          successRate:
            enrichCount24h > 0
              ? Math.round(
                  ((enrichCount24h - failCount24h) / enrichCount24h) * 100
                )
              : 100,
          lastRun: lastEnrichment.data
            ? {
                status: lastEnrichment.data.enrichment_status,
                startedAt: lastEnrichment.data.enrichment_started_at,
                finishedAt: lastEnrichment.data.enriched_at,
                prospectName: lastEnrichment.data.full_name,
              }
            : null,
          sourceHealth,
        },
        {
          id: "aggregate-daily-metrics",
          name: "Aggregate Daily Metrics",
          description:
            "Aggregates activity_log into usage_metrics_daily at 1 AM UTC",
          type: "cron",
          trigger: "0 1 * * *",
          runs24h: cronCount24h,
          successRate: 100, // cron always succeeds (logged only on success)
          lastRun:
            cronRuns.data && cronRuns.data.length > 0
              ? {
                  status: "complete",
                  startedAt: cronRuns.data[0].created_at,
                  finishedAt: cronRuns.data[0].created_at,
                  metadata: (cronRuns.data[0].metadata as Record<
                    string,
                    unknown
                  >) ?? null,
                }
              : null,
          nextRun: nextCron.toISOString(),
        },
      ],
    });
  } catch (error) {
    console.error("[Admin Automations] Summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch automations" },
      { status: 500 }
    );
  }
}
