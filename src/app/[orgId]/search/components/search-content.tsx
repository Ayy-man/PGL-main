"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Persona } from "@/lib/personas/types";
import type { SavedSearchProspect } from "@/lib/personas/types";
import type { List } from "@/lib/lists/types";
import type { PersonaFiltersType } from "@/lib/apollo/schemas";
import type { ApolloPerson } from "@/lib/apollo/types";
import { useSearch, PAGE_SIZE } from "../hooks/use-search";
import { DiscoverTab } from "./discover-tab";
import { SavedSearchesTab } from "./saved-searches-tab";
import { BulkActionsBar } from "./bulk-actions-bar";
import { ProspectResultsTable } from "./prospect-results-table";
import { ProspectSlideOver } from "@/components/prospect/prospect-slide-over";
import { Search, AlertCircle, RefreshCw, Loader2, Plus, X } from "lucide-react";
import { ReportIssueButton } from "@/components/issues/report-issue-button";
import { PersonaFormDialog } from "../../personas/components/persona-form-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Confirmation,
  ConfirmationIcon,
  ConfirmationTitle,
  ConfirmationDescription,
} from "@/components/ui/confirmation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { createListAction } from "../../lists/actions";
import { runOptimisticDismiss } from "../lib/dismiss-reducer";

interface SearchContentProps {
  personas: Persona[];
  lists: List[];
  orgId: string;
  canEdit?: boolean;
}

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <td className="py-4 pl-5 pr-3"><Skeleton className="h-4 w-4 rounded" /></td>
      <td className="px-3 py-4"><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1.5"><Skeleton className="h-4 w-28 rounded" /><Skeleton className="h-3 w-20 rounded" /></div></div></td>
      <td className="px-3 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
      <td className="px-3 py-4"><div className="space-y-1.5"><Skeleton className="h-4 w-32 rounded" /><Skeleton className="h-3 w-24 rounded" /></div></td>
      <td className="px-3 py-4"><div className="flex gap-1"><Skeleton className="h-2.5 w-2.5 rounded-full" /><Skeleton className="h-2.5 w-2.5 rounded-full" /><Skeleton className="h-2.5 w-2.5 rounded-full" /></div></td>
      <td className="px-3 py-4" />
    </tr>
  );
}

function savedProspectToApolloPerson(
  sp: SavedSearchProspect
): ApolloPerson & { _savedSearchMeta?: { status: string; is_new: boolean; prospect_id: string | null; last_seen_at: string } } {
  const data = sp.apollo_data as Record<string, unknown>;
  const org = data.organization as Record<string, unknown> | undefined;
  return {
    id: sp.apollo_person_id,
    first_name: (data.first_name as string) ?? "",
    last_name: (data.last_name as string) ?? "",
    name: (data.name as string) ?? "",
    title: (data.title as string) ?? "",
    organization_name: (data.organization_name as string) ?? undefined,
    organization: org ? { name: (org.name as string) ?? "" } : undefined,
    city: (data.city as string) ?? undefined,
    state: (data.state as string) ?? undefined,
    country: (data.country as string) ?? undefined,
    email_status: (data.email_status as string) ?? undefined,
    photo_url: (data.photo_url as string) ?? undefined,
    linkedin_url: (data.linkedin_url as string) ?? undefined,
    first_seen_at: sp.first_seen_at,
    // Mark unlinked prospects as preview-only so the Apollo bulk-enrich de-obfuscation step
    // runs when enriching from saved search mode (without this, _enriched is undefined which
    // !== false, so bulk-enrich is skipped and the obfuscated name gets stored in prospects table)
    _enriched: sp.status === 'enriched' ? true : false,
    _savedSearchMeta: {
      status: sp.status,
      is_new: sp.is_new,
      prospect_id: sp.prospect_id,
      last_seen_at: sp.last_seen_at,
    },
  };
}

