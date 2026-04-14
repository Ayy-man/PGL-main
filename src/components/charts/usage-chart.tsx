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
import { EmptyState } from "@/components/ui/empty-state";
import { LineChart as LineChartIcon } from "lucide-react";

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
      <div className="surface-card rounded-[14px] p-4 md:p-6">
        <EmptyState icon={LineChartIcon} title="No data this period" description="Select a wider date range or check back after activity." />
      </div>
    );
  }

  return (
    <div className="surface-card rounded-[14px] p-4 md:p-6">
      <div className="h-[200px] md:h-[400px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
    </div>
  );
}
