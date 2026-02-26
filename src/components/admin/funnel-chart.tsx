"use client";

import { useMemo } from "react";
import {
  FunnelChart as RechartsFunnelChart,
  Funnel,
  Cell,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from "recharts";

interface FunnelChartProps {
  data: Array<{ stage: string; value: number }> | null;
}

// Gold-to-amber gradient colors per funnel stage
const FUNNEL_COLORS = [
  "oklch(0.84 0.10 85)", // Bright gold — Searches
  "oklch(0.77 0.09 80)",
  "oklch(0.68 0.11 70)",
  "oklch(0.60 0.12 60)", // Warm amber — Exports
];

export function FunnelChart({ data }: FunnelChartProps) {
  // Memoize funnel data to prevent Recharts Cell color reconciliation issues
  const funnelData = useMemo(() => {
    if (!data) return [];
    return data.map((item, i) => ({
      ...item,
      name: item.stage,
      fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
    }));
  }, [data]);

  // Memoize Cell elements to prevent re-render color issues
  const cells = useMemo(
    () =>
      funnelData.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={entry.fill} />
      )),
    [funnelData]
  );

  if (data === null) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground mb-4">Search-to-Export Funnel</p>
        <div className="h-[280px] flex flex-col gap-3 items-center justify-center">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-muted rounded"
              style={{
                height: "40px",
                width: `${85 - i * 15}%`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  const allZero = funnelData.length === 0 || funnelData.every((d) => d.value === 0);

  if (allZero) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground mb-4">Search-to-Export Funnel (30d)</p>
        <div className="h-[280px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No activity yet. Search and export prospects to see funnel data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground mb-4">Search-to-Export Funnel (30d)</p>
      <ResponsiveContainer width="100%" height={280}>
        <RechartsFunnelChart>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--foreground)",
            }}
          />
          <Funnel
            dataKey="value"
            data={funnelData}
            isAnimationActive={true}
          >
            {cells}
            <LabelList
              dataKey="name"
              position="right"
              style={{ fill: "var(--muted-foreground)", fontSize: "12px" }}
            />
            <LabelList
              dataKey="value"
              position="center"
              style={{ fill: "var(--foreground)", fontSize: "13px", fontWeight: "600" }}
            />
          </Funnel>
        </RechartsFunnelChart>
      </ResponsiveContainer>
    </div>
  );
}