export function SearchContent({ personas, lists, orgId, canEdit = true }: SearchContentProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Tab state — D-01/D-02 (Discover is default)
  // If URL arrives with ?persona=X (e.g. from /personas "Search Prospects" button),
  // start on the Saved Searches tab so the selected search's results render immediately.
  const [activeTab, setActiveTab] = useState<"discover" | "saved">(() => {
    if (typeof window === "undefined") return "discover";
    const params = new URLSearchParams(window.location.search);
    return params.get("persona") ? "saved" : "discover";
  });

  // PersonaFormDialog controlled state (shared by Discover "Save as new search"
  // button and sidebar "+ New" button)
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  // Edit dialog for modifying saved search filters (BUG-010)
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const {
    searchState,
    setSearchState,
    results,
    pagination,
    isLoading,
    error,
    executeSearch,
    filterOverrides,
    setFilterOverrides,
    lastParsedFilters,
  } = useSearch();

  const hasActiveSearch = Boolean(searchState.persona) || Boolean(searchState.keywords?.trim());

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk list dialog state
  const [bulkListDialogOpen, setBulkListDialogOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"add" | "enrich">("add");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkSelectedListIds, setBulkSelectedListIds] = useState<string[]>([]);
  const [listSearch, setListSearch] = useState("");

  // Inline list creation state
  const [localLists, setLocalLists] = useState<List[]>(lists);
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isCreatingList, setIsCreatingList] = useState(false);

  // Filtered lists for bulk dialog search
  const filteredLists = useMemo(
    () => localLists.filter((l) => l.name.toLowerCase().includes(listSearch.toLowerCase())),
    [localLists, listSearch]
  );

  // Saved search state
  const [savedProspects, setSavedProspects] = useState<SavedSearchProspect[]>([]);
  const [dismissedCount, setDismissedCount] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [totalApolloResults, setTotalApolloResults] = useState<number | null>(null);
  const [apolloPagesFetched, setApolloPagesFetched] = useState<number>(0);
  const [showDismissed, setShowDismissed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSavedSearchMode, setIsSavedSearchMode] = useState(false);
  // Saved search pagination
  const [savedPage, setSavedPage] = useState(1);
  const [savedPageSize, setSavedPageSize] = useState(50);
  // Discover pagination — "jump to page" input
  const [jumpPageOpen, setJumpPageOpen] = useState(false);
  const [jumpPageValue, setJumpPageValue] = useState("");
  // Ref for auto-scroll to results (M3)
  const resultsRef = useRef<HTMLDivElement>(null);
  // Dismiss confirmation dialog
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [pendingDismissIds, setPendingDismissIds] = useState<string[]>([]);

  // Sync local lists with prop
  useEffect(() => {
    setLocalLists(lists);
  }, [lists]);

  // Reset to page 1 when saved prospects reload or page size changes
  useEffect(() => {
    setSavedPage(1);
  }, [savedProspects, savedPageSize]);

  // ----------------------------------------------------------------
  // Saved search helpers
  // ----------------------------------------------------------------
  const loadSavedProspects = useCallback(async (searchId: string) => {
    try {
      const resp = await fetch(`/api/search/${searchId}/prospects?includeDismissed=${showDismissed}`);
      if (!resp.ok) throw new Error("Failed to load");
      const data = await resp.json();
      setSavedProspects(data.prospects);
      setDismissedCount(data.dismissedCount);
      setLastRefreshedAt(data.lastRefreshedAt);
      setTotalApolloResults(data.totalApolloResults);
      setApolloPagesFetched(data.apolloPagesFetched ?? 0);
      setIsSavedSearchMode(true);
    } catch {
      // Fallback to Apollo search
      setIsSavedSearchMode(false);
    }
  }, [showDismissed]);

  const handleRefresh = useCallback(async (searchId?: string) => {
    const id = searchId || searchState.persona;
    if (!id) return;
    setIsRefreshing(true);
    try {
      const resp = await fetch(`/api/search/${id}/refresh`, { method: "POST" });
      if (!resp.ok) throw new Error("Refresh failed");
      const result = await resp.json();
      toast({
        title: "Search refreshed",
        description: `${result.newProspects} new prospects found${result.resurfaced > 0 ? `, ${result.resurfaced} resurfaced` : ""}.`,
      });
      // Reload from DB to get updated data
      await loadSavedProspects(id);
    } catch {
      toast({ title: "Refresh failed", description: "Could not refresh search results.", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  }, [searchState.persona, loadSavedProspects, toast]);

  const handleLoadMore = useCallback(async () => {
    const id = searchState.persona;
    if (!id) return;
    setIsLoadingMore(true);
    try {
      const resp = await fetch(`/api/search/${id}/extend`, { method: "POST" });
      if (!resp.ok) throw new Error("Load more failed");
      const result = await resp.json();
      const total = result.newProspects + savedProspects.length;
      toast({
        title: result.newProspects > 0 ? `${total.toLocaleString()} leads loaded` : "No more leads",
      });
      await loadSavedProspects(id);
    } catch {
      toast({ title: "Load more failed", description: "Could not fetch additional leads.", variant: "destructive" });
    } finally {
      setIsLoadingMore(false);
    }
  }, [searchState.persona, loadSavedProspects, savedProspects.length, toast]);

  const handleUndoDismiss = useCallback(async (apolloPersonId: string) => {
    if (!searchState.persona) return;

    setDismissedCount(prev => Math.max(0, prev - 1));
    toast({ title: "Prospect restored" });

    try {
      const resp = await fetch(`/api/search/${searchState.persona}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "undo", apolloPersonIds: [apolloPersonId] }),
      });
      if (!resp.ok) throw new Error("Undo failed");
      // Reload in background to get the restored prospect
      await loadSavedProspects(searchState.persona);
    } catch {
      setDismissedCount(prev => prev + 1);
      toast({ title: "Restore failed", variant: "destructive" });
    }
  }, [searchState.persona, loadSavedProspects, toast]);

  const handleDismiss = useCallback(async (apolloPersonIds: string[]) => {
    if (!searchState.persona) return;
    const persona = searchState.persona;

    // Save for rollback (captured before UI reset)
    const previousProspects = savedProspects;
    const previousDismissedCount = dismissedCount;

    // UI bookkeeping (selection + dialog) happens synchronously;
    // reducer + fetch handled by runOptimisticDismiss
    setSelectedIds(new Set());
    setDismissDialogOpen(false);
    setPendingDismissIds([]);

    // Derive display name for single-dismiss toast (apollo_data is Record<string, unknown>)
    const displayName = (() => {
      if (apolloPersonIds.length !== 1) return undefined;
      const row = previousProspects.find((p) => p.apollo_person_id === apolloPersonIds[0]);
      const name = row?.apollo_data && typeof row.apollo_data === "object"
        ? (row.apollo_data as { name?: string }).name
        : undefined;
      return typeof name === "string" && name.length > 0 ? name : undefined;
    })();

    // Undo handler: restore UI instantly + POST undo to server; uses the
    // same single-id endpoint for each id so partial failures are visible.
    const handleUndoClick = async () => {
      setSavedProspects(previousProspects);
      setDismissedCount(previousDismissedCount);
      try {
        const resp = await fetch(`/api/search/${persona}/dismiss`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "undo", apolloPersonIds }),
        });
        if (!resp.ok) throw new Error("Undo failed");
        await loadSavedProspects(persona);
      } catch {
        toast({ title: "Restore failed", variant: "destructive" });
      }
    };

    await runOptimisticDismiss({
      previous: { prospects: previousProspects, dismissedCount: previousDismissedCount },
      apolloPersonIds,
      searchId: persona,
      fetchImpl: fetch,
      setState: (next) => {
        // Cast through unknown: reducer types DismissProspect with only
        // apollo_person_id, but at runtime the reducer preserves the full
        // SavedSearchProspect rows (filter only). This is safe because we
        // never pass fabricated rows in — we pass React state back and forth.
        setSavedProspects(next.prospects as unknown as SavedSearchProspect[]);
        setDismissedCount(next.dismissedCount);
      },
      toast,
      undoAction: (
        <ToastAction altText="Undo" onClick={handleUndoClick}>
          Undo
        </ToastAction>
      ),
      displayName,
    });
  }, [searchState.persona, savedProspects, dismissedCount, loadSavedProspects, toast]);

  const handleBulkDismissClick = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setPendingDismissIds(ids);
    setDismissDialogOpen(true);
  }, [selectedIds]);

  // Persona change effect — load from DB or run first refresh
  useEffect(() => {
    setSelectedIds(new Set());
    setFilterOverrides({});
    setShowDismissed(false);

    if (!searchState.persona) {
      setIsSavedSearchMode(false);
      setSavedProspects([]);
      return;
    }

    const selectedPersona = personas.find(p => p.id === searchState.persona);
    if (!selectedPersona) return;

    if (selectedPersona.last_refreshed_at) {
      setIsSavedSearchMode(true);  // L5: Set immediately to prevent stale results flash
      loadSavedProspects(selectedPersona.id);
      // Check staleness (>7 days)
      const daysSinceRefresh = (Date.now() - new Date(selectedPersona.last_refreshed_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceRefresh > 7) {
        toast({ title: "Results may be outdated", description: "This search hasn't been refreshed in over a week. Click Refresh to update.", variant: "default" });
      }
    } else {
      // First load — trigger refresh
      handleRefresh(selectedPersona.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchState.persona]);

  // Reload when showDismissed toggles
  useEffect(() => {
    if (isSavedSearchMode && searchState.persona) {
      loadSavedProspects(searchState.persona);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDismissed]);

  // Auto-scroll to results when they arrive (M3)
  useEffect(() => {
    if ((results.length > 0 || savedProspects.length > 0) && resultsRef.current) {
      const timer = setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [results.length, savedProspects.length]);

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
    if (isSavedSearchMode) {
      // Enriched prospects show an indicator instead of a checkbox — exclude from Select All
      const selectableIds = savedProspects
        .filter(p => p.status !== 'enriched')
        .map((p) => p.apollo_person_id);
      if (selectedIds.size === selectableIds.length && selectableIds.length > 0) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(selectableIds));
      }
    } else {
      if (selectedIds.size === results.length) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(results.map((r) => r.id)));
      }
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
    // Typing a keyword query exits saved search mode — the two modes are mutually exclusive.
    // Saved search mode shows stored DB prospects; keyword search hits Apollo live.
    // For filtering within a saved search, use the Advanced Filters panel instead.
    setSearchState({ keywords, persona: "" });
    // M9: Clear stale saved search state so previous results don't leak through
    setSavedProspects([]);
    setIsSavedSearchMode(false);
  };

  const handleSelectSavedSearch = (id: string) => {
    setSearchState({ persona: id, keywords: "" });
    setActiveTab("saved");
  };

  // ----------------------------------------------------------------
  // Filter override handler
  // ----------------------------------------------------------------
  const handleApplyFilters = (filters: Partial<PersonaFiltersType>) => {
    if (isSavedSearchMode) {
      toast({
        title: "Filters changed",
        description: "Changing filters will refresh results. Previously dismissed prospects may reappear if they match the new criteria.",
      });
    }
    if (filters.keywords !== undefined) {
      setSearchState({ keywords: filters.keywords });
    }
    const { keywords: _keywords, ...nonKeywordOverrides } = filters;
    setFilterOverrides((prev) => {
      const next = { ...prev, ...nonKeywordOverrides } as Partial<PersonaFiltersType>;
      (Object.keys(next) as Array<keyof PersonaFiltersType>).forEach((k) => {
        if (next[k] === undefined) delete next[k];
      });
      return next;
    });
  };

  // ----------------------------------------------------------------
  // Bulk action handlers
  // ----------------------------------------------------------------
  const handleBulkAddToList = () => {
    if (selectedIds.size === 0) return;
    const activeResults = isSavedSearchMode ? savedProspects.map(savedProspectToApolloPerson) : results;
    const selected = activeResults.filter((r) => selectedIds.has(r.id));
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
    const activeResults = isSavedSearchMode ? savedProspects.map(savedProspectToApolloPerson) : results;
    const selectedProspects = activeResults.filter((r) => selectedIds.has(r.id));

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
    const activeResults = isSavedSearchMode ? savedProspects.map(savedProspectToApolloPerson) : results;
    const allSelected = activeResults.filter((r) => selectedIds.has(r.id));

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

        // Hard-abort on enrich failure: previously we would fall through to
        // upserting the raw preview data, which always 400'd against the
        // OBFUSCATED_PROSPECT guard in /api/prospects/upsert and left users
        // with an unexplained "Partial success" toast. Now we surface the
        // real Apollo error and keep the selection intact so they can retry.
        try {
          const enrichResp = await fetch("/api/apollo/bulk-enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apolloIds: previewIds, previews }),
          });

          if (!enrichResp.ok) {
            const err = await enrichResp.json().catch(() => ({}));
            toast({
              title: "Apollo enrichment failed",
              description:
                err.error ||
                `Apollo returned ${enrichResp.status}. Your selection was not added to the list — please try again.`,
              variant: "destructive",
            });
            setIsBulkSubmitting(false);
            setBulkListDialogOpen(false);
            return;
          }

          const enrichData = await enrichResp.json();
          const enrichedPeople = enrichData.people;
          if (enrichData.mock) {
            toast({
              title: "Using mock Apollo data",
              description:
                "Apollo credits exhausted — fake names/emails generated for testing. Disable APOLLO_MOCK_ENRICHMENT when credits renew.",
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
        } catch {
          toast({
            title: "Apollo enrichment failed",
            description:
              "Network error while contacting Apollo. Your selection was not added to the list — please try again.",
            variant: "destructive",
          });
          setIsBulkSubmitting(false);
          setBulkListDialogOpen(false);
          return;
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
    ? (isSavedSearchMode
        ? savedProspects.map(savedProspectToApolloPerson).find((r) => r.id === searchState.prospect)
        : results.find((r) => r.id === searchState.prospect)) ?? null
    : null;

  // Prefer the Supabase UUID so re-enrich hits the right row directly.
  // Look up directly in savedProspects (typed as SavedSearchProspect[]) to avoid union collapse.
  // Falls back to the apollo_person_id; the enrich route resolves that via apollo_id lookup.
  const savedSearchEntry = isSavedSearchMode
    ? savedProspects.find((p) => p.apollo_person_id === searchState.prospect)
    : null;
  const slideOverProspectId =
    (savedSearchEntry?.prospect_id ?? (isSavedSearchMode ? searchState.prospect : null)) || null;

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
        phone: selectedProspect.phone_numbers?.[0]?.raw_number ?? null,
        _enriched: selectedProspect._enriched === true,
      }
    : null;

  // Determine the active results to display
  const activeResults = isSavedSearchMode ? savedProspects.map(savedProspectToApolloPerson) : results;
  const activeResultCount = isSavedSearchMode ? savedProspects.length : results.length;

  // ----------------------------------------------------------------
  // Inline results helper — extracted from legacy results block
  // ----------------------------------------------------------------
  const renderSavedSearchResults = () => {
    const savedTotalPages = Math.ceil(savedProspects.length / savedPageSize);
    const pagedSavedResults = isSavedSearchMode
      ? savedProspects
          .slice((savedPage - 1) * savedPageSize, savedPage * savedPageSize)
          .map(savedProspectToApolloPerson)
      : activeResults;
    const tableResults = isSavedSearchMode ? pagedSavedResults : activeResults;

    return (
      <div ref={resultsRef}>
        {/* Bulk actions bar */}
        {((isSavedSearchMode && savedProspects.length > 0) || (!isSavedSearchMode && hasActiveSearch && results.length > 0)) && (
          <BulkActionsBar
            selectedCount={selectedIds.size}
            totalCount={activeResultCount}
            allSelected={
              selectedIds.size === activeResultCount && activeResultCount > 0
            }
            onSelectAll={handleSelectAll}
            onAddToList={handleBulkAddToList}
            onExport={handleBulkExport}
            onEnrich={handleBulkEnrich}
            onDismiss={handleBulkDismissClick}
            showDismiss={isSavedSearchMode}
            canEdit={canEdit}
          />
        )}

        {/* Loading state: skeleton table */}
        {(isLoading || isRefreshing) && activeResultCount === 0 && (
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
        {!isLoading && !isRefreshing && activeResultCount === 0 && hasActiveSearch && (
          <EmptyState
            icon={Search}
            title="No matching prospects"
            description="Try broadening the persona filters or adjusting your search keywords."
          />
        )}

        {/* Prospect results table */}
        {((isSavedSearchMode && savedProspects.length > 0) || (!isSavedSearchMode && hasActiveSearch && results.length > 0)) && (
          <div style={{ opacity: isLoading && !isRefreshing ? 0.5 : 1, transition: "opacity 0.2s ease" }}>
            <ProspectResultsTable
              results={tableResults}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onProspectClick={handleProspectClick}
              savedSearchMode={isSavedSearchMode}
              onDismiss={isSavedSearchMode ? (id) => {
                setPendingDismissIds([id]);
                setDismissDialogOpen(true);
              } : undefined}
              onUndoDismiss={handleUndoDismiss}
              lastRefreshedAt={lastRefreshedAt}
            />
          </div>
        )}

        {/* Pagination — saved search mode */}
        {isSavedSearchMode && savedProspects.length > 0 && (
          <div
            className="flex items-center justify-between py-4 px-2"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center gap-3">
              <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                Showing{" "}
                <span style={{ color: "var(--text-primary-ds)" }} className="font-medium">
                  {Math.min((savedPage - 1) * savedPageSize + 1, savedProspects.length)}
                </span>{" "}
                –{" "}
                <span style={{ color: "var(--text-primary-ds)" }} className="font-medium">
                  {Math.min(savedPage * savedPageSize, savedProspects.length)}
                </span>{" "}
                of{" "}
                <span style={{ color: "var(--text-primary-ds)" }} className="font-medium">
                  {savedProspects.length.toLocaleString()}
                </span>
              </p>
              <select
                value={savedPageSize}
                onChange={(e) => setSavedPageSize(Number(e.target.value))}
                className="text-[13px] rounded-md px-2 py-1 cursor-pointer"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary-ds)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {[10, 50, 100, 500].map((n) => (
                  <option key={n} value={n}>{n} per page</option>
                ))}
              </select>
            </div>
            <nav className="isolate inline-flex -space-x-px rounded-md">
              <button
                disabled={savedPage <= 1}
                onClick={() => setSavedPage((p) => Math.max(1, p - 1))}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 transition-colors duration-150 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                style={{ color: "var(--text-tertiary)", border: "1px solid var(--border-default)" }}
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
              </button>
              {(() => {
                const maxButtons = 5;
                let startPage = Math.max(1, savedPage - Math.floor(maxButtons / 2));
                const endPage = Math.min(savedTotalPages, startPage + maxButtons - 1);
                if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);
                return Array.from({ length: endPage - startPage + 1 }, (_, i) => {
                  const pageNum = startPage + i;
                  const isActive = pageNum === savedPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setSavedPage(pageNum)}
                      aria-current={isActive ? "page" : undefined}
                      className="relative inline-flex items-center px-4 py-2 text-sm font-semibold transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-primary)]"
                      style={
                        isActive
                          ? { background: "var(--gold-primary)", color: "var(--bg-root)", zIndex: 10 }
                          : { color: "var(--text-primary-ds)", border: "1px solid var(--border-default)" }
                      }
                    >
                      {pageNum}
                    </button>
                  );
                });
              })()}
              <button
                disabled={savedPage >= savedTotalPages}
                onClick={() => setSavedPage((p) => Math.min(savedTotalPages, p + 1))}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 transition-colors duration-150 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                style={{ color: "var(--text-tertiary)", border: "1px solid var(--border-default)" }}
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
              </button>
            </nav>
          </div>
        )}

        {/* Pagination — Apollo discover mode */}
        {!isSavedSearchMode && pagination.totalPages > 1 && (
          <div
            className="flex items-center justify-between py-4 px-2"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
          >
            <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
              Showing{" "}
              <span style={{ color: "var(--text-primary-ds)" }} className="font-medium">
                {(searchState.page - 1) * PAGE_SIZE + 1}
              </span>{" "}
              to{" "}
              <span style={{ color: "var(--text-primary-ds)" }} className="font-medium">
                {Math.min(searchState.page * PAGE_SIZE, pagination.totalEntries)}
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
              {(() => {
                const maxButtons = 5;
                let startPage = Math.max(1, searchState.page - Math.floor(maxButtons / 2));
                const endPage = Math.min(pagination.totalPages, startPage + maxButtons - 1);
                if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);
                return Array.from({ length: endPage - startPage + 1 }, (_, i) => {
                  const pageNum = startPage + i;
                  const isActive = pageNum === searchState.page;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setSearchState({ page: pageNum })}
                      disabled={isLoading}
                      aria-current={isActive ? "page" : undefined}
                      className="relative inline-flex items-center px-4 py-2 text-sm font-semibold transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-primary)]"
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
                });
              })()}
              {pagination.totalPages > 5 && (
                jumpPageOpen ? (
                  <input
                    type="number"
                    min={1}
                    max={pagination.totalPages}
                    autoFocus
                    value={jumpPageValue}
                    onChange={(e) => setJumpPageValue(e.target.value)}
                    onBlur={() => {
                      setJumpPageOpen(false);
                      setJumpPageValue("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const n = parseInt(jumpPageValue, 10);
                        if (!isNaN(n) && n >= 1 && n <= pagination.totalPages) {
                          setSearchState({ page: n });
                        }
                        setJumpPageOpen(false);
                        setJumpPageValue("");
                      } else if (e.key === "Escape") {
                        setJumpPageOpen(false);
                        setJumpPageValue("");
                      }
                    }}
                    placeholder={`1-${pagination.totalPages}`}
                    className="relative inline-flex items-center px-2 py-2 text-sm font-semibold w-20 text-center outline-none focus:ring-2 focus:ring-[var(--gold-primary)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none animate-in fade-in duration-150"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary-ds)",
                      border: "1px solid var(--border-default)",
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setJumpPageValue(String(searchState.page));
                      setJumpPageOpen(true);
                    }}
                    disabled={isLoading}
                    aria-label="Jump to page"
                    title="Jump to page"
                    className="relative inline-flex items-center px-4 py-2 text-sm font-semibold transition-colors duration-150 cursor-pointer hover:text-[var(--text-primary-ds)]"
                    style={{
                      color: "var(--text-tertiary)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    ...
                  </button>
                )
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

        {/* "Load 500 more" — appears on the last page of saved results when more leads exist in Apollo */}
        {isSavedSearchMode &&
          totalApolloResults !== null &&
          savedProspects.length < totalApolloResults &&
          apolloPagesFetched < 500 &&
          (savedProspects.length === 0 || savedPage === Math.max(1, Math.ceil(savedProspects.length / savedPageSize))) && (
            <div className="flex flex-col items-center gap-2 py-6">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background: "var(--gold-primary)",
                  color: "var(--bg-root)",
                }}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading next 500…
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Load next 500 from Apollo
                  </>
                )}
              </button>
              <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                Showing{" "}
                <span style={{ color: "var(--text-primary-ds)" }} className="font-medium">
                  {savedProspects.length.toLocaleString()}
                </span>{" "}
                of{" "}
                <span style={{ color: "var(--text-primary-ds)" }} className="font-medium">
                  {totalApolloResults.toLocaleString()}
                </span>{" "}
                total matches
              </p>
            </div>
          )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Error state — full replacement (preserved from existing) */}
      {error ? (
        <EmptyState icon={AlertCircle} title={error} variant="error">
          <Button variant="outline" size="sm" onClick={executeSearch}>
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </EmptyState>
      ) : (
        <>
          {/* ============ TAB BAR (D-01, D-02, D-03) ============ */}
          <div
            className="flex items-center gap-1 px-4"
            style={{
              background: "var(--bg-elevated)",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            {(["discover", "saved"] as const).map((tab) => {
              const label = tab === "discover" ? "Discover" : "Saved Searches";
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="text-[14px] font-medium px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    color: isActive ? "var(--text-primary-ds)" : "var(--text-secondary-ds)",
                    borderBottom: isActive ? "2px solid var(--gold-primary)" : "2px solid transparent",
                    marginBottom: "-1px",
                  }}
                >
                  {label}
                </button>
              );
            })}
            <div className="ml-auto">
              <ReportIssueButton
                target={{
                  type: "search",
                  snapshot: {
                    query: searchState.keywords ?? null,
                    filters: searchState.persona ?? null,
                    persona_name: personas.find((p) => p.id === searchState.persona)?.name ?? null,
                    result_count: activeResultCount,
                    active_tab: activeTab,
                    page: searchState.page ?? 1,
                    page_size: PAGE_SIZE,
                    total_personas: personas.length,
                  },
                }}
              />
            </div>
          </div>

          {/* ============ TAB PANELS ============ */}
          <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === "discover" ? (
            <>
            <DiscoverTab
              personas={personas}
              savedSearchCounts={{}}
              keywords={searchState.keywords}
              isLoading={isLoading}
              hasResults={results.length > 0}
              currentFilters={filterOverrides}
              onNLSearch={handleNLSearch}
              onApplyFilters={handleApplyFilters}
              onSubmitSearch={() => {
                // No-op: search is triggered by keyword state change via useEffect.
                // Tab navigation is handled by handleNLSearch.
                // Calling executeSearch() here caused double API call (H1/H2).
              }}
              onSaveAsNewSearch={() => setCreateDialogOpen(true)}
              onSelectSavedSearch={handleSelectSavedSearch}
              onViewAllSaved={() => setActiveTab("saved")}
              onClearSearch={() => setSearchState({ keywords: "", persona: "" })}
            />
            {/* Live Apollo results — shown inline below the search bar */}
            {!isSavedSearchMode && hasActiveSearch && (
              <div className="max-w-[960px] mx-auto px-4 pb-8">
                <div style={{ opacity: isLoading && results.length > 0 ? 0.5 : 1, transition: "opacity 200ms ease" }}>
                  {renderSavedSearchResults()}
                </div>
              </div>
            )}
            </>
          ) : (
            <SavedSearchesTab
              personas={personas}
              selectedId={searchState.persona}
              onSelect={(id) => setSearchState({ persona: id, keywords: "" })}
              createButton={
                <button
                  type="button"
                  onClick={() => setCreateDialogOpen(true)}
                  className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 cursor-pointer w-full justify-center"
                  style={{
                    background: "transparent",
                    border: "1px dashed var(--border-default)",
                    color: "var(--text-secondary-ds)",
                  }}
                >
                  <Plus className="h-3 w-3" />
                  New Search
                </button>
              }
              createButtonCollapsed={
                <button
                  type="button"
                  onClick={() => setCreateDialogOpen(true)}
                  aria-label="New saved search"
                  className="flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 cursor-pointer"
                  style={{
                    background: "transparent",
                    border: "1px dashed var(--border-default)",
                    color: "var(--text-secondary-ds)",
                  }}
                >
                  <Plus className="h-3 w-3" />
                </button>
              }
              prospectCount={isSavedSearchMode ? savedProspects.length : 0}
              lastRefreshedAt={lastRefreshedAt}
              onRefresh={() => handleRefresh()}
              isRefreshing={isRefreshing}

              onEditFilters={() => setEditDialogOpen(true)}
              headerRightSlot={
                isSavedSearchMode ? (
                  <button
                    onClick={() => setShowDismissed(!showDismissed)}
                    className="text-[13px] px-2 py-1 rounded-md transition-colors"
                    style={{
                      color: showDismissed ? "var(--gold-text)" : "var(--text-tertiary)",
                      background: showDismissed ? "rgba(212, 175, 55, 0.1)" : "transparent",
                    }}
                  >
                    {showDismissed ? "Hide" : "Show"} dismissed ({dismissedCount})
                  </button>
                ) : null
              }
            >
              {/* Results panel children: bulk actions + table + loading + empty states */}
              {/* M8: Only render results in saved tab when a persona is selected */}
              {(isSavedSearchMode || searchState.persona) && renderSavedSearchResults()}
            </SavedSearchesTab>
          )}
          </div>
        </>
      )}

      {/* ============ CONTROLLED PersonaFormDialog (shared trigger) ============ */}
      <PersonaFormDialog
        mode="create"
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        trigger={null}
        initialKeywords={searchState.keywords}
        initialFilterOverrides={{ ...lastParsedFilters, ...filterOverrides }}
      />

      {/* Edit filters dialog for saved searches (BUG-010) */}
      {searchState.persona && (() => {
        const editPersona = personas.find(p => p.id === searchState.persona);
        if (!editPersona) return null;
        return (
          <PersonaFormDialog
            mode="edit"
            persona={editPersona}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onUpdated={() => {
              // Refresh AFTER the DB write completes (onUpdated fires post-await,
              // unlike onOpenChange which fires on optimistic close before the
              // server action runs). Also refresh the server component data so
              // the filter pills update.
              if (searchState.persona) {
                handleRefresh(searchState.persona);
                router.refresh();
              }
            }}
            trigger={null}
          />
        );
      })()}

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
              <div className="mb-3">
                <div className="flex items-center gap-2">
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
                      } else {
                        toast({ title: "Failed to create list", description: res.error || "Please try again.", variant: "destructive" });
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
                    } else {
                      toast({ title: "Failed to create list", description: res.error || "Please try again.", variant: "destructive" });
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
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  <kbd className="font-sans">↵</kbd> to create · <kbd className="font-sans">Esc</kbd> to cancel
                </span>
              </div>
              ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="mb-3 w-full"
                  onClick={() => setShowNewListInput(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  New List
                </Button>
                {localLists.length > 0 && (
                  <Input
                    placeholder="Search lists..."
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    className="mb-3"
                  />
                )}
              </>
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
                {filteredLists.map((list) => (
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

      {/* Dismiss confirmation dialog */}
      <Dialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <DialogContent>
          <Confirmation
            isDestructive
            confirmLabel="Dismiss"
            cancelLabel="Cancel"
            onConfirm={() => {
              handleDismiss(pendingDismissIds);
            }}
            onCancel={() => setDismissDialogOpen(false)}
          >
            <ConfirmationIcon variant="destructive" />
            <ConfirmationTitle>
              Dismiss {pendingDismissIds.length === 1 ? "this prospect" : `${pendingDismissIds.length} prospects`}?
            </ConfirmationTitle>
            <ConfirmationDescription>
              {pendingDismissIds.length === 1
                ? "They won't appear in future refreshes of this search. You can undo this later."
                : `These ${pendingDismissIds.length} prospects won't appear in future refreshes of this search.`}
            </ConfirmationDescription>
          </Confirmation>
        </DialogContent>
      </Dialog>

      {/* ProspectSlideOver — always rendered, controlled by URL param */}
      <ProspectSlideOver
        open={Boolean(searchState.prospect)}
        onClose={handleSlideOverClose}
        prospectId={slideOverProspectId}
        prospect={slideOverProspect}
        orgId={orgId}
        canEdit={canEdit}
        onEnrich={(id) => {
          setSelectedIds(new Set([id]));
          setBulkMode("enrich");
          setBulkSelectedListIds([]);
          setBulkListDialogOpen(true);
        }}
        onAddToList={(id) => {
          setSelectedIds(new Set([id]));
          setBulkMode("add");
          setBulkSelectedListIds([]);
          setBulkListDialogOpen(true);
        }}
        fromQuery={
          isSavedSearchMode && searchState.persona
            ? `?from=saved-search&searchId=${searchState.persona}&searchName=${encodeURIComponent(personas.find(p => p.id === searchState.persona)?.name ?? "")}`
            : "?from=search"
        }
      />
    </div>
  );
}
