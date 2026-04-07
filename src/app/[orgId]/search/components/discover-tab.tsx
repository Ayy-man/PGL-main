"use client";

import { useState } from "react";
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [prefillValue, setPrefillValue] = useState(keywords);

  const handlePrefill = (query: string) => {
    setPrefillValue(query);
  };

  return (
    <div className="page-enter max-w-[680px] mx-auto px-4 pt-12 pb-8">
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
        <div className="mb-8 text-center relative">
          <h1
            className="font-serif text-[44px] sm:text-[56px] font-medium"
            style={{ letterSpacing: "-0.5px", color: "var(--text-primary-ds)" }}
          >
            Find high-net-worth prospects
          </h1>
          <p
            className="mt-3 text-[13px] font-light"
            style={{ color: "var(--text-tertiary)" }}
          >
            Use natural language to surface wealthy individuals matching your criteria
          </p>
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
            onToggleFilters={() => setFiltersOpen((p) => !p)}
            filtersOpen={filtersOpen}
          />

          {/* Filters below pill */}
          {filtersOpen && (
            <div className="mt-3">
              <AdvancedFiltersPanel onApplyFilters={onApplyFilters} />
            </div>
          )}

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

      {/* Shortcut list */}
      <SavedSearchShortcutList
        personas={personas}
        counts={savedSearchCounts}
        onSelectSavedSearch={onSelectSavedSearch}
        onViewAllSaved={onViewAllSaved}
        onPrefillSearch={handlePrefill}
      />
    </div>
  );
}
