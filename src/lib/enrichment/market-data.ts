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

export interface InsiderData {
  transactions?: Array<{ transactionType: string; shares: number }>;
}

/**
 * Fetches current stock quote from Finnhub (free) and 1-year daily
 * closes from Yahoo Finance (free, no key). Computes performance
 * metrics and optionally estimates equity position from insider data.
 *
 * Throws if FINNHUB_API_KEY is missing or if no quote data is returned.
 */
export async function fetchMarketSnapshot(
  ticker: string,
  insiderData?: InsiderData | null
): Promise<StockSnapshot> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY not configured");
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
    throw new Error(`Finnhub quote error: ${quoteRes.status}`);
  }

  const quote: FinnhubQuote = await quoteRes.json();
  if (!quote.c || quote.c === 0) {
    throw new Error("No quote data returned — ticker may be invalid");
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

  // Keep full 1-year sparkline (Yahoo returns ~251 trading days)
  const sparkline = closes;

  // Estimate equity position from insiderData if available
  let equity: StockSnapshot["equity"] = null;

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

  return {
    ticker,
    currentPrice: quote.c,
    currency: "USD",
    fetchedAt: new Date().toISOString(),
    performance,
    sparkline,
    equity,
  };
}
