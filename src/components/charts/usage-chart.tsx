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
  { dataKey: "searchesExecuted", name: "Searches", color: "#d4af37" },
  { dataKey: "profilesViewed", name: "Profile Views", color: "#60a5fa" },
  { dataKey: "profilesEnriched", name: "Enrichments", color: "#34d399" },
  { dataKey: "csvExports", name: "Exports", color: "#f472b6" },
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
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#a1a1aa"
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
          />
          <YAxis
            stroke="#a1a1aa"
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
              color: "#f4f4f5",
            }}
            labelFormatter={(label) => formatDate(String(label))}
          />
          <Legend
            wrapperStyle={{ color: "#a1a1aa", paddingTop: "16px" }}
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
