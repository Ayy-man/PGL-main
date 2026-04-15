"use client";

import { useState, useEffect, useRef } from "react";
import { TrendingUp, RefreshCw, Loader2, BarChart3 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours
import type { StockSnapshot } from "@/types/database";

interface MarketIntelligenceCardProps {
  prospectId: string;
  orgId: string; // kept for future drill-down links
  ticker: string | null;
  initialSnapshot: StockSnapshot | null;
  snapshotAt: string | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHr = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffHr / 24);
  if (diffHr < 1) return "just now";
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function CustomTooltip({
  active,
  payload,
  label,
  periodStartPrice,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  periodStartPrice: number;
}) {
  if (!active || !payload?.length) return null;
  const price = payload[0].value;
  const changeFromStart =
    periodStartPrice !== 0
      ? ((price - periodStartPrice) / periodStartPrice) * 100
      : 0;
  const isUp = changeFromStart >= 0;

  return (
    <div
      className="rounded-[8px] px-3 py-2.5 shadow-lg"
      style={{
        background: "rgba(8, 8, 10, 0.9)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p
        className="text-base font-bold font-mono"
        style={{ color: "var(--gold-primary)" }}
      >
        {formatPrice(price)}
      </p>
      <p
        className="text-xs font-mono mt-0.5"
        style={{ color: isUp ? "#22c55e" : "#ef4444" }}
      >
        {isUp ? "+" : ""}
        {changeFromStart.toFixed(2)}% from period start
      </p>
    </div>
  );
}

export function MarketIntelligenceCard({
  prospectId,
  orgId: _orgId,
  ticker,
  initialSnapshot,
  snapshotAt,
}: MarketIntelligenceCardProps) {
  const [snapshot, setSnapshot] = useState<StockSnapshot | null>(
    initialSnapshot
  );
  const [fetchedAt, setFetchedAt] = useState<string | null>(snapshotAt);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<"7D" | "30D" | "90D" | "1Y">("90D");
  const autoFetchedRef = useRef(false);

  // Auto-refresh on mount if snapshot is stale (>4h) or missing
  useEffect(() => {
    if (autoFetchedRef.current || !ticker) return;
    const isStale =
      !snapshotAt ||
      Date.now() - new Date(snapshotAt).getTime() > STALE_THRESHOLD_MS;
    if (isStale) {
      autoFetchedRef.current = true;
      // Silent background fetch — no loading spinner for auto-refresh
      fetch(`/api/prospects/${prospectId}/market-data`, { method: "POST" })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          setSnapshot(data);
          setFetchedAt(data.fetchedAt);
        })
        .catch(() => {
          // Silent fail — user can manually retry
        });
    }
  }, [ticker, snapshotAt, prospectId]);

  if (!ticker) {
    return (
      <section className="rounded-xl border border-border/40 bg-card/50 p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BarChart3 className="h-5 w-5" />
          <h2 className="font-serif text-lg font-semibold">Market Intelligence</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          No public ticker found for this company. Market data is only available for publicly traded companies.
        </p>
      </section>
    );
  }

  const handleFetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/prospects/${prospectId}/market-data`,
        { method: "POST" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const data: StockSnapshot = await res.json();
      setSnapshot(data);
      setFetchedAt(data.fetchedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setIsLoading(false);
    }
  };

  // No snapshot yet — show fetch button
  if (!snapshot) {
    return (
      <div className="surface-card rounded-[14px] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground text-lg font-bold font-serif flex items-center gap-2">
            <BarChart3
              className="h-5 w-5 shrink-0"
              style={{ color: "var(--gold-primary)" }}
            />
            Market Intelligence
          </h3>
          <span
            className="text-xs font-bold px-2 py-1 rounded font-mono"
            style={{
              background: "rgba(255,255,255,0.03)",
              border:
                "1px solid var(--border-default, rgba(255,255,255,0.06))",
              color:
                "var(--text-primary-ds, var(--text-primary, #e8e4dc))",
            }}
          >
            {ticker}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Fetch live stock data, performance metrics, and equity estimates.
        </p>
        {error && (
          <p className="text-xs mb-3" style={{ color: "var(--destructive, #ef4444)" }}>
            {error}
          </p>
        )}
        <button
          onClick={handleFetch}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "rgba(var(--gold-primary-rgb), 0.08)",
            border: "1px solid rgba(var(--gold-primary-rgb), 0.2)",
            color: "var(--gold-primary)",
          }}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
          {isLoading ? "Fetching..." : "Get Market Data"}
        </button>
      </div>
    );
  }

  // Full card with snapshot data
  const perf = snapshot.performance;
  const significantGain =
    snapshot.equity && Math.abs(snapshot.equity.gain90d) > 100_000;

  // Transform sparkline number[] -> {date: Date, label: string, price: number}[]
  // Sparkline has ~251 trading days spanning ~365 calendar days.
  // Map each data point to an actual calendar date by spacing proportionally.
  const now = new Date();
  const sparkLen = snapshot.sparkline.length;
  const fullData = snapshot.sparkline.map((price, i) => {
    // Spread trading days across 365 calendar days proportionally
    const calendarDaysAgo = Math.round(
      ((sparkLen - 1 - i) / Math.max(sparkLen - 1, 1)) * 365
    );
    const d = new Date(now.getTime() - calendarDaysAgo * 86400000);
    return {
      dateObj: d,
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      price,
    };
  });

  // Filter by active period using actual calendar dates
  const periodCalendarDays: Record<string, number> = {
    "7D": 7,
    "30D": 30,
    "90D": 90,
    "1Y": 365,
  };
  const cutoffDate = new Date(
    now.getTime() - periodCalendarDays[activePeriod] * 86400000
  );
  const chartData = fullData.filter((d) => d.dateObj >= cutoffDate);

  // Determine chart color from the actual performance metric for this period
  const perfMap: Record<string, number> = {
    "7D": perf.d7,
    "30D": perf.d30,
    "90D": perf.d90,
    "1Y": perf.y1,
  };
  const periodPerf = perfMap[activePeriod] ?? 0;
  const chartColor = periodPerf >= 0 ? "#d4af37" : "#ef4444"; // gold vs red

  // Format fetchedAt as "Mar 27, 2026"
  const fetchedAtFormatted = fetchedAt
    ? new Date(fetchedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="surface-card rounded-[14px] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-foreground text-lg font-bold font-serif flex items-center gap-2">
          <BarChart3
            className="h-5 w-5 shrink-0"
            style={{ color: "var(--gold-primary)" }}
          />
          Market Intelligence
        </h3>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-2 py-1 rounded font-mono"
            style={{
              background: "rgba(255,255,255,0.03)",
              border:
                "1px solid var(--border-default, rgba(255,255,255,0.06))",
              color:
                "var(--text-primary-ds, var(--text-primary, #e8e4dc))",
            }}
          >
            {snapshot.ticker}
          </span>
          <button
            onClick={handleFetch}
            disabled={isLoading}
            className="p-1.5 rounded-[6px] transition-colors cursor-pointer disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.03)",
              border:
                "1px solid var(--border-default, rgba(255,255,255,0.06))",
              color: "var(--text-secondary, rgba(232,228,220,0.5))",
            }}
            title="Refresh market data"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs mb-3" style={{ color: "var(--destructive, #ef4444)" }}>
          {error}
        </p>
      )}

      {/* Enhanced Current Price Header */}
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Current Price
        </p>
        <div className="flex items-baseline gap-2">
          <p
            className="text-2xl font-bold font-mono"
            style={{ color: "var(--gold-primary)" }}
          >
            {formatPrice(snapshot.currentPrice)}
          </p>
          {chartData.length >= 2 && (() => {
            const startPrice = chartData[0].price;
            const pctChange = ((snapshot.currentPrice - startPrice) / startPrice) * 100;
            const dollarChange = snapshot.currentPrice - startPrice;
            return (
              <span
                className="text-sm font-mono font-medium"
                style={{ color: dollarChange >= 0 ? "#22c55e" : "#ef4444" }}
              >
                {dollarChange >= 0 ? "+" : ""}
                {formatPrice(dollarChange)} ({dollarChange >= 0 ? "+" : ""}
                {pctChange.toFixed(1)}%)
              </span>
            );
          })()}
        </div>
        {fetchedAtFormatted && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            As of {fetchedAtFormatted}
          </p>
        )}
      </div>

      {/* Interactive Recharts AreaChart */}
      {chartData.length > 1 && (
        <div className="mb-4 rounded-lg overflow-hidden" style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart
              key={activePeriod}
              data={chartData}
              margin={{ top: 10, right: 60, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={chartColor}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="100%"
                    stopColor={chartColor}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.03)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  fill: "var(--text-tertiary, rgba(232,228,220,0.35))",
                }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                orientation="right"
                tick={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  fill: "var(--text-tertiary, rgba(232,228,220,0.35))",
                }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                domain={["dataMin - 1", "dataMax + 1"]}
                width={55}
                padding={{ top: 10, bottom: 10 }}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    periodStartPrice={chartData[0]?.price ?? 0}
                  />
                }
                cursor={{
                  stroke: "rgba(255,255,255,0.2)",
                  strokeDasharray: "4 4",
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#priceGradient)"
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Interactive Period Buttons */}
      <div className="flex gap-2 mb-4">
        {(
          [
            { key: "7D" as const, label: "7D", value: perf.d7 },
            { key: "30D" as const, label: "30D", value: perf.d30 },
            { key: "90D" as const, label: "90D", value: perf.d90 },
            { key: "1Y" as const, label: "1Y", value: perf.y1 },
          ] as const
        ).map(({ key, label, value }) => {
          const isActive = activePeriod === key;
          const isPositive = value >= 0;
          return (
            <button
              key={key}
              onClick={() => setActivePeriod(key)}
              className="flex-1 flex flex-col items-center rounded-[8px] px-3 py-2 transition-all cursor-pointer"
              style={{
                background: isActive
                  ? "rgba(var(--gold-primary-rgb), 0.15)"
                  : "rgba(255,255,255,0.02)",
                border: isActive
                  ? "1px solid rgba(var(--gold-primary-rgb), 0.4)"
                  : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                className="text-[10px] uppercase tracking-wider mb-0.5"
                style={{
                  color: isActive
                    ? "var(--gold-primary)"
                    : "var(--text-secondary, rgba(232,228,220,0.5))",
                }}
              >
                {label}
              </span>
              <span
                className="text-xs font-bold font-mono"
                style={{ color: isPositive ? "#22c55e" : "#ef4444" }}
              >
                {isPositive ? "+" : ""}
                {value.toFixed(1)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Equity position */}
      {snapshot.equity && (
        <div
          className="pt-4"
          style={{
            borderTop:
              "1px solid var(--border-default, rgba(255,255,255,0.06))",
          }}
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
            Estimated Equity Position
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">
                Shares
              </p>
              <p className="text-sm font-semibold font-mono text-foreground">
                {formatNumber(snapshot.equity.estimatedShares)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">
                Value
              </p>
              <p
                className="text-sm font-semibold font-mono"
                style={{ color: "var(--gold-primary)" }}
              >
                {formatCurrency(snapshot.equity.currentValue)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">
                90D Gain
              </p>
              <p
                className="text-sm font-semibold font-mono"
                style={{
                  color:
                    snapshot.equity.gain90d >= 0
                      ? "var(--success, #22c55e)"
                      : "var(--destructive, #ef4444)",
                }}
              >
                {snapshot.equity.gain90d >= 0 ? "+" : ""}
                {formatCurrency(snapshot.equity.gain90d)}
              </p>
            </div>
          </div>
          {significantGain && (
            <div
              className="mt-3 rounded-[8px] px-3 py-2 text-xs"
              style={{
                background:
                  snapshot.equity!.gain90d >= 0
                    ? "rgba(34,197,94,0.06)"
                    : "rgba(239,68,68,0.06)",
                border: `1px solid ${
                  snapshot.equity!.gain90d >= 0
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(239,68,68,0.15)"
                }`,
                color:
                  snapshot.equity!.gain90d >= 0
                    ? "var(--success, #22c55e)"
                    : "var(--destructive, #ef4444)",
              }}
            >
              {snapshot.equity!.gain90d >= 0
                ? "Significant 90-day equity gain — potential liquidity event window"
                : "Significant 90-day equity decline — may impact sentiment"}
            </div>
          )}
        </div>
      )}

      {/* Timestamp */}
      {fetchedAt && (
        <p className="text-[10px] text-muted-foreground mt-4 text-right">
          Updated {formatRelative(fetchedAt)}
        </p>
      )}
    </div>
  );
}
