import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface SourceStatus {
  status: string;
  error?: string;
  at?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const admin = createAdminClient();

    // ── Enrich Prospect run detail ──
    if (type === "enrich-prospect") {
      const { data: prospect, error } = await admin
        .from("prospects")
        .select(
          "id, full_name, title, current_company, enrichment_status, enrichment_started_at, enriched_at, enrichment_source_status, inngest_event_id"
        )
        .eq("id", id)
        .single();

      if (error || !prospect) {
        return NextResponse.json(
          { error: "Run not found" },
          { status: 404 }
        );
      }

      const startedAt = prospect.enrichment_started_at;
      const finishedAt = prospect.enriched_at;
      const durationMs =
        startedAt && finishedAt
          ? new Date(finishedAt).getTime() - new Date(startedAt).getTime()
          : null;

      // Build source breakdown from enrichment_source_status JSONB
      const rawSources = (prospect.enrichment_source_status ?? {}) as Record<
        string,
        SourceStatus
      >;
      const sourceBreakdown = Object.entries(rawSources).map(
        ([name, info]) => ({
          name,
          status: info?.status ?? "unknown",
          error: info?.error ?? null,
          at: info?.at ?? null,
        })
      );

      // Optional: fetch Inngest API for step-level data
      let inngestRunData = null;
      if (prospect.inngest_event_id) {
        try {
          const signingKey = process.env.INNGEST_SIGNING_KEY;
          if (signingKey) {
            const res = await fetch(
              `https://api.inngest.com/v1/events/${prospect.inngest_event_id}/runs`,
              { headers: { Authorization: `Bearer ${signingKey}` } }
            );
            if (res.ok) {
              const json = await res.json();
              inngestRunData = json.data?.[0] || null;
            }
          }
        } catch (e) {
          console.warn("[Admin Automations] Inngest API fetch failed:", e);
        }
      }

      return NextResponse.json({
        functionId: "enrich-prospect",
        functionName: "Enrich Prospect",
        id: prospect.id,
        status: prospect.enrichment_status,
        startedAt,
        finishedAt,
        durationMs,
        prospect: {
          name: prospect.full_name,
          title: prospect.title,
          company: prospect.current_company,
        },
        sourceBreakdown,
        inngestEventId: prospect.inngest_event_id,
        inngestRunData,
      });
    }

    // ── Aggregate Daily Metrics run detail ──
    if (type === "aggregate-daily-metrics") {
      const { data: entry, error } = await admin
        .from("activity_log")
        .select("id, created_at, metadata")
        .eq("id", id)
        .single();

      if (error || !entry) {
        return NextResponse.json(
          { error: "Run not found" },
          { status: 404 }
        );
      }

      const meta = entry.metadata as Record<string, unknown> | null;
      const durationMs = meta?.durationMs ? Number(meta.durationMs) : null;

      return NextResponse.json({
        functionId: "aggregate-daily-metrics",
        functionName: "Aggregate Daily Metrics",
        id: entry.id,
        status: "complete",
        startedAt: entry.created_at,
        finishedAt: entry.created_at,
        durationMs,
        metadata: meta,
      });
    }

    return NextResponse.json(
      { error: "Missing or invalid 'type' query parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Admin Automations] Run detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch run detail" },
      { status: 500 }
    );
  }
}
