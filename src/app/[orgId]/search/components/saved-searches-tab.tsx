"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchSidebarRail } from "./search-sidebar-rail";
import { SavedSearchViewHeader } from "./saved-search-view-header";
import type { Persona } from "@/lib/personas/types";

const COLLAPSE_STORAGE_KEY = "pgl:search-sidebar-collapsed";

interface SavedSearchesTabProps {
  personas: Persona[];
  selectedId: string;
  onSelect: (id: string) => void;
  createButton: React.ReactNode;
  createButtonCollapsed: React.ReactNode;

  // View header props (only used when selectedId is set)
  prospectCount: number;
  lastRefreshedAt: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  headerRightSlot?: React.ReactNode;

  /** Results panel contents: BulkActionsBar + ProspectResultsTable (+ pagination if any), provided by Plan 04. */
  children?: React.ReactNode;
}

export function SavedSearchesTab({
  personas,
  selectedId,
  onSelect,
  createButton,
  createButtonCollapsed,
  prospectCount,
  lastRefreshedAt,
  onRefresh,
  isRefreshing,
  headerRightSlot,
  children,
}: SavedSearchesTabProps) {
  // Sidebar collapse state with localStorage persistence
  // Start as false (expanded) to avoid SSR/CSR hydration mismatch
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate from localStorage on mount (client-only to avoid SSR mismatch)
  useEffect(() => {
    try {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(COLLAPSE_STORAGE_KEY)
          : null;
      if (stored === "true") setCollapsed(true);
    } catch {
      // localStorage may be unavailable (private mode) — fall back to expanded
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
        }
      } catch {
        // ignore quota errors
      }
      return next;
    });
  };

  const selectedPersona = personas.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="page-enter flex flex-row h-full min-h-[600px]">
      {/* Left: sidebar rail */}
      <SearchSidebarRail
        personas={personas}
        selectedId={selectedId}
        onSelect={onSelect}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        createButton={createButton}
        createButtonCollapsed={createButtonCollapsed}
      />

      {/* Right: results panel */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {personas.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No saved searches yet"
            description="Create a search on the Discover tab to save it here for quick access."
          />
        ) : !selectedPersona ? (
          <EmptyState
            icon={Search}
            title="Select a saved search"
            description="Choose a saved search from the sidebar to view its prospects."
          />
        ) : (
          <>
            <SavedSearchViewHeader
              searchName={selectedPersona.name}
              prospectCount={prospectCount}
              lastRefreshedAt={lastRefreshedAt}
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
              rightSlot={headerRightSlot}
            />
            {children}
          </>
        )}
      </div>
    </div>
  );
}
