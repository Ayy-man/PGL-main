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
  { key: "totalLogins", label: "Logins", icon: <LogIn className="h-5 w-5" /> },
  {
    key: "searchesExecuted",
    label: "Searches Executed",
    icon: <Search className="h-5 w-5" />,
  },
  {
    key: "profilesViewed",
    label: "Profiles Viewed",
    icon: <Eye className="h-5 w-5" />,
  },
  {
    key: "profilesEnriched",
    label: "Profiles Enriched",
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    key: "csvExports",
    label: "CSV Exports",
    icon: <Download className="h-5 w-5" />,
  },
  {
    key: "listsCreated",
    label: "Lists Created",
    icon: <List className="h-5 w-5" />,
  },
];

export function MetricsCards({ totals }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {METRICS.map(({ key, label, icon }) => (
        <div
          key={key}
          className="rounded-xl border bg-card p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{label}</p>
            <span className="text-muted-foreground">{icon}</span>
          </div>
          <p className="mt-3 font-serif text-3xl font-bold text-gold">
            {totals[key].toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
