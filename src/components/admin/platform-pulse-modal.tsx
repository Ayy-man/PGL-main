"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// --- Types ---

interface SourceStat {
  source: string;
  key: string;
  success: number;
  failed: number;
  total: number;
  successRate: number;
}

interface TopTenant {
  tenantId: string;
  tenantName: string;
  activityCount: number;
}

interface PlatformPulseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    totalProspects: number;
    enrichmentCoverage: number;
    enrichmentFailed: number;
    activeUsersToday: number;
    activeUsers7dAvg: number;
    sparklines?: {
      days: string[];
      prospects: number[];
      users: number[];
    };
  } | null;
  sourceStats: SourceStat[];
  topTenants: TopTenant[];
}

// --- Color helpers ---

function getSourceColor(successRate: number): string {
  if (successRate >= 80) return "var(--success)";
  if (successRate >= 50) return "var(--warning)";
  return "oklch(0.62 0.19 22)";
}

function getSourceGlow(successRate: number): string {
  if (successRate >= 80) return "rgba(34,197,94,0.6)";
  if (successRate >= 50) return "rgba(245,158,11,0.6)";
  return "rgba(239,68,68,0.6)";
}

// --- Interactive Chart sub-component ---

function InteractiveChart({
  data,
  days,
  label,
  color,
}: {
  data: number[];
  days: string[];
  label: string;
  color: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const width = 500;
  const height = 200;
  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 10;
  const paddingBottom = 30;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const max = Math.max(...data, 1);

  // Build points
  const points = data.map((v, i) => ({
    x: paddingLeft + (i / Math.max(data.length - 1, 1)) * chartW,
    y: paddingTop + chartH - (v / max) * chartH,
  }));

  // Smooth cubic bezier path (same pattern as Sparkline)
  const linePath = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x},${p.y}`;
      const prev = points[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
    })
    .join(" ");

  // Area fill path (close to bottom of chart area)
  const areaPath = `${linePath} L ${points[points.length - 1].x},${paddingTop + chartH} L ${points[0].x},${paddingTop + chartH} Z`;

  // Average reference line
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const avgY = paddingTop + chartH - (avg / max) * chartH;

  // Gradient ID unique per label
  const gradientId = `pulse-modal-grad-${label.replace(/[^a-z0-9]/gi, "")}`;

  // Hitbox width per data point
  const hitboxWidth = chartW / data.length;

  // Format day label: "12 Mar"
  function formatDay(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${months[d.getMonth()]}`;
  }

  return (
    <div className="surface-admin-card rounded-[14px] p-4 md:p-6">
      <p
        className="text-[10px] font-semibold uppercase tracking-widest mb-3"
        style={{ color: "var(--admin-text-secondary)" }}
      >
        {label}
      </p>

      <div className="relative">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
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
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Average dashed reference line */}
          <line
            x1={paddingLeft}
            y1={avgY}
            x2={width - paddingRight}
            y2={avgY}
            stroke="var(--admin-text-secondary)"
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity="0.5"
          />
          <text
            x={width - paddingRight + 4}
            y={avgY + 3}
            fontSize="9"
            fill="var(--admin-text-secondary)"
          >
            avg
          </text>

          {/* X-axis day labels (every other day) */}
          {points.map((p, i) => {
            if (i % 2 !== 0) return null;
            const dayLabel = days[i] ? formatDay(days[i]) : "";
            return (
              <text
                key={i}
                x={p.x}
                y={height - 5}
                fontSize="9"
                fill="var(--admin-text-secondary)"
                textAnchor="middle"
              >
                {dayLabel}
              </text>
            );
          })}

          {/* Active vertical dashed line */}
          {activeIndex !== null && (
            <>
              <line
                x1={points[activeIndex].x}
                y1={paddingTop}
                x2={points[activeIndex].x}
                y2={paddingTop + chartH}
                strokeDasharray="2,2"
                stroke="var(--gold-primary)"
                opacity="0.4"
              />
              <circle
                cx={points[activeIndex].x}
                cy={points[activeIndex].y}
                r="4"
                fill={color}
              />
            </>
          )}

          {/* Invisible hitbox rects for hover detection */}
          {points.map((p, i) => (
            <rect
              key={i}
              x={p.x - hitboxWidth / 2}
              y={paddingTop}
              width={hitboxWidth}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          ))}
        </svg>

        {/* Tooltip (outside SVG, inside relative wrapper) */}
        {activeIndex !== null && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${(points[activeIndex].x / width) * 100}%`,
              bottom: `calc(100% - ${(points[activeIndex].y / height) * 100}% + 12px)`,
              transform: "translateX(-50%)",
            }}
          >
            <div
              className="surface-admin-card rounded-lg px-3 py-1.5 text-xs shadow-lg whitespace-nowrap"
              style={{ border: "1px solid var(--border-subtle)" }}
            >
              <span
                className="font-mono font-semibold"
                style={{ color: "var(--text-primary-ds)" }}
              >
                {data[activeIndex].toLocaleString()}
              </span>
              <span
                className="ml-1.5"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                {days[activeIndex] ? formatDay(days[activeIndex]) : ""}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Modal Component ---

export function PlatformPulseModal({
  open,
  onOpenChange,
  data,
  sourceStats,
  topTenants,
}: PlatformPulseModalProps) {
  if (!data) return null;

  const successRate =
    data.totalProspects > 0
      ? Math.round(
          ((data.totalProspects - data.enrichmentFailed) / data.totalProspects) * 100
        )
      : 0;

  const prospectsDisplay =
    data.totalProspects >= 1000
      ? (data.totalProspects / 1000).toFixed(1) + "k"
      : data.totalProspects.toLocaleString();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text-primary-ds)" }}>
            Platform Pulse
          </DialogTitle>
          <DialogDescription className="sr-only">
            Platform usage metrics and analytics overview
          </DialogDescription>
        </DialogHeader>

        {/* Section 2: Summary stat pills row */}
        <div className="flex flex-wrap gap-3">
          {/* Active Users */}
          <div
            className="flex-1 min-w-[120px] rounded-xl p-3 md:p-4 text-center"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--admin-text-secondary)" }}
            >
              Active Users
            </p>
            <p
              className="font-mono text-lg md:text-2xl font-semibold mt-1"
              style={{ color: "var(--text-primary-ds)" }}
            >
              {data.activeUsersToday.toLocaleString()}
            </p>
          </div>

          {/* Prospects Scraped */}
          <div
            className="flex-1 min-w-[120px] rounded-xl p-3 md:p-4 text-center"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--admin-text-secondary)" }}
            >
              Prospects Scraped
            </p>
            <p
              className="font-mono text-lg md:text-2xl font-semibold mt-1"
              style={{ color: "var(--text-primary-ds)" }}
            >
              {prospectsDisplay}
            </p>
          </div>

          {/* Success Rate */}
          <div
            className="flex-1 min-w-[120px] rounded-xl p-3 md:p-4 text-center"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--admin-text-secondary)" }}
            >
              Success Rate
            </p>
            <p
              className="font-mono text-lg md:text-2xl font-semibold mt-1"
              style={{ color: "var(--success)" }}
            >
              {successRate}%
            </p>
          </div>
        </div>

        {/* Section 3: Two large interactive SVG charts */}
        {data.sparklines ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <InteractiveChart
              data={data.sparklines.users}
              days={data.sparklines.days}
              label="Active Users (14d)"
              color="#d4af37"
            />
            <InteractiveChart
              data={data.sparklines.prospects}
              days={data.sparklines.days}
              label="Prospects Scraped (14d)"
              color="#d4af37"
            />
          </div>
        ) : (
          <div
            className="flex items-center justify-center h-32 rounded-[14px]"
            style={{ background: "var(--bg-elevated)" }}
          >
            <p className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
              No chart data available
            </p>
          </div>
        )}

        {/* Section 4: Enrichment source breakdown table */}
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--admin-text-secondary)" }}
          >
            Enrichment Sources
          </p>
          <div className="surface-admin-card rounded-[14px] overflow-hidden">
            {sourceStats.map((item, idx) => (
              <div
                key={item.key}
                className="flex items-center justify-between px-4 md:px-6 py-3"
                style={{
                  borderBottom:
                    idx < sourceStats.length - 1
                      ? "1px solid var(--border-subtle)"
                      : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Status dot */}
                  <div
                    className="size-2.5 rounded-full"
                    style={{
                      background: getSourceColor(item.successRate),
                      boxShadow: `0 0 8px ${getSourceGlow(item.successRate)}`,
                    }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary-ds)" }}
                  >
                    {item.source}
                  </span>
                </div>
                <div className="flex items-center gap-4 md:gap-6">
                  <span
                    className="font-mono text-sm"
                    style={{ color: getSourceColor(item.successRate) }}
                  >
                    {item.successRate}%
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--admin-text-secondary)" }}
                  >
                    {item.total.toLocaleString()} runs
                  </span>
                </div>
              </div>
            ))}
            {sourceStats.length === 0 && (
              <div className="flex items-center justify-center h-16">
                <p className="text-xs" style={{ color: "var(--admin-text-secondary)" }}>
                  No enrichment data
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Top 5 tenants by activity */}
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--admin-text-secondary)" }}
          >
            Top Tenants by Activity
          </p>
          <div className="surface-admin-card rounded-[14px] overflow-hidden">
            {topTenants.length > 0 ? (
              topTenants.map((tenant, idx) => (
                <div
                  key={tenant.tenantId}
                  className="flex items-center justify-between px-4 md:px-6 py-3"
                  style={{
                    borderBottom:
                      idx < topTenants.length - 1
                        ? "1px solid var(--border-subtle)"
                        : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="font-mono text-xs w-5 text-right"
                      style={{ color: "var(--gold-primary)" }}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary-ds)" }}
                    >
                      {tenant.tenantName}
                    </span>
                  </div>
                  <span
                    className="font-mono text-sm"
                    style={{ color: "var(--admin-text-secondary)" }}
                  >
                    {tenant.activityCount.toLocaleString()} actions
                  </span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-16">
                <p className="text-xs" style={{ color: "var(--admin-text-secondary)" }}>
                  No activity data
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
