"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface EnrichmentHealthChartProps {
  data: Array<{
    date: string;
    contactout_success: number;
    contactout_failed: number;
    exa_success: number;
    exa_failed: number;
    edgar_success: number;
    edgar_failed: number;
    claude_success: number;
    claude_failed: number;
  }> | null;
}

// Gold-adjacent warm hues (OKLCH) — graduated by source
const SUCCESS_COLORS = {
  contactout: "oklch(0.84 0.10 85)",
  exa: "oklch(0.77 0.09 85)",
  edgar: "oklch(0.70 0.08 85)",
  claude: "oklch(0.63 0.07 85)",
};

// Warm red tones for failures
const FAILED_COLORS = {
  contactout: "oklch(0.52 0.13 22)",
  exa: "oklch(0.46 0.12 22)",
  edgar: "oklch(0.40 0.11 22)",
  claude: "oklch(0.35 0.10 22)",
};

const SOURCES = [
  { key: "contactout", label: "ContactOut" },
  { key: "exa", label: "Exa" },
  { key: "edgar", label: "EDGAR" },
  { key: "claude", label: "Claude" },
] as const;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function EnrichmentHealthChart({ data }: EnrichmentHealthChartProps) {
  if (data === null) {
    return (
      <div className="surface-admin-card p-6">
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--admin-text-secondary)" }}>Enrichment Pipeline Health</p>
        <div className="h-[300px] animate-pulse flex items-end gap-2 px-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-white/[0.06] rounded-t"
              style={{ height: `${40 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="surface-admin-card p-6">
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--admin-text-secondary)" }}>Enrichment Pipeline Health (per source, daily)</p>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No enrichment data yet. Enrich prospects to see pipeline health.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-admin-card p-6">
      <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--admin-text-secondary)" }}>Enrichment Pipeline Health (per source, daily)</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--foreground)",
            }}
            labelFormatter={(label) => formatDate(String(label))}
          />
          <Legend wrapperStyle={{ color: "var(--muted-foreground)", paddingTop: "12px", fontSize: "11px" }} />

          {SOURCES.map(({ key, label }) => (
            <>
              <Bar
                key={`${key}_success`}
                dataKey={`${key}_success`}
                stackId={key}
                fill={SUCCESS_COLORS[key]}
                name={`${label} OK`}
                isAnimationActive={true}
                animationBegin={100}
                animationDuration={800}
              />
              <Bar
                key={`${key}_failed`}
                dataKey={`${key}_failed`}
                stackId={key}
                fill={FAILED_COLORS[key]}
                name={`${label} Fail`}
                isAnimationActive={true}
                animationBegin={100}
                animationDuration={800}
              />
            </>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
