"use client";

import type { Persona } from "@/lib/personas/types";
import { PersonaSelector } from "./persona-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface SearchToolbarProps {
  personas: Persona[];
  searchState: {
    persona: string;
    page: number;
    sortBy: string;
    sortOrder: string;
  };
  setSearchState: (
    update: Partial<{
      persona: string;
      page: number;
      sortBy: string;
      sortOrder: string;
    }>
  ) => void;
  cached: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  totalResults?: number;
}

export function SearchToolbar({
  personas,
  searchState,
  setSearchState,
  cached,
  isLoading,
  onRefresh,
  totalResults,
}: SearchToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <PersonaSelector
          personas={personas}
          selectedId={searchState.persona}
          onSelect={(id) => setSearchState({ persona: id })}
        />
        {cached && !isLoading && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Cached results
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        )}
      </div>
      {totalResults != null && totalResults > 0 && !isLoading && (
        <span className="text-sm text-muted-foreground">
          {totalResults.toLocaleString()} prospects found
        </span>
      )}
    </div>
  );
}
