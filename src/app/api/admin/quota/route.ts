import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redis } from "@/lib/cache/redis";

export const dynamic = "force-dynamic";

const PROVIDERS = ["apollo", "contactout", "exa", "edgar", "claude"] as const;
const DEFAULT_DAYS = 7;

export async function GET(request: NextRequest) {
  // Inline super_admin check — NOT requireSuperAdmin() (Phase 04 decision: avoid redirect() 500 in Route Handler context)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? String(DEFAULT_DAYS), 10);

  // Build date strings for the last N days
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  // Build all Redis keys: api_usage:{provider}:{date}
  const keys = PROVIDERS.flatMap((p) => dates.map((d) => `api_usage:${p}:${d}`));

  try {
    const values = await redis.mget<(number | null)[]>(...keys);
    // Aggregate by provider — each provider has `days` consecutive entries
    const totals: Record<string, number> = {};
    PROVIDERS.forEach((p, pi) => {
      totals[p] = dates.reduce((sum, _, di) => {
        const idx = pi * days + di;
        return sum + (values[idx] ?? 0);
      }, 0);
    });
    return NextResponse.json({ totals, days });
  } catch {
    // Redis unavailable — degrade gracefully, return zeros
    const totals = Object.fromEntries(PROVIDERS.map((p) => [p, 0]));
    return NextResponse.json({ totals, days });
  }
}
