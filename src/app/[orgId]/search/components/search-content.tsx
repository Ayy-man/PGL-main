"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Search, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const {
    searchState,
    setSearchState,
    results,
    pagination,
    isLoading,
    error,
    executeSearch,
    setFilterOverrides,
  } = useSearch();

  const hasPersonaSelected = Boolean(searchState.persona);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk list dialog state
  const [bulkListDialogOpen, setBulkListDialogOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"add" | "enrich">("add");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkSelectedListIds, setBulkSelectedListIds] = useState<string[]>([]);

  // Reset selection and filter overrides when persona changes
  useEffect(() => {
    setSelectedIds(new Set());
    setFilterOverrides({});
  }, [searchState.persona, setFilterOverrides]);

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
    if (filters.keywords !== undefined) {
      setSearchState({ keywords: filters.keywords });
    }
    const { keywords: _keywords, ...nonKeywordOverrides } = filters;
    setFilterOverrides(nonKeywordOverrides);
  };

  // ----------------------------------------------------------------
  // Bulk action handlers
  // ----------------------------------------------------------------
  const handleBulkAddToList = () => {
    if (selectedIds.size === 0) return;
    setBulkMode("add");
    setBulkSelectedListIds([]);
    setBulkListDialogOpen(true);
  };

  const handleBulkExport = () => {
    if (selectedIds.size === 0) return;
    const selectedProspects = results.filter((r) => selectedIds.has(r.id));

    const headers = ["Name", "Title", "Company", "Location", "Email", "LinkedIn URL"];
    const rows = selectedProspects.map((p) => [
      p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
      p.title || "",
      p.organization_name || p.organization?.name || "",
      [p.city, p.state, p.country].filter(Boolean).join(", "),
      p.email || "",
      p.linkedin_url || "",
    ]);

    const escapeField = (field: string) => {
      if (field.includes(",") || field.includes('"') || field.includes("\n")) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const csvContent = [
      headers.map(escapeField).join(","),
      ...rows.map((row) => row.map(escapeField).join(",")),
    ].join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prospects-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: `Downloaded ${selectedProspects.length} prospect${selectedProspects.length !== 1 ? "s" : ""} as CSV`,
    });
  };

  const handleBulkEnrich = () => {
    if (selectedIds.size === 0) return;
    setBulkMode("enrich");
    setBulkSelectedListIds([]);
    setBulkListDialogOpen(true);
  };

  const handleBulkListSubmit = async () => {
    if (bulkSelectedListIds.length === 0 || selectedIds.size === 0) return;
    setIsBulkSubmitting(true);
    const selectedProspects = results.filter((r) => selectedIds.has(r.id));
    let successCount = 0;
    let failCount = 0;

    const promises = selectedProspects.map(async (prospect) => {
      try {
        const response = await fetch("/api/prospects/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prospect, listIds: bulkSelectedListIds }),
        });
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    });

    await Promise.allSettled(promises);
    setIsBulkSubmitting(false);
    setBulkListDialogOpen(false);

    toast({
      title: failCount === 0 ? "Success" : "Partial success",
      description: `Added ${successCount} prospect${successCount !== 1 ? "s" : ""} to ${bulkSelectedListIds.length} list${bulkSelectedListIds.length !== 1 ? "s" : ""}${failCount > 0 ? `. ${failCount} failed.` : ""}`,
      variant: failCount > 0 ? "destructive" : "default",
    });

    if (failCount === 0) setSelectedIds(new Set());
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

      {/* Bulk list selection dialog */}
      <Dialog open={bulkListDialogOpen} onOpenChange={setBulkListDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {bulkMode === "enrich" ? "Enrich Selection" : "Add to List"}
            </DialogTitle>
            <DialogDescription>
              {bulkMode === "enrich"
                ? `Save ${selectedIds.size} prospect${selectedIds.size !== 1 ? "s" : ""} to a list to begin enrichment`
                : `Add ${selectedIds.size} prospect${selectedIds.size !== 1 ? "s" : ""} to one or more lists`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {lists.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">No lists yet</p>
                <Button size="sm" asChild>
                  <Link href={`/${orgId}/lists`}>Create your first list</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {lists.map((list) => (
                  <div
                    key={list.id}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setBulkSelectedListIds((prev) =>
                        prev.includes(list.id)
                          ? prev.filter((id) => id !== list.id)
                          : [...prev, list.id]
                      );
                    }}
                  >
                    <Checkbox
                      id={`bulk-list-${list.id}`}
                      checked={bulkSelectedListIds.includes(list.id)}
                      onCheckedChange={() => {
                        setBulkSelectedListIds((prev) =>
                          prev.includes(list.id)
                            ? prev.filter((id) => id !== list.id)
                            : [...prev, list.id]
                        );
                      }}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`bulk-list-${list.id}`}
                        className="font-medium cursor-pointer"
                      >
                        {list.name}
                      </Label>
                      {list.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {list.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {list.member_count}{" "}
                        {list.member_count === 1 ? "member" : "members"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {lists.length > 0 && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setBulkListDialogOpen(false)}
                disabled={isBulkSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkListSubmit}
                disabled={bulkSelectedListIds.length === 0 || isBulkSubmitting}
              >
                {isBulkSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {bulkMode === "enrich"
                  ? "Save & Enrich"
                  : `Add to ${bulkSelectedListIds.length} List${bulkSelectedListIds.length !== 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

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
