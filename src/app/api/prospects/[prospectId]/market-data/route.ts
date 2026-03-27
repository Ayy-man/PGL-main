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
import type { StockSnapshot } from "@/types/database";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

interface FinnhubQuote {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  h: number; // high
  l: number; // low
  o: number; // open
  pc: number; // previous close
  t: number; // timestamp
}

/** Yahoo Finance chart API response (v8, free, no key required) */
interface YahooChartResponse {
  chart: {
    result?: Array<{
      indicators: {
        quote: Array<{
          close: (number | null)[];
        }>;
      };
    }>;
    error?: { code: string; description: string };
  };
}

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

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "FINNHUB_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Fetch Finnhub quote + Yahoo Finance 1-year daily closes in parallel
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1y&interval=1d&includePrePost=false`;

    const [quoteRes, yahooRes] = await Promise.all([
      fetch(`${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`),
      fetch(yahooUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      }),
    ]);

    if (!quoteRes.ok) {
      return NextResponse.json(
        { error: `Finnhub quote error: ${quoteRes.status}` },
        { status: 502 }
      );
    }

    const quote: FinnhubQuote = await quoteRes.json();
    if (!quote.c || quote.c === 0) {
      return NextResponse.json(
        { error: "No quote data returned — ticker may be invalid" },
        { status: 400 }
      );
    }

    // Parse Yahoo Finance daily closes (free, no API key)
    let closes: number[] = [];
    if (yahooRes.ok) {
      try {
        const yahoo: YahooChartResponse = await yahooRes.json();
        const rawCloses = yahoo.chart.result?.[0]?.indicators?.quote?.[0]?.close;
        if (rawCloses) {
          closes = rawCloses.filter((v): v is number => v !== null && v !== undefined);
        }
      } catch {
        // Yahoo parse failed — proceed with empty closes
        console.warn("[market-data] Yahoo Finance parse failed, continuing without historical data");
      }
    }
    const len = closes.length;
    const lastClose = len > 0 ? closes[len - 1] : quote.c;

    const pctChange = (daysBack: number): number => {
      if (len < daysBack + 1) return 0;
      const oldPrice = closes[len - 1 - daysBack];
      if (!oldPrice || oldPrice === 0) return 0;
      return Number((((lastClose - oldPrice) / oldPrice) * 100).toFixed(2));
    };

    const performance = {
      d7: pctChange(7),
      d30: pctChange(30),
      d90: pctChange(90),
      y1: len >= 2 ? Number((((lastClose - closes[0]) / closes[0]) * 100).toFixed(2)) : 0,
    };

    // Build sparkline from last 90 candle closes
    const sparkline = closes.slice(Math.max(0, len - 90));

    // Estimate equity position from insider_data if available
    let equity: StockSnapshot["equity"] = null;
    const insiderData = prospect.insider_data as {
      transactions?: Array<{
        transactionType: string;
        shares: number;
      }>;
    } | null;

    if (insiderData?.transactions && insiderData.transactions.length > 0) {
      let netShares = 0;
      for (const tx of insiderData.transactions) {
        const t = tx.transactionType.toLowerCase();
        if (t === "purchase" || t === "award") {
          netShares += tx.shares;
        } else if (t === "sale") {
          netShares -= tx.shares;
        }
      }
      if (netShares > 0) {
        const price90dAgo = len > 90 ? closes[len - 1 - 90] : closes[0] ?? quote.c;
        equity = {
          estimatedShares: netShares,
          currentValue: Math.round(netShares * quote.c),
          gain90d: Math.round(netShares * (quote.c - price90dAgo)),
        };
      }
    }

    const snapshot: StockSnapshot = {
      ticker,
      currentPrice: quote.c,
      currency: "USD",
      fetchedAt: new Date().toISOString(),
      performance,
      sparkline,
      equity,
    };

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
