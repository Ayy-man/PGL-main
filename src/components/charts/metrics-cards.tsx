"use client";

import { Search, Eye, Sparkles, Download, List, LogIn } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

function useCountUp(target: number, duration = 800): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }
    startRef.current = null;
    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return current;
}

interface MetricsCardsTotals {
  totalLogins: number;
  searchesExecuted: number;
  profilesViewed: number;
  profilesEnriched: number;
  csvExports: number;
  listsCreated: number;
}

interface MetricsCardsProps {
  totals: MetricsCardsTotals;
}

const METRICS: {
  key: keyof MetricsCardsTotals;
  label: string;
  icon: ReactNode;
}[] = [
  { key: "totalLogins", label: "Total Logins", icon: <LogIn className="h-4 w-4" /> },
  {
    key: "searchesExecuted",
    label: "Searches Executed",
    icon: <Search className="h-4 w-4" />,
  },
  {
    key: "profilesViewed",
    label: "Profiles Viewed",
    icon: <Eye className="h-4 w-4" />,
  },
  {
    key: "profilesEnriched",
    label: "Profiles Enriched",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    key: "csvExports",
    label: "CSV Exports",
    icon: <Download className="h-4 w-4" />,
  },
  {
    key: "listsCreated",
    label: "Lists Created",
    icon: <List className="h-4 w-4" />,
  },
];

function MetricCard({
  metricKey,
  label,
  icon,
  rawValue,
  index,
}: {
  metricKey: string;
  label: string;
  icon: ReactNode;
  rawValue: number;
  index: number;
}) {
  const value = useCountUp(rawValue);
  const isNonZero = rawValue > 0;
  return (
    <div
      key={metricKey}
      className="surface-card surface-card-featured rounded-[14px] p-5 row-enter"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p
        className="font-serif font-bold leading-none"
        style={{
          fontSize: "36px",
          color: isNonZero ? "var(--gold-primary)" : "var(--text-secondary)",
        }}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export function MetricsCards({ totals }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {METRICS.map(({ key, label, icon }, index) => (
        <MetricCard
          key={key}
          metricKey={key}
          label={label}
          icon={icon}
          rawValue={totals[key]}
          index={index}
        />
      ))}
    </div>
  );
}
