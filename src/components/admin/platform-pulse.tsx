"use client";

import { Activity } from "lucide-react";

interface SparklineData {
  days: string[];
  prospects: number[];
  users: number[];
}

interface PlatformPulseProps {
  data: {
    totalProspects: number;
    enrichmentCoverage: number;
    enrichmentFailed: number;
    activeUsersToday: number;
    activeUsers7dAvg: number;
    sparklines?: SparklineData;
  } | null;
  quotaData?: { totals: Record<string, number>; days: number } | null;
}

/**
 * GitHub-style SVG sparkline — a smooth area chart with a gradient fill.
 */
function Sparkline({
  data,
  color,
  height = 32,
  width = 160,
}: {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}) {
  if (data.length === 0) return null;

  const max = Math.max(...data, 1); // avoid division by 0
  const padding = 1;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  // Build points
  const points = data.map((v, i) => ({
    x: padding + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padding + chartH - (v / max) * chartH,
  }));

  // Smooth cubic bezier path
  const linePath = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x},${p.y}`;
      const prev = points[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
    })
    .join(" ");

  // Area fill path (close to bottom)
  const areaPath = `${linePath} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  const gradientId = `sparkline-grad-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradientId})`} />
      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* End dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2"
        fill={color}
      />
    </svg>
  );
}

export function PlatformPulse({ data }: PlatformPulseProps) {
  if (data === null) {
    return (
      <div className="surface-admin-card rounded-[14px] p-6 animate-pulse">
        <div className="h-3 w-32 bg-white/[0.06] rounded mb-5" />
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="flex justify-between items-end mb-2">
                <div className="h-3 w-24 bg-white/[0.06] rounded" />
                <div className="h-5 w-16 bg-white/[0.06] rounded" />
              </div>
              <div className="w-full h-8 rounded bg-white/[0.03]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const successRate =
    data.totalProspects > 0
      ? Math.round(
          ((data.totalProspects - data.enrichmentFailed) / data.totalProspects) * 100
        )
      : 0;

  const prospectsDisplay =
    data.totalProspects >= 1000
      ? (data.totalProspects / 1000).toFixed(0) + "k"
      : data.totalProspects.toLocaleString();

  // Derive success rate sparkline from prospects sparkline if available
  // (not per-day granularity available for success, so just show the bar for success rate)
  const sparklines = data.sparklines;

  const metrics = [
    {
      label: "Active Users",
      value: data.activeUsersToday.toLocaleString(),
      sparkData: sparklines?.users,
      color: "var(--gold-primary)",
      fallbackColor: "#c9a84c",
      valueColor: "var(--text-primary-ds)",
    },
    {
      label: "Prospects Scraped",
      value: prospectsDisplay,
      sparkData: sparklines?.prospects,
      color: "var(--gold-primary)",
      fallbackColor: "#c9a84c",
      valueColor: "var(--text-primary-ds)",
    },
    {
      label: "Success Rate",
      value: successRate + "%",
      sparkData: null, // keep as progress bar — rate doesn't have daily granularity
      pct: successRate,
      color: "var(--success)",
      fallbackColor: "#34d399",
      valueColor: "var(--success)",
    },
  ];

  return (
    <div className="surface-admin-card rounded-[14px] p-6 relative overflow-hidden group">
      {/* Decorative background icon */}
      <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-[0.05] group-hover:opacity-[0.10] transition-opacity">
        <Activity className="h-20 w-20" style={{ color: "var(--gold-primary)" }} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Card header */}
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-4 flex items-center gap-2"
          style={{ color: "var(--admin-text-secondary)" }}
        >
          <span
            className="size-2 rounded-full animate-pulse"
            style={{ background: "var(--gold-primary)" }}
          />
          Platform Pulse
        </p>

        {/* 3 metric rows */}
        <div className="space-y-4">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-xs" style={{ color: "var(--admin-text-secondary)" }}>
                  {metric.label}
                </span>
                <span
                  className="font-mono text-lg"
                  style={{ color: metric.valueColor }}
                >
                  {metric.value}
                </span>
              </div>
              {metric.sparkData ? (
                <Sparkline data={metric.sparkData} color={metric.fallbackColor} width={260} height={32} />
              ) : (
                <div
                  className="w-full h-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div
                    className="h-1 rounded-full transition-all duration-500"
                    style={{ width: `${metric.pct ?? 0}%`, background: metric.color }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
