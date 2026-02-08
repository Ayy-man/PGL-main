"use client";

import type { Persona } from "@/lib/personas/types";
import type { List } from "@/lib/lists/types";
import { useSearch } from "../hooks/use-search";
import { SearchToolbar } from "./search-toolbar";
import { SearchResultsTable } from "./search-results-table";
import { Search, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <div className="text-center py-12 border-2 border-dashed border-destructive/30 rounded-lg">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-medium mb-2">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={executeSearch}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : !searchState.persona ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-lg text-muted-foreground">
            Select a persona to search for prospects
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Choose from starter personas or create your own
          </p>
        </div>
      ) : !isLoading && results.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-lg text-muted-foreground">
            No prospects found for this persona
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Try adjusting the persona filters to broaden your search
          </p>
        </div>
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
