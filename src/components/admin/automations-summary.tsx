"use client";

import { Workflow, Clock, Play, AlertCircle, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SummaryData {
  totalAutomations: number;
  activeSchedules: number;
  runs24h: number;
  failures24h: number;
  successRate: number;
}

interface AutomationsSummaryProps {
  data: SummaryData | undefined;
  loading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Stat card definition                                               */
/* ------------------------------------------------------------------ */

interface StatDef {
  label: string;
  icon: LucideIcon;
  getValue: (d: SummaryData) => number;
  getSubtitle?: (d: SummaryData) => string;
  getValueColor?: (d: SummaryData) => string | undefined;
}

const STATS: StatDef[] = [
  {
    label: "Total Automations",
    icon: Workflow,
    getValue: (d) => d.totalAutomations,
  },
  {
    label: "Active Schedules",
    icon: Clock,
    getValue: (d) => d.activeSchedules,
  },
  {
    label: "Runs (24h)",
    icon: Play,
    getValue: (d) => d.runs24h,
    getSubtitle: (d) => `${d.successRate}% success rate`,
  },
  {
    label: "Failures (24h)",
    icon: AlertCircle,
    getValue: (d) => d.failures24h,
    getValueColor: (d) => (d.failures24h > 0 ? "oklch(0.62 0.19 22)" : undefined),
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AutomationsSummary({ data, loading }: AutomationsSummaryProps) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card rounded-[14px] p-4 md:p-6">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {STATS.map((stat) => {
        const Icon = stat.icon;
        const value = stat.getValue(data);
        const subtitle = stat.getSubtitle?.(data);
        const valueColor = stat.getValueColor?.(data);

        return (
          <div key={stat.label} className="surface-card rounded-[14px] p-4 md:p-6">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4" style={{ color: "var(--text-ghost)" }} />
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-ghost)" }}
              >
                {stat.label}
              </span>
            </div>
            <p
              className="font-serif text-2xl md:text-3xl font-semibold"
              style={{ color: valueColor ?? "var(--text-primary-ds)" }}
            >
              {value.toLocaleString()}
            </p>
            {subtitle && (
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary-ds)" }}>
                {subtitle}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
