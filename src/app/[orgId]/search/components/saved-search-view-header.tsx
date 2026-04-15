"use client";

import { RefreshCw, Loader2, Pencil } from "lucide-react";
import { formatRefreshedAgo } from "../lib/format-refreshed";
import type { PersonaFilters } from "@/lib/personas/types";

const SENIORITY_LABELS: Record<string, string> = {
  owner: "Owner",
  founder: "Founder",
  c_suite: "C-Suite",
  partner: "Partner",
  vp: "VP",
  head: "Head",
  director: "Director",
  manager: "Manager",
  senior: "Senior",
  entry: "Entry",
  intern: "Intern",
};

interface SavedSearchViewHeaderProps {
  searchName: string;
  prospectCount: number;
  lastRefreshedAt: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  /** Optional slot for the "Show dismissed (N)" toggle (Phase 28 behavior preservation). */
  rightSlot?: React.ReactNode;
  filters?: PersonaFilters;
  onEditFilters?: () => void;
}

export function SavedSearchViewHeader({
  searchName,
  prospectCount,
  lastRefreshedAt,
  onRefresh,
  isRefreshing,
  rightSlot,
  filters,
  onEditFilters,
}: SavedSearchViewHeaderProps) {
  const refreshedText = lastRefreshedAt
    ? `Last refreshed: ${formatRefreshedAgo(lastRefreshedAt)}`
    : "Never refreshed";

  // Build filter pills
  const pills: { label: string; category: string }[] = [];
  if (filters) {
    if (filters.titles) {
      for (const t of filters.titles) pills.push({ label: t, category: "Title" });
    }
    if (filters.seniorities) {
      for (const s of filters.seniorities) pills.push({ label: SENIORITY_LABELS[s] || s, category: "Seniority" });
    }
    if (filters.industries) {
      for (const i of filters.industries) pills.push({ label: i, category: "Industry" });
    }
    if (filters.organization_names) {
      for (const o of filters.organization_names) pills.push({ label: o, category: "Company" });
    }
    if (filters.locations) {
      for (const l of filters.locations) pills.push({ label: l, category: "Location" });
    }
    if (filters.companySize) {
      for (const cs of filters.companySize) pills.push({ label: `${cs} employees`, category: "Size" });
    }
    if (filters.keywords) {
      pills.push({ label: `"${filters.keywords}"`, category: "Keywords" });
    }
    if (filters.person_name) {
      pills.push({ label: filters.person_name, category: "Person" });
    }
    if (filters.net_worth_range) {
      pills.push({ label: filters.net_worth_range, category: "Net Worth" });
    }
  }

  return (
    <header className="mb-5">
      <div className="flex items-start justify-between gap-4">
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
      </div>

      {/* Filter pills */}
      {filters && pills.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {pills.map((pill, idx) => (
            <span
              key={`${pill.category}-${idx}`}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium"
              style={{
                background: "rgba(var(--gold-primary-rgb), 0.08)",
                color: "var(--gold-primary)",
                border: "1px solid rgba(var(--gold-primary-rgb), 0.15)",
              }}
            >
              <span style={{ color: "var(--text-ghost)" }} className="text-[11px]">{pill.category}:</span>
              {pill.label}
            </span>
          ))}
          {onEditFilters && (
            <button
              type="button"
              onClick={onEditFilters}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer"
              style={{
                background: "transparent",
                color: "var(--text-secondary-ds)",
                border: "1px dashed var(--border-default)",
              }}
            >
              <Pencil className="h-3 w-3" />
              Edit Filters
            </button>
          )}
        </div>
      )}

      {/* Warning when filters exist but produce no pills */}
      {filters && pills.length === 0 && (
        <div className="mt-3 flex items-center gap-2 text-[13px]" style={{ color: "#ef4444" }}>
          <span>No filters stored — this search may return broad results.</span>
          {onEditFilters && (
            <button
              type="button"
              onClick={onEditFilters}
              className="underline cursor-pointer transition-colors"
              style={{ color: "#ef4444" }}
            >
              Add filters
            </button>
          )}
        </div>
      )}
    </header>
  );
}
