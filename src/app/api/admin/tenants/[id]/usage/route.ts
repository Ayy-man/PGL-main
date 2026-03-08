import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface MetricsRow {
  date: string;
  total_logins: number;
  searches_executed: number;
  profiles_viewed: number;
  profiles_enriched: number;
  csv_exports: number;
}

function computeChange(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "+100%" : "0%";
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Guard: Only super admin can access tenant usage
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const admin = createAdminClient();

    // Date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const currentStart = thirtyDaysAgo.toISOString().split("T")[0];
    const previousStart = sixtyDaysAgo.toISOString().split("T")[0];

    // Fetch last 60 days of metrics (covers both current and previous periods)
    const { data: allMetrics, error } = await admin
      .from("usage_metrics_daily")
      .select(
        "date, total_logins, searches_executed, profiles_viewed, profiles_enriched, csv_exports"
      )
      .eq("tenant_id", id)
      .gte("date", previousStart)
      .order("date", { ascending: true });

    if (error) {
      throw new Error(`Usage metrics query failed: ${error.message}`);
    }

    // Split into current (last 30 days) and previous (30-60 days ago) periods
    const currentMetrics: MetricsRow[] = [];
    const previousMetrics: MetricsRow[] = [];

    for (const row of (allMetrics ?? []) as MetricsRow[]) {
      if (row.date >= currentStart) {
        currentMetrics.push(row);
      } else {
        previousMetrics.push(row);
      }
    }

    // Aggregate totals for current period
    const totals = {
      logins: 0,
      searches: 0,
      profiles_viewed: 0,
      profiles_enriched: 0,
      csv_exports: 0,
    };
    for (const row of currentMetrics) {
      totals.logins += row.total_logins ?? 0;
      totals.searches += row.searches_executed ?? 0;
      totals.profiles_viewed += row.profiles_viewed ?? 0;
      totals.profiles_enriched += row.profiles_enriched ?? 0;
      totals.csv_exports += row.csv_exports ?? 0;
    }

    // Aggregate totals for previous period
    const previous = {
      logins: 0,
      searches: 0,
      profiles_viewed: 0,
      profiles_enriched: 0,
      csv_exports: 0,
    };
    for (const row of previousMetrics) {
      previous.logins += row.total_logins ?? 0;
      previous.searches += row.searches_executed ?? 0;
      previous.profiles_viewed += row.profiles_viewed ?? 0;
      previous.profiles_enriched += row.profiles_enriched ?? 0;
      previous.csv_exports += row.csv_exports ?? 0;
    }

    // Build sparkline data (daily values for current period)
    type SparklinePoint = { date: string; value: number };
    const sparklines: Record<string, SparklinePoint[]> = {
      logins: [],
      searches: [],
      profiles_viewed: [],
      profiles_enriched: [],
      csv_exports: [],
    };

    for (const row of currentMetrics) {
      sparklines.logins.push({ date: row.date, value: row.total_logins ?? 0 });
      sparklines.searches.push({
        date: row.date,
        value: row.searches_executed ?? 0,
      });
      sparklines.profiles_viewed.push({
        date: row.date,
        value: row.profiles_viewed ?? 0,
      });
      sparklines.profiles_enriched.push({
        date: row.date,
        value: row.profiles_enriched ?? 0,
      });
      sparklines.csv_exports.push({
        date: row.date,
        value: row.csv_exports ?? 0,
      });
    }

    // Compute % changes
    const changes = {
      logins: computeChange(totals.logins, previous.logins),
      searches: computeChange(totals.searches, previous.searches),
      profiles_viewed: computeChange(
        totals.profiles_viewed,
        previous.profiles_viewed
      ),
      profiles_enriched: computeChange(
        totals.profiles_enriched,
        previous.profiles_enriched
      ),
      csv_exports: computeChange(totals.csv_exports, previous.csv_exports),
    };

    return NextResponse.json({
      totals,
      sparklines,
      previous,
      changes,
    });
  } catch (error) {
    console.error("Failed to fetch tenant usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant usage" },
      { status: 500 }
    );
  }
}
