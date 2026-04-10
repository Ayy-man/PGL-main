"use client";

import { useState, useEffect } from "react";
import { NLSearchBar } from "./nl-search-bar";
import { FilterPillsRow } from "./filter-pills-row";
import { AdvancedFiltersPanel } from "./advanced-filters-panel";
import { SavedSearchShortcutList } from "./saved-search-shortcut-list";
import { SuggestedPersonasSection } from "./suggested-personas-section";
import type { Persona, PersonaFilters } from "@/lib/personas/types";

interface DiscoverTabProps {
  personas: Persona[];
  savedSearchCounts?: Record<string, number>;
  keywords: string;
  isLoading: boolean;
  hasResults: boolean;
  currentFilters?: Partial<PersonaFilters>;
  onNLSearch: (keywords: string) => void;
  onApplyFilters: (filters: Partial<PersonaFilters>) => void;
  onSubmitSearch: () => void;
  onSaveAsNewSearch: () => void;
  onSelectSavedSearch: (id: string) => void;
  onViewAllSaved?: () => void;
  onClearSearch?: () => void;
}

export function DiscoverTab({
  personas,
  savedSearchCounts,
  keywords,
  isLoading,
  hasResults,
  currentFilters,
  onNLSearch,
  onApplyFilters,
  onSubmitSearch,
  onSaveAsNewSearch,
  onSelectSavedSearch,
  onViewAllSaved,
  onClearSearch,
}: DiscoverTabProps) {
  const [prefillValue, setPrefillValue] = useState(keywords);

  // Sync prefillValue when keywords changes externally (L3)
  useEffect(() => {
    setPrefillValue(keywords);
  }, [keywords]);

  const handlePrefill = (query: string) => {
    setPrefillValue(query);
    // Auto-submit the prefilled query (M7)
    onNLSearch(query);
    onSubmitSearch();
  };

  return (
    <div className="page-enter max-w-[960px] mx-auto px-4 pt-12 pb-8">
      <div className="relative">
        {/* Radial gold glow — decorative, pointer-events-none */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(212,175,55,0.05) 0%, transparent 70%)",
          }}
        />

        {/* Hero */}
        <div className="mb-4 text-center relative">
          <h1
            className="font-serif text-[32px] sm:text-[40px] font-medium"
            style={{ letterSpacing: "-0.5px", color: "var(--text-primary-ds)" }}
          >
            Find high-net-worth prospects
          </h1>
          <p
            className="mt-2 text-[13px] font-light"
            style={{ color: "var(--text-tertiary)" }}
          >
            Use natural language to surface wealthy individuals matching your criteria
          </p>
        </div>

        {/* Stats bar — pill badge */}
        <div className="my-6 flex justify-center">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] tracking-wide"
            style={{
              border: "1px solid rgba(212,175,55,0.15)",
              background: "rgba(212,175,55,0.04)",
              color: "var(--text-tertiary)",
            }}
          >
            12,400+ prospects indexed
            <span style={{ opacity: 0.4 }}>·</span>
            Updated 2 hours ago
          </span>
        </div>

        {/* Search area */}
        <div className="relative">
          {/* key remount seeds textarea when prefill changes */}
          <NLSearchBar
            key={prefillValue}
            initialValue={prefillValue}
            onSearch={(val) => {
              onNLSearch(val);
              onSubmitSearch();
            }}
            isLoading={isLoading}
            onClear={onClearSearch}
          />

          {/* Filter pills row */}
          <FilterPillsRow onApplyFilters={onApplyFilters} currentFilters={currentFilters} />

          {/* Advanced filters — collapsible multi-field panel */}
          <div className="mt-3 flex justify-center">
            <AdvancedFiltersPanel onApplyFilters={onApplyFilters} currentFilters={currentFilters} />
          </div>

          {/* Ghost save link — only when keywords are present */}
          {keywords.trim() && (
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={onSaveAsNewSearch}
                className="text-[12px] font-light cursor-pointer transition-colors"
                style={{
                  color: "var(--text-tertiary)",
                  background: "transparent",
                  border: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--gold-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }}
              >
                Save this search &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Shortcut list — hidden when results are showing */}
      {!hasResults && (
        <SavedSearchShortcutList
          personas={personas}
          counts={savedSearchCounts}
          onSelectSavedSearch={onSelectSavedSearch}
          onViewAllSaved={onViewAllSaved}
          onPrefillSearch={handlePrefill}
          onCreateNew={onSaveAsNewSearch}
        />
      )}

      {/* Suggested Searches — hidden when results are showing */}
      {!hasResults && (
        <SuggestedPersonasSection onPrefillSearch={handlePrefill} />
      )}
    </div>
  );
}
