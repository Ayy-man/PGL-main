"use client";

import { Search, Eye, Sparkles, Download, List, LogIn } from "lucide-react";
import type { ReactNode } from "react";

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

export function MetricsCards({ totals }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {METRICS.map(({ key, label, icon }) => {
        const value = totals[key];
        const isNonZero = value > 0;
        return (
          <div
            key={key}
            className="rounded-[14px] p-5"
            style={{
              background: "var(--bg-card-gradient)",
              border: "1px solid var(--border-subtle)",
            }}
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
      })}
    </div>
  );
}
