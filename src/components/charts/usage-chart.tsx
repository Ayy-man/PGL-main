"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface UsageChartData {
  date: string;
  searchesExecuted: number;
  profilesViewed: number;
  profilesEnriched: number;
  csvExports: number;
}

interface UsageChartProps {
  data: UsageChartData[];
}

const LINES = [
  { dataKey: "searchesExecuted", name: "Searches", color: "var(--gold-primary)" },
  { dataKey: "profilesViewed", name: "Profile Views", color: "var(--chart-2)" },
  { dataKey: "profilesEnriched", name: "Enrichments", color: "var(--success)" },
  { dataKey: "csvExports", name: "Exports", color: "var(--chart-5)" },
] as const;

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function UsageChart({ data }: UsageChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border bg-card p-6">
        <p className="text-muted-foreground">No data available for this period</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
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
          <Legend
            wrapperStyle={{ color: "var(--muted-foreground)", paddingTop: "16px" }}
          />
          {LINES.map(({ dataKey, name, color }) => (
            <Line
              key={dataKey}
              type="monotone"
              dataKey={dataKey}
              name={name}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
