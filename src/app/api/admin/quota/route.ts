import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;

// Map enrichment sources to provider names for quota tracking
const PROVIDER_MAP: Record<string, string> = {
  contactout: "ContactOut",
  exa: "Exa",
  edgar: "SEC EDGAR",
  claude: "Claude AI",
};

interface ProspectRow {
  enrichment_source_status: Record<string, unknown> | string | null;
  updated_at: string | null;
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
    const daysParam = parseInt(
      searchParams.get("days") ?? String(DEFAULT_DAYS),
      10
    );
    const days =
      isNaN(daysParam) || daysParam < 1
        ? DEFAULT_DAYS
        : Math.min(daysParam, MAX_DAYS);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const admin = createAdminClient();

    // Count successful API calls per provider by scanning enrichment_source_status
    const { data: prospects, error } = await admin
      .from("prospects")
      .select("enrichment_source_status, updated_at")
      .not("enrichment_source_status", "is", null)
      .gte("updated_at", cutoff.toISOString())
      .limit(10000);

    if (error) {
      throw new Error(`Quota query failed: ${error.message}`);
    }

    // Count total API calls (both success and failed) per provider
    const totals: Record<string, number> = {};
    for (const key of Object.keys(PROVIDER_MAP)) {
      totals[PROVIDER_MAP[key]] = 0;
    }

    for (const row of (prospects ?? []) as ProspectRow[]) {
      if (!row.enrichment_source_status) continue;
      if (typeof row.enrichment_source_status === "string") continue;

      for (const [source, entry] of Object.entries(
        row.enrichment_source_status
      )) {
        const key = source.toLowerCase();
        const providerName = PROVIDER_MAP[key];
        if (!providerName) continue;

        // Count any call that resulted in a status (success or failed)
        let status = "unknown";
        if (typeof entry === "string") {
          status = entry;
        } else if (typeof entry === "object" && entry !== null) {
          status = (entry as Record<string, unknown>).status as string ?? "unknown";
        }

        if (
          status === "complete" ||
          status === "success" ||
          status === "failed" ||
          status === "error"
        ) {
          totals[providerName] = (totals[providerName] ?? 0) + 1;
        }
      }
    }

    // Also count Apollo API calls from activity_log (search_executed)
    const { count: apolloCalls } = await admin
      .from("activity_log")
      .select("*", { count: "exact", head: true })
      .eq("action_type", "search_executed")
      .gte("created_at", cutoff.toISOString());

    totals["Apollo"] = apolloCalls ?? 0;

    return NextResponse.json({ totals, days });
  } catch (error) {
    console.error("Quota API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quota data" },
      { status: 500 }
    );
  }
}
