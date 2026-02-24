import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SOURCES = ["contactout", "exa", "edgar", "claude"] as const;
const MAX_DAYS = 90;
const DEFAULT_DAYS = 14;

interface ProspectRow {
  enrichment_source_status: Record<string, unknown> | string | null;
  updated_at: string | null;
}

interface DayBucket {
  [key: string]: number;
}

export async function GET(request: NextRequest) {
  try {
    // Guard: Only super admin can access enrichment health
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

    // Query prospects with enrichment_source_status in the time window
    const { data: prospects, error } = await admin
      .from("prospects")
      .select("enrichment_source_status, updated_at")
      .not("enrichment_source_status", "is", null)
      .gte("updated_at", cutoff.toISOString());

    if (error) {
      throw new Error(`Prospects query failed: ${error.message}`);
    }

    // In-memory aggregation: group by date x source x status
    const buckets = new Map<string, DayBucket>();

    for (const prospect of prospects ?? []) {
      const p = prospect as ProspectRow;
      if (!p.updated_at || !p.enrichment_source_status) continue;

      const date = p.updated_at.split("T")[0]; // "YYYY-MM-DD"
      const sourceStatus = p.enrichment_source_status;

      if (!buckets.has(date)) {
        buckets.set(date, {});
      }
      const bucket = buckets.get(date)!;

      // Handle both object format { source: { status, error, at } } and legacy string formats
      if (typeof sourceStatus === "object" && sourceStatus !== null) {
        for (const source of SOURCES) {
          const entry = (sourceStatus as Record<string, unknown>)[source];
          if (!entry) continue;

          let status: string;
          if (typeof entry === "string") {
            // Backward compat: "complete" or "failed" as plain string
            status = entry === "complete" ? "success" : entry === "failed" ? "failed" : entry;
          } else if (typeof entry === "object" && entry !== null) {
            const entryObj = entry as Record<string, unknown>;
            const rawStatus = entryObj.status as string | undefined;
            status = rawStatus === "complete" ? "success" : rawStatus === "failed" ? "failed" : (rawStatus ?? "unknown");
          } else {
            continue;
          }

          if (status === "success" || status === "failed") {
            const key = `${source}_${status}`;
            bucket[key] = (bucket[key] ?? 0) + 1;
          }
        }
      }
    }

    // Build sorted date array and flatten to Recharts-friendly format
    const sortedDates = Array.from(buckets.keys()).sort();
    const data = sortedDates.map((date) => {
      const bucket = buckets.get(date)!;
      const row: Record<string, string | number> = { date };
      for (const source of SOURCES) {
        row[`${source}_success`] = bucket[`${source}_success`] ?? 0;
        row[`${source}_failed`] = bucket[`${source}_failed`] ?? 0;
      }
      return row;
    });

    return NextResponse.json({ data, days });
  } catch (error) {
    console.error("Enrichment health API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrichment health data" },
      { status: 500 }
    );
  }
}
