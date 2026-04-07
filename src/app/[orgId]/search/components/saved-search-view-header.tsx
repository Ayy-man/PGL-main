"use client";

// Stub — full implementation in Phase 29 plan 05
import { RefreshCw } from "lucide-react";

interface SavedSearchViewHeaderProps {
  searchName: string;
  prospectCount: number;
  lastRefreshedAt: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  rightSlot?: React.ReactNode;
}

export function SavedSearchViewHeader({
  searchName,
  prospectCount,
  lastRefreshedAt,
  onRefresh,
  isRefreshing,
  rightSlot,
}: SavedSearchViewHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div>
        <h3
          className="text-base font-semibold"
          style={{ color: "var(--text-primary-ds)" }}
        >
          {searchName}
        </h3>
        <p className="text-xs" style={{ color: "var(--text-secondary-ds)" }}>
          {prospectCount} prospects
          {lastRefreshedAt
            ? ` · Refreshed ${new Date(lastRefreshedAt).toLocaleString()}`
            : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {rightSlot}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-xs font-medium disabled:opacity-50"
          style={{
            background: "color-mix(in oklch, var(--gold-primary) 10%, transparent)",
            color: "var(--gold-text)",
            border: "1px solid color-mix(in oklch, var(--gold-primary) 25%, transparent)",
          }}
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}
