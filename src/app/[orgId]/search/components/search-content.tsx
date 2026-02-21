"use client";

import type { Persona } from "@/lib/personas/types";
import type { List } from "@/lib/lists/types";
import { useSearch } from "../hooks/use-search";
import { SearchToolbar } from "./search-toolbar";
import { SearchResultsTable } from "./search-results-table";
import { Search, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface SearchContentProps {
  personas: Persona[];
  lists: List[];
  orgId: string;
}

export function SearchContent({ personas, lists, orgId }: SearchContentProps) {
  const {
    searchState,
    setSearchState,
    results,
    pagination,
    isLoading,
    error,
    cached,
    executeSearch,
  } = useSearch();

  return (
    <div className="space-y-6">
      <SearchToolbar
        personas={personas}
        searchState={searchState}
        setSearchState={setSearchState}
        cached={cached}
        isLoading={isLoading}
        onRefresh={executeSearch}
        totalResults={pagination.totalEntries}
      />

      {error ? (
        <EmptyState
          icon={AlertCircle}
          title={error}
          variant="error"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={executeSearch}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </EmptyState>
      ) : !searchState.persona ? (
        <EmptyState
          icon={Search}
          title="Select a persona to search for prospects"
          description="Choose from starter personas or create your own"
        />
      ) : !isLoading && results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No prospects found for this persona"
          description="Try adjusting the persona filters to broaden your search"
        />
      ) : (
        <SearchResultsTable
          results={results}
          pagination={pagination}
          isLoading={isLoading}
          searchState={searchState}
          setSearchState={setSearchState}
          lists={lists}
          orgId={orgId}
        />
      )}
    </div>
  );
}
