"use client";

import { RefreshCw, Loader2 } from "lucide-react";
import { formatRefreshedAgo } from "../lib/format-refreshed";

interface SavedSearchViewHeaderProps {
  searchName: string;
  prospectCount: number;
  lastRefreshedAt: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  /** Optional slot for the "Show dismissed (N)" toggle (Phase 28 behavior preservation). */
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
  const refreshedText = lastRefreshedAt
    ? `Last refreshed: ${formatRefreshedAgo(lastRefreshedAt)}`
    : "Never refreshed";

  return (
    <header className="flex items-start justify-between gap-4 mb-5">
      <div className="min-w-0 flex-1">
        <h1
          className="font-serif text-[28px] sm:text-[32px] font-medium truncate"
          style={{
            letterSpacing: "-0.5px",
            color: "var(--text-primary-ds)",
          }}
        >
          {searchName}
        </h1>
        <p
          className="mt-1 text-[14px] font-light flex items-center"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span>
            {prospectCount.toLocaleString()} prospects &middot; {refreshedText}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh results"
            aria-label="Refresh results"
            className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              if (!isRefreshing) e.currentTarget.style.color = "var(--gold-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
          >
            {isRefreshing ? (
              <Loader2 className="h-[14px] w-[14px] animate-spin" />
            ) : (
              <RefreshCw className="h-[14px] w-[14px]" />
            )}
          </button>
        </p>
      </div>
      {rightSlot && <div className="flex-shrink-0">{rightSlot}</div>}
    </header>
  );
}
