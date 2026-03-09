import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;
const MAX_ROWS = 10000;

const FUNNEL_ACTIONS = [
  "search_executed",
  "profile_viewed",
  "profile_enriched",
  "csv_exported",
] as const;

const STAGE_LABELS: Record<string, string> = {
  search_executed: "Searches",
  profile_viewed: "Profile Views",
  profile_enriched: "Enrichments",
  csv_exported: "Exports",
};

interface ActivityRow {
  action_type: string;
}

export async function GET(request: NextRequest) {
  try {
    // Guard: Only super admin can access funnel data
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const daysParam = parseInt(searchParams.get("days") ?? String(DEFAULT_DAYS), 10);
    const days = isNaN(daysParam) || daysParam < 1 ? DEFAULT_DAYS : Math.min(daysParam, MAX_DAYS);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const admin = createAdminClient();

    // Fetch activity log rows for funnel action types within time window
    // Use in-memory aggregation since Supabase JS doesn't support GROUP BY + COUNT natively
    const { data: rows, error } = await admin
      .from("activity_log")
      .select("action_type")
      .in("action_type", [...FUNNEL_ACTIONS])
      .gte("created_at", cutoff.toISOString())
      .limit(MAX_ROWS);

    if (error) {
      throw new Error(`Activity log query failed: ${error.message}`);
    }

    // Count by action_type in memory
    const counts = new Map<string, number>(
      FUNNEL_ACTIONS.map((action) => [action, 0])
    );
    for (const row of rows ?? []) {
      const r = row as ActivityRow;
      if (counts.has(r.action_type)) {
        counts.set(r.action_type, (counts.get(r.action_type) ?? 0) + 1);
      }
    }

    // Build funnel data in the fixed order
    const data = FUNNEL_ACTIONS.map((action) => ({
      stage: STAGE_LABELS[action],
      value: counts.get(action) ?? 0,
    }));

    return NextResponse.json({ data, days });
  } catch (error) {
    console.error("Funnel API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch funnel data" },
      { status: 500 }
    );
  }
}
