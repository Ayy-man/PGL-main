import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface EnrichmentRun {
  id: string;
  full_name: string | null;
  enrichment_status: string;
  enrichment_started_at: string | null;
  enriched_at: string | null;
  inngest_event_id: string | null;
}

interface CronRun {
  id: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit") ?? "20", 10);
    const limit = isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100);
    const functionFilter = searchParams.get("function");

    const admin = createAdminClient();

    const fetchEnrichment = !functionFilter || functionFilter === "enrich-prospect";
    const fetchCron = !functionFilter || functionFilter === "aggregate-daily-metrics";

    // Parallel queries — wrap in async IIFEs to keep types clean
    const [enrichResult, cronResult] = await Promise.all([
      fetchEnrichment
        ? admin
            .from("prospects")
            .select(
              "id, full_name, enrichment_status, enrichment_started_at, enriched_at, inngest_event_id"
            )
            .neq("enrichment_status", "none")
            .order("enrichment_started_at", { ascending: false })
            .limit(limit)
            .then((res) => (res.data ?? []) as EnrichmentRun[])
        : Promise.resolve([] as EnrichmentRun[]),

      fetchCron
        ? admin
            .from("activity_log")
            .select("id, created_at, metadata")
            .eq("action_type", "metrics_aggregated")
            .order("created_at", { ascending: false })
            .limit(limit)
            .then((res) => (res.data ?? []) as CronRun[])
        : Promise.resolve([] as CronRun[]),
    ]);

    // Map enrichment runs
    const enrichmentRuns = enrichResult.map((p) => {
      const startedAt = p.enrichment_started_at;
      const finishedAt = p.enriched_at;
      const durationMs =
        startedAt && finishedAt
          ? new Date(finishedAt).getTime() - new Date(startedAt).getTime()
          : null;

      return {
        id: p.id,
        functionId: "enrich-prospect" as const,
        functionName: "Enrich Prospect",
        status: p.enrichment_status as "complete" | "failed" | "in_progress",
        startedAt,
        finishedAt,
        durationMs,
        label: p.full_name || "Unknown Prospect",
        inngestEventId: p.inngest_event_id,
      };
    });

    // Map cron runs
    const cronRuns = cronResult.map((r) => {
      const meta = r.metadata as Record<string, unknown> | null;
      const durationMs = meta?.durationMs
        ? Number(meta.durationMs)
        : null;

      return {
        id: r.id,
        functionId: "aggregate-daily-metrics" as const,
        functionName: "Aggregate Daily Metrics",
        status: "complete" as const,
        startedAt: r.created_at,
        finishedAt: r.created_at,
        durationMs,
        label: (meta?.date as string) || r.created_at.slice(0, 10),
        inngestEventId: null,
      };
    });

    // Merge both, sort by startedAt DESC, take first `limit`
    const merged = [...enrichmentRuns, ...cronRuns]
      .sort((a, b) => {
        const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
        const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, limit);

    return NextResponse.json({
      runs: merged,
      total: merged.length,
    });
  } catch (error) {
    console.error("[Admin Automations] Runs list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch automation runs" },
      { status: 500 }
    );
  }
}
