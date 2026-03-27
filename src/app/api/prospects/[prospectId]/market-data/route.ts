/*
 * SQL MIGRATION — run manually in Supabase SQL Editor:
 *
 * ALTER TABLE prospects
 *   ADD COLUMN stock_snapshot jsonb DEFAULT NULL,
 *   ADD COLUMN stock_snapshot_at timestamptz DEFAULT NULL;
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/error-logger";
import { fetchMarketSnapshot, type InsiderData } from "@/lib/enrichment/market-data";

/**
 * POST /api/prospects/[prospectId]/market-data
 *
 * Fetches current stock quote from Finnhub (free) and 1-year daily
 * closes from Yahoo Finance (free, no key). Computes performance
 * metrics and optionally estimates equity position from SEC insider data.
 *
 * Returns:
 * - 200: Snapshot built and saved
 * - 400: Missing ticker symbol
 * - 401: Not authenticated
 * - 404: Prospect not found or doesn't belong to tenant
 * - 500: Server error
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ prospectId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      return NextResponse.json(
        { error: "No tenant ID found in session" },
        { status: 401 }
      );
    }

    const { prospectId } = await context.params;

    const { data: prospect, error: fetchError } = await supabase
      .from("prospects")
      .select(
        "id, tenant_id, publicly_traded_symbol, insider_data"
      )
      .eq("id", prospectId)
      .single();

    if (fetchError || !prospect) {
      return NextResponse.json(
        { error: "Prospect not found" },
        { status: 404 }
      );
    }

    if (prospect.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: "Prospect not found" },
        { status: 404 }
      );
    }

    const ticker = prospect.publicly_traded_symbol;
    if (!ticker) {
      return NextResponse.json(
        { error: "Prospect has no publicly traded symbol" },
        { status: 400 }
      );
    }

    const snapshot = await fetchMarketSnapshot(ticker, prospect.insider_data as InsiderData | null);

    // Write to DB (fire-and-forget style — return snapshot even if write fails)
    try {
      const adminClient = createAdminClient();
      await adminClient
        .from("prospects")
        .update({
          stock_snapshot: snapshot as unknown as Record<string, unknown>,
          stock_snapshot_at: snapshot.fetchedAt,
        })
        .eq("id", prospectId);
    } catch (dbErr) {
      console.error("[market-data] DB write failed:", dbErr);
    }

    return NextResponse.json(snapshot, { status: 200 });
  } catch (error) {
    console.error("[market-data] Error:", error);
    logError({
      route: "/api/prospects/[prospectId]/market-data",
      method: "POST",
      statusCode: 500,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
