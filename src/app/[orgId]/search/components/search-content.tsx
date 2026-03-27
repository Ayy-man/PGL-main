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
import { ProspectResultsTable } from "./prospect-results-table";
import { ProspectSlideOver } from "@/components/prospect/prospect-slide-over";
import { Search, AlertCircle, RefreshCw, Loader2, Plus, X } from "lucide-react";
import { PersonaFormDialog } from "../../personas/components/persona-form-dialog";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createListAction } from "../../lists/actions";

interface SearchContentProps {
  personas: Persona[];
  lists: List[];
  orgId: string;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <td className="py-4 pl-5 pr-3"><div className="h-4 w-4 rounded" style={{ background: "rgba(255,255,255,0.06)" }} /></td>
      <td className="px-3 py-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} /><div className="space-y-1.5"><div className="h-4 w-28 rounded" style={{ background: "rgba(255,255,255,0.06)" }} /><div className="h-3 w-20 rounded" style={{ background: "rgba(255,255,255,0.04)" }} /></div></div></td>
      <td className="px-3 py-4"><div className="h-6 w-24 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} /></td>
      <td className="px-3 py-4"><div className="space-y-1.5"><div className="h-4 w-32 rounded" style={{ background: "rgba(255,255,255,0.06)" }} /><div className="h-3 w-24 rounded" style={{ background: "rgba(255,255,255,0.04)" }} /></div></td>
      <td className="px-3 py-4"><div className="flex gap-1"><div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} /><div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} /><div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} /></div></td>
      <td className="px-3 py-4" />
    </tr>
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

  const hasActiveSearch = Boolean(searchState.persona) || Boolean(searchState.keywords?.trim());

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk list dialog state
  const [bulkListDialogOpen, setBulkListDialogOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"add" | "enrich">("add");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkSelectedListIds, setBulkSelectedListIds] = useState<string[]>([]);

  // Inline list creation state
  const [localLists, setLocalLists] = useState<List[]>(lists);
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isCreatingList, setIsCreatingList] = useState(false);

  // Sync local lists with prop
  useEffect(() => {
    setLocalLists(lists);
  }, [lists]);

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
    const selected = results.filter((r) => selectedIds.has(r.id));
    const allUnenriched = selected.every((p) => p._enriched === false);
    if (allUnenriched) {
      toast({
        title: "Enrichment required",
        description:
          "All selected prospects are preview-only. Enrichment is required before adding to a list.",
        variant: "destructive",
      });
      return;
    }
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
    const allSelected = results.filter((r) => selectedIds.has(r.id));

    // In add-to-list mode, skip preview-only prospects.
    // In enrich mode, process ALL prospects — Apollo bulk enrich first, then upsert.
    let selectedProspects: typeof allSelected;
    if (bulkMode === "enrich") {
      selectedProspects = allSelected;
    } else {
      const skippedCount = allSelected.filter((p) => p._enriched === false).length;
      selectedProspects = allSelected.filter((p) => p._enriched !== false);

      if (skippedCount > 0) {
        toast({
          title: "Preview-only prospects skipped",
          description: `${skippedCount} prospect${skippedCount !== 1 ? "s" : ""} skipped because they need enrichment first.`,
          variant: "destructive",
        });
      }
    }

    if (selectedProspects.length === 0) {
      setIsBulkSubmitting(false);
      setBulkListDialogOpen(false);
      return;
    }

    // In enrich mode, call Apollo bulk enrich first to get real names/emails/LinkedIn
    let prospectsToUpsert = selectedProspects;
    if (bulkMode === "enrich") {
      const previewIds = selectedProspects
        .filter((p) => p._enriched === false)
        .map((p) => p.id);

      if (previewIds.length > 0) {
        toast({
          title: "Enriching via Apollo",
          description: `Revealing full data for ${previewIds.length} prospect${previewIds.length !== 1 ? "s" : ""}...`,
        });

        // Send preview data so mock mode can use real first names / org names
        const previews = selectedProspects
          .filter((p) => p._enriched === false)
          .map((p) => ({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            name: p.name,
            title: p.title,
            organization_name: p.organization_name,
          }));

        try {
          const enrichResp = await fetch("/api/apollo/bulk-enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apolloIds: previewIds, previews }),
          });

          if (enrichResp.ok) {
            const enrichData = await enrichResp.json();
            const enrichedPeople = enrichData.people;
            if (enrichData.mock) {
              toast({
                title: "Using mock Apollo data",
                description: "Apollo credits exhausted — fake names/emails generated for testing. Disable APOLLO_MOCK_ENRICHMENT when credits renew.",
              });
            }
            // Merge enriched data back — replace preview entries with full data
            const enrichedMap = new Map<string, (typeof enrichedPeople)[number]>();
            for (const p of enrichedPeople) {
              if (p.id) enrichedMap.set(p.id, p);
            }
            prospectsToUpsert = selectedProspects.map((p) => {
              const enriched = enrichedMap.get(p.id);
              return enriched ? { ...enriched, _enriched: true } : p;
            });
          } else {
            const err = await enrichResp.json().catch(() => ({}));
            toast({
              title: "Apollo enrichment failed",
              description: err.error || "Proceeding with preview data",
              variant: "destructive",
            });
            // Continue with preview data — Exa/Claude can still try
          }
        } catch {
          toast({
            title: "Apollo enrichment failed",
            description: "Proceeding with preview data",
            variant: "destructive",
          });
        }
      }
    }

    let successCount = 0;
    let failCount = 0;
    const upsertedProspectIds: string[] = [];

    const promises = prospectsToUpsert.map(async (prospect) => {
      try {
        const response = await fetch("/api/prospects/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prospect, listIds: bulkSelectedListIds }),
        });
        if (response.ok) {
          successCount++;
          const data = await response.json();
          if (data.prospect?.id) {
            upsertedProspectIds.push(data.prospect.id);
          }
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

    // When in enrich mode, fire off enrichment for each successfully upserted prospect
    if (bulkMode === "enrich" && upsertedProspectIds.length > 0) {
      toast({
        title: "Enriching prospects",
        description: `Enriching ${upsertedProspectIds.length} prospect${upsertedProspectIds.length !== 1 ? "s" : ""}...`,
      });

      // Fire-and-forget: trigger enrich endpoint for each prospect
      Promise.allSettled(
        upsertedProspectIds.map((prospectId) =>
          fetch(`/api/prospects/${prospectId}/enrich`, {
            method: "POST",
          }).catch(() => {
            // Silently ignore individual enrich failures —
            // the enrichment system handles retries via Inngest
          })
        )
      );

      // Navigate to the first selected list so user can watch enrichment progress
      router.push(`/${orgId}/lists/${bulkSelectedListIds[0]}`);
      return;
    }

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
                className="font-serif text-2xl sm:text-[32px] md:text-[38px] font-medium"
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
              createButton={
                <PersonaFormDialog
                  mode="create"
                  trigger={
                    <button
                      className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 cursor-pointer shrink-0"
                      style={{
                        background: "transparent",
                        border: "1px dashed var(--border-default)",
                        color: "var(--text-secondary-ds)",
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      New Persona
                    </button>
                  }
                />
              }
            />

            {/* Advanced Filters toggle */}
            <AdvancedFiltersPanel onApplyFilters={handleApplyFilters} />
          </div>

          {/* RESULTS SECTION — conditional on persona selected */}
          {hasActiveSearch ? (
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

              {/* Loading state: skeleton table */}
              {isLoading && results.length === 0 && (
                <div
                  className="overflow-hidden rounded-xl"
                  style={{
                    border: "1px solid var(--border-default)",
                    background: "var(--bg-card-gradient)",
                  }}
                >
                  <table className="min-w-full">
                    <tbody>
                      {[1, 2, 3, 4].map((n) => (
                        <SkeletonRow key={n} />
                      ))}
                    </tbody>
                  </table>
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

              {/* Prospect results table */}
              {results.length > 0 && (
                <ProspectResultsTable
                  results={results}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  onSelectAll={handleSelectAll}
                  onProspectClick={handleProspectClick}
                />
              )}

              {/* Pagination — mockup style */}
              {pagination.totalPages > 1 && (
                <div
                  className="flex items-center justify-between py-4 px-2"
                  style={{ borderTop: "1px solid var(--border-subtle)" }}
                >
                  <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                    Showing{" "}
                    <span style={{ color: "var(--text-primary-ds)" }} className="font-medium">
                      {(searchState.page - 1) * 10 + 1}
                    </span>{" "}
                    to{" "}
                    <span style={{ color: "var(--text-primary-ds)" }} className="font-medium">
                      {Math.min(searchState.page * 10, pagination.totalEntries)}
                    </span>{" "}
                    of{" "}
                    <span style={{ color: "var(--text-primary-ds)" }} className="font-medium">
                      {pagination.totalEntries.toLocaleString()}
                    </span>{" "}
                    results
                  </p>
                  <nav className="isolate inline-flex -space-x-px rounded-md">
                    <button
                      disabled={searchState.page <= 1 || isLoading}
                      onClick={() => setSearchState({ page: searchState.page - 1 })}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 transition-colors duration-150 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      style={{
                        color: "var(--text-tertiary)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
                    </button>
                    {Array.from(
                      { length: Math.min(pagination.totalPages, 5) },
                      (_, i) => {
                        const pageNum = i + 1;
                        const isActive = pageNum === searchState.page;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setSearchState({ page: pageNum })}
                            disabled={isLoading}
                            className="relative inline-flex items-center px-4 py-2 text-sm font-semibold transition-colors duration-150 cursor-pointer"
                            style={
                              isActive
                                ? {
                                    background: "var(--gold-primary)",
                                    color: "var(--bg-root)",
                                    zIndex: 10,
                                  }
                                : {
                                    color: "var(--text-primary-ds)",
                                    border: "1px solid var(--border-default)",
                                  }
                            }
                          >
                            {pageNum}
                          </button>
                        );
                      }
                    )}
                    {pagination.totalPages > 5 && (
                      <span
                        className="relative inline-flex items-center px-4 py-2 text-sm font-semibold"
                        style={{
                          color: "var(--text-tertiary)",
                          border: "1px solid var(--border-default)",
                        }}
                      >
                        ...
                      </span>
                    )}
                    <button
                      disabled={searchState.page >= pagination.totalPages || isLoading}
                      onClick={() => setSearchState({ page: searchState.page + 1 })}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 transition-colors duration-150 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      style={{
                        color: "var(--text-tertiary)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                    </button>
                  </nav>
                </div>
              )}
            </div>
          ) : (
            /* Empty state when no persona selected */
            <div className="mt-4">
              <EmptyState
                icon={Search}
                title="Start a search"
                description="Type a query above and press Search, or select a saved persona to discover matching prospects."
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
            {/* Inline create new list */}
            {showNewListInput ? (
              <div className="flex items-center gap-2 mb-3">
                <Input
                  autoFocus
                  placeholder="New list name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && newListName.trim()) {
                      e.preventDefault();
                      setIsCreatingList(true);
                      const fd = new FormData();
                      fd.set("name", newListName.trim());
                      const res = await createListAction(fd);
                      if (res.success && res.list) {
                        setLocalLists((prev) => [res.list!, ...prev]);
                        setBulkSelectedListIds((prev) => [...prev, res.list!.id]);
                        setNewListName("");
                        setShowNewListInput(false);
                      }
                      setIsCreatingList(false);
                    } else if (e.key === "Escape") {
                      setShowNewListInput(false);
                      setNewListName("");
                    }
                  }}
                  disabled={isCreatingList}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  disabled={!newListName.trim() || isCreatingList}
                  onClick={async () => {
                    setIsCreatingList(true);
                    const fd = new FormData();
                    fd.set("name", newListName.trim());
                    const res = await createListAction(fd);
                    if (res.success && res.list) {
                      setLocalLists((prev) => [res.list!, ...prev]);
                      setBulkSelectedListIds((prev) => [...prev, res.list!.id]);
                      setNewListName("");
                      setShowNewListInput(false);
                    }
                    setIsCreatingList(false);
                  }}
                >
                  {isCreatingList ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowNewListInput(false); setNewListName(""); }}
                  disabled={isCreatingList}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mb-3 w-full"
                onClick={() => setShowNewListInput(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New List
              </Button>
            )}

            {localLists.length === 0 && !showNewListInput ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">No lists yet</p>
                <Button size="sm" onClick={() => setShowNewListInput(true)}>
                  Create your first list
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {localLists.map((list) => (
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
          {localLists.length > 0 && (
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
