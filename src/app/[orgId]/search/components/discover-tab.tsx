"use client";

import { NLSearchBar } from "./nl-search-bar";
import { AdvancedFiltersPanel } from "./advanced-filters-panel";
import { SavedSearchShortcutList } from "./saved-search-shortcut-list";
import type { Persona, PersonaFilters } from "@/lib/personas/types";

interface DiscoverTabProps {
  personas: Persona[];
  savedSearchCounts?: Record<string, number>;
  keywords: string;
  isLoading: boolean;
  onNLSearch: (keywords: string) => void;
  onApplyFilters: (filters: Partial<PersonaFilters>) => void;
  onSubmitSearch: () => void;
  onSaveAsNewSearch: () => void;
  onSelectSavedSearch: (id: string) => void;
  onViewAllSaved?: () => void;
}

export function DiscoverTab({
  personas,
  savedSearchCounts,
  keywords,
  isLoading,
  onNLSearch,
  onApplyFilters,
  onSubmitSearch,
  onSaveAsNewSearch,
  onSelectSavedSearch,
  onViewAllSaved,
}: DiscoverTabProps) {
  return (
    <div className="page-enter max-w-2xl mx-auto px-4 pt-12 pb-8">
      {/* Hero */}
      <div className="mb-6">
        <h1
          className="font-serif text-[32px] sm:text-[38px] font-medium"
          style={{
            letterSpacing: "-0.5px",
            color: "var(--text-primary-ds)",
          }}
        >
          Find high-net-worth prospects
        </h1>
        <p
          className="mt-1 text-[14px] font-light"
          style={{ color: "var(--text-tertiary)" }}
        >
          Use natural language to surface wealthy individuals matching your criteria
        </p>
      </div>

      {/* NL search bar */}
      <NLSearchBar
        initialValue={keywords}
        onSearch={onNLSearch}
        isLoading={isLoading}
      />

      {/* Collapsible filters */}
      <div className="mt-4">
        <AdvancedFiltersPanel onApplyFilters={onApplyFilters} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={onSubmitSearch}
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-[10px] px-5 py-2 text-[13px] font-medium cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: "transparent",
            border: "1px solid var(--border-gold)",
            color: "var(--gold-primary)",
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.background = "var(--gold-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          Search
        </button>
        <button
          type="button"
          onClick={onSaveAsNewSearch}
          className="inline-flex items-center justify-center rounded-[10px] px-5 py-2 text-[13px] font-medium cursor-pointer transition-colors"
          style={{
            background: "transparent",
            border: "1px solid transparent",
            color: "var(--text-secondary-ds)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-elevated)";
            e.currentTarget.style.color = "var(--text-primary-ds)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary-ds)";
          }}
        >
          Save as new search
        </button>
      </div>

      {/* Shortcut list */}
      <SavedSearchShortcutList
        personas={personas}
        counts={savedSearchCounts}
        onSelectSavedSearch={onSelectSavedSearch}
        onViewAllSaved={onViewAllSaved}
      />
    </div>
  );
}
