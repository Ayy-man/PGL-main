import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 14;
const MAX_DAYS = 90;

const SOURCES = ["contactout", "exa", "edgar", "claude"] as const;

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

    // Fetch prospects that have enrichment_source_status within the window
    const { data: prospects, error } = await admin
      .from("prospects")
      .select("enrichment_source_status, updated_at")
      .not("enrichment_source_status", "is", null)
      .gte("updated_at", cutoff.toISOString())
      .order("updated_at", { ascending: true })
      .limit(10000);

    if (error) {
      throw new Error(`Enrichment health query failed: ${error.message}`);
    }

    // Bucket by date → source → success/failed
    const buckets = new Map<
      string,
      Record<string, { success: number; failed: number }>
    >();

    for (const row of (prospects ?? []) as ProspectRow[]) {
      if (!row.updated_at || !row.enrichment_source_status) continue;
      if (typeof row.enrichment_source_status === "string") continue;

      const date = row.updated_at.slice(0, 10);
      if (!buckets.has(date)) {
        const empty: Record<string, { success: number; failed: number }> = {};
        for (const s of SOURCES) empty[s] = { success: 0, failed: 0 };
        buckets.set(date, empty);
      }

      const bucket = buckets.get(date)!;
      for (const [source, entry] of Object.entries(
        row.enrichment_source_status
      )) {
        const key = source.toLowerCase();
        if (!SOURCES.includes(key as (typeof SOURCES)[number])) continue;

        let status = "unknown";
        if (typeof entry === "string") {
          status = entry;
        } else if (typeof entry === "object" && entry !== null) {
          status = (entry as Record<string, unknown>).status as string ?? "unknown";
        }

        if (!bucket[key]) bucket[key] = { success: 0, failed: 0 };
        if (status === "complete" || status === "success") {
          bucket[key].success++;
        } else if (status === "failed" || status === "error") {
          bucket[key].failed++;
        }
      }
    }

    // Build sorted date-series output
    const data = Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, sources]) => ({
        date,
        contactout_success: sources.contactout?.success ?? 0,
        contactout_failed: sources.contactout?.failed ?? 0,
        exa_success: sources.exa?.success ?? 0,
        exa_failed: sources.exa?.failed ?? 0,
        edgar_success: sources.edgar?.success ?? 0,
        edgar_failed: sources.edgar?.failed ?? 0,
        claude_success: sources.claude?.success ?? 0,
        claude_failed: sources.claude?.failed ?? 0,
      }));

    return NextResponse.json({ data, days });
  } catch (error) {
    console.error("Enrichment health API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrichment health data" },
      { status: 500 }
    );
  }
}
