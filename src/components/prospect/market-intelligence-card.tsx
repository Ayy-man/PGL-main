"use client";

import { useState } from "react";
import { TrendingUp, RefreshCw, Loader2, BarChart3 } from "lucide-react";
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

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;

  const width = 200;
  const height = 40;
  const padding = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const isUp = data[data.length - 1] >= data[0];
  const strokeColor = isUp
    ? "var(--success, #22c55e)"
    : "var(--destructive, #ef4444)";

  // Build gradient fill path
  const fillPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height: 40 }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={strokeColor}
            stopOpacity="0.15"
          />
          <stop
            offset="100%"
            stopColor={strokeColor}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <polygon
        points={fillPoints}
        fill="url(#sparkFill)"
      />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PerfChip({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const isPositive = value >= 0;
  const color = isPositive
    ? "var(--success, #22c55e)"
    : "var(--destructive, #ef4444)";
  const bgColor = isPositive
    ? "rgba(34,197,94,0.1)"
    : "rgba(239,68,68,0.1)";
  const borderColor = isPositive
    ? "rgba(34,197,94,0.2)"
    : "rgba(239,68,68,0.2)";

  return (
    <div
      className="flex flex-col items-center rounded-[8px] px-3 py-2"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </span>
      <span
        className="text-xs font-bold font-mono"
        style={{ color }}
      >
        {isPositive ? "+" : ""}
        {value.toFixed(1)}%
      </span>
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

  if (!ticker) {
    return (
      <div className="surface-card rounded-[14px] p-5">
        <p className="text-sm text-muted-foreground">
          Market intelligence requires a publicly traded symbol.
        </p>
      </div>
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
            background: "rgba(212,175,55,0.08)",
            border: "1px solid rgba(212,175,55,0.2)",
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

      {/* Current Price */}
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Current Price
        </p>
        <p
          className="text-2xl font-bold font-mono"
          style={{ color: "var(--gold-primary)" }}
        >
          {formatPrice(snapshot.currentPrice)}
        </p>
      </div>

      {/* Sparkline */}
      {snapshot.sparkline.length > 1 && (
        <div className="mb-4">
          <Sparkline data={snapshot.sparkline} />
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            90-day price history
          </p>
        </div>
      )}

      {/* Performance chips */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <PerfChip label="7D" value={perf.d7} />
        <PerfChip label="30D" value={perf.d30} />
        <PerfChip label="90D" value={perf.d90} />
        <PerfChip label="1Y" value={perf.y1} />
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
