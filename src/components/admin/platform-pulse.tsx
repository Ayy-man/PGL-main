"use client";

import { Activity } from "lucide-react";

interface PlatformPulseProps {
  data: {
    totalProspects: number;
    enrichmentCoverage: number;
    enrichmentFailed: number;
    activeUsersToday: number;
    activeUsers7dAvg: number;
  } | null;
  quotaData?: { totals: Record<string, number>; days: number } | null;
}

export function PlatformPulse({ data }: PlatformPulseProps) {
  if (data === null) {
    return (
      <div className="surface-admin-card rounded-[14px] p-6 animate-pulse">
        <div className="h-3 w-32 bg-white/[0.06] rounded mb-5" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="flex justify-between items-end mb-1">
                <div className="h-3 w-24 bg-white/[0.06] rounded" />
                <div className="h-5 w-16 bg-white/[0.06] rounded" />
              </div>
              <div className="w-full h-1 rounded-full bg-white/[0.06]" />
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

  const metrics = [
    {
      label: "Active Users",
      value: data.activeUsersToday.toLocaleString(),
      pct: Math.min(data.activeUsersToday * 10, 100),
      barColor: "var(--gold-primary)",
      valueColor: "var(--text-primary-ds)",
    },
    {
      label: "Prospects Scraped",
      value: prospectsDisplay,
      pct: Math.min((data.totalProspects / 1000) * 10, 100),
      barColor: "var(--gold-primary)",
      valueColor: "var(--text-primary-ds)",
    },
    {
      label: "Success Rate",
      value: successRate + "%",
      pct: successRate,
      barColor: "var(--success)",
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
              <div className="flex justify-between items-end mb-1">
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
              <div
                className="w-full h-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="h-1 rounded-full transition-all duration-500"
                  style={{ width: `${metric.pct}%`, background: metric.barColor }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
