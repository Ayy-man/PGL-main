"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Persona } from "@/lib/personas/types";
import type { List } from "@/lib/lists/types";
import type { PersonaFiltersType } from "@/lib/apollo/schemas";
import { useSearch } from "../hooks/use-search";
import { PersonaPills } from "./persona-pills";
import { NLSearchBar } from "./nl-search-bar";
import { AdvancedFiltersPanel } from "./advanced-filters-panel";
import { BulkActionsBar } from "./bulk-actions-bar";
import { ProspectResultCard } from "./prospect-result-card";
import { ProspectSlideOver } from "@/components/prospect/prospect-slide-over";
import { Search, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface SearchContentProps {
  personas: Persona[];
  lists: List[];
  orgId: string;
}

function SkeletonCard() {
  return (
    <div
      className="rounded-[12px] p-6 px-7 flex items-start gap-[18px] animate-pulse"
      style={{
        background: "var(--bg-card-gradient)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div
        className="flex-shrink-0 rounded-full"
        style={{
          width: "48px",
          height: "48px",
          background: "rgba(255,255,255,0.06)",
        }}
      />
      <div className="flex-1 space-y-2">
        <div
          className="h-5 rounded"
          style={{ width: "40%", background: "rgba(255,255,255,0.06)" }}
        />
        <div
          className="h-4 rounded"
          style={{ width: "60%", background: "rgba(255,255,255,0.04)" }}
        />
        <div
          className="h-3 rounded mt-1"
          style={{ width: "30%", background: "rgba(255,255,255,0.03)" }}
        />
      </div>
    </div>
  );
}

export function SearchContent({ personas, lists, orgId }: SearchContentProps) {
  const router = useRouter();
  const {
    searchState,
    setSearchState,
    results,
    pagination,
    isLoading,
    error,
    executeSearch,
  } = useSearch();

  const hasPersonaSelected = Boolean(searchState.persona);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when persona changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchState.persona]);

  // ----------------------------------------------------------------
  // Selection handlers
  // ----------------------------------------------------------------
  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map((r) => r.id)));
    }
  };

  // ----------------------------------------------------------------
  // Slide-over handlers
  // ----------------------------------------------------------------
  const handleProspectClick = (prospectId: string) => {
    setSearchState({ prospect: prospectId });
  };

  const handleSlideOverClose = () => {
    setSearchState({ prospect: "" });
  };

  // ----------------------------------------------------------------
  // NL search handler
  // ----------------------------------------------------------------
  const handleNLSearch = (keywords: string) => {
    setSearchState({ keywords });
  };

  // ----------------------------------------------------------------
  // Filter override handler
  // ----------------------------------------------------------------
  const handleApplyFilters = (filters: Partial<PersonaFiltersType>) => {
    if (filters.keywords) {
      setSearchState({ keywords: filters.keywords });
    }
    // Advanced filter overrides beyond keywords are a future enhancement
    // The API route already supports them — just needs state management wiring
  };

  // ----------------------------------------------------------------
  // Bulk action handlers (stubs — full implementations in later phases)
  // ----------------------------------------------------------------
  const handleBulkAddToList = () => {
    // TODO: Open AddToListDialog for bulk selection
  };

  const handleBulkExport = () => {
    // TODO: Trigger CSV export for selected prospects
  };

  const handleBulkEnrich = () => {
    // TODO: Save selected to list then trigger enrichment
  };

  // ----------------------------------------------------------------
  // Map ApolloPerson to Prospect shape for slide-over
  // ----------------------------------------------------------------
  const selectedProspect = searchState.prospect
    ? results.find((r) => r.id === searchState.prospect) ?? null
    : null;

  const slideOverProspect = selectedProspect
    ? {
        id: selectedProspect.id,
        full_name:
          selectedProspect.name ||
          `${selectedProspect.first_name} ${selectedProspect.last_name}`,
        first_name: selectedProspect.first_name,
        last_name: selectedProspect.last_name,
        title: selectedProspect.title || null,
        company:
          selectedProspect.organization_name ||
          selectedProspect.organization?.name ||
          null,
        location:
          [
            selectedProspect.city,
            selectedProspect.state,
            selectedProspect.country,
          ]
            .filter(Boolean)
            .join(", ") || null,
        work_email: selectedProspect.email || null,
        ai_summary: selectedProspect.headline || null,
        enrichment_source_status: null,
        insider_data: null,
      }
    : null;

  return (
    <div className="page-enter flex flex-col">
      {/* Error state — full replacement */}
      {error ? (
        <EmptyState icon={AlertCircle} title={error} variant="error">
          <Button variant="outline" size="sm" onClick={executeSearch}>
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </EmptyState>
      ) : (
        <>
          {/* HEADER SECTION — always visible */}
          <div className="pt-8 pb-6 flex flex-col gap-5">
            {/* Page title */}
            <div>
              <h1
                className="font-serif text-[38px] font-medium"
                style={{ letterSpacing: "-0.5px", color: "var(--text-primary-ds)" }}
              >
                Lead Discovery
              </h1>
              <p
                className="mt-1 text-[14px] font-light"
                style={{ color: "var(--text-tertiary)" }}
              >
                Use natural language to discover high-net-worth individuals and
                properties
              </p>
            </div>

            {/* NL Search Bar */}
            <NLSearchBar
              initialValue={searchState.keywords}
              onSearch={handleNLSearch}
              isLoading={isLoading}
            />

            {/* Persona Pills */}
            <PersonaPills
              personas={personas}
              selectedId={searchState.persona}
              onSelect={(id) => setSearchState({ persona: id })}
              onCreateNew={() => router.push(`/${orgId}/personas/new`)}
            />

            {/* Advanced Filters toggle */}
            <AdvancedFiltersPanel onApplyFilters={handleApplyFilters} />
          </div>

          {/* RESULTS SECTION — conditional on persona selected */}
          {hasPersonaSelected ? (
            <div>
              {/* Results header row */}
              <div className="flex items-center justify-between mb-4">
                <p
                  className="text-[13px]"
                  style={{ color: "var(--text-secondary-ds)" }}
                >
                  {pagination.totalEntries > 0
                    ? `${pagination.totalEntries.toLocaleString()} results`
                    : isLoading
                      ? "Searching..."
                      : "No results"}
                </p>
              </div>

              {/* Bulk actions bar */}
              {results.length > 0 && (
                <BulkActionsBar
                  selectedCount={selectedIds.size}
                  totalCount={results.length}
                  allSelected={
                    selectedIds.size === results.length && results.length > 0
                  }
                  onSelectAll={handleSelectAll}
                  onAddToList={handleBulkAddToList}
                  onExport={handleBulkExport}
                  onEnrich={handleBulkEnrich}
                />
              )}

              {/* Loading state: skeleton cards */}
              {isLoading && results.length === 0 && (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3, 4].map((n) => (
                    <SkeletonCard key={n} />
                  ))}
                </div>
              )}

              {/* Empty state: no results */}
              {!isLoading && results.length === 0 && (
                <EmptyState
                  icon={Search}
                  title="No matching prospects"
                  description="Try broadening the persona filters or adjusting your search keywords."
                />
              )}

              {/* Prospect result card stack */}
              {results.length > 0 && (
                <div className="flex flex-col gap-3">
                  {results.map((prospect) => (
                    <ProspectResultCard
                      key={prospect.id}
                      prospect={prospect}
                      lists={lists}
                      orgId={orgId}
                      onClick={() => handleProspectClick(prospect.id)}
                      selected={selectedIds.has(prospect.id)}
                      onSelect={() => handleSelect(prospect.id)}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={searchState.page <= 1 || isLoading}
                    onClick={() =>
                      setSearchState({ page: searchState.page - 1 })
                    }
                  >
                    Previous
                  </Button>
                  {Array.from(
                    { length: Math.min(pagination.totalPages, 7) },
                    (_, i) => {
                      const pageNum = i + 1;
                      const isActive = pageNum === searchState.page;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setSearchState({ page: pageNum })}
                          disabled={isLoading}
                          className="h-8 w-8 rounded-[6px] text-xs font-medium transition-all duration-200 cursor-pointer"
                          style={
                            isActive
                              ? {
                                  background: "var(--gold-bg-strong)",
                                  border: "1px solid var(--border-gold)",
                                  color: "var(--gold-primary)",
                                }
                              : {
                                  background: "rgba(255,255,255,0.02)",
                                  border: "1px solid var(--border-subtle)",
                                  color: "rgba(255,255,255,0.5)",
                                }
                          }
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={
                      searchState.page >= pagination.totalPages || isLoading
                    }
                    onClick={() =>
                      setSearchState({ page: searchState.page + 1 })
                    }
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Empty state when no persona selected */
            <div className="mt-4">
              <EmptyState
                icon={Search}
                title="Select a persona to search"
                description="Choose a saved persona above or type a natural language query to discover matching prospects."
              />
            </div>
          )}
        </>
      )}

      {/* ProspectSlideOver — always rendered, controlled by URL param */}
      <ProspectSlideOver
        open={Boolean(searchState.prospect)}
        onClose={handleSlideOverClose}
        prospectId={searchState.prospect || null}
        prospect={slideOverProspect}
        orgId={orgId}
      />
    </div>
  );
}
