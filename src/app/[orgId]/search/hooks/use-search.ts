"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryStates, parseAsString, parseAsInteger } from "nuqs";
import type { ApolloPerson } from "@/lib/apollo/types";

interface PaginationState {
  page: number;
  pageSize: number;
  totalPages: number;
  totalEntries: number;
  hasMore: boolean;
}

interface SearchResult {
  searchState: {
    persona: string;
    page: number;
    sortBy: string;
    sortOrder: string;
    prospect: string;
    keywords: string;
  };
  setSearchState: (
    update: Partial<{
      persona: string;
      page: number;
      sortBy: string;
      sortOrder: string;
      prospect: string;
      keywords: string;
    }>
  ) => void;
  results: ApolloPerson[];
  pagination: PaginationState;
  isLoading: boolean;
  error: string | null;
  cached: boolean;
  executeSearch: () => void;
}

export function useSearch(): SearchResult {
  const [searchState, setSearchState] = useQueryStates({
    persona: parseAsString.withDefault(""),
    page: parseAsInteger.withDefault(1),
    sortBy: parseAsString.withDefault("name"),
    sortOrder: parseAsString.withDefault("asc"),
    prospect: parseAsString.withDefault(""),   // slide-over URL sync
    keywords: parseAsString.withDefault(""),    // NL search bar passthrough
  });

  const [results, setResults] = useState<ApolloPerson[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    totalPages: 0,
    totalEntries: 0,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const executeSearch = useCallback(async () => {
    if (!searchState.persona) {
      setResults([]);
      setPagination({
        page: 1,
        pageSize: 10,
        totalPages: 0,
        totalEntries: 0,
        hasMore: false,
      });
      setError(null);
      setCached(false);
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/search/apollo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: searchState.persona,
          page: searchState.page,
          pageSize: 10,
          ...(searchState.keywords ? { filterOverrides: { keywords: searchState.keywords } } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          setError(
            `Rate limit exceeded. Try again in ${retryAfter || "60"} seconds.`
          );
        } else if (response.status === 404) {
          setError("Persona not found. It may have been deleted.");
        } else {
          setError("Search failed. Please try again.");
        }
        setResults([]);
        return;
      }

      const data = await response.json();

      setResults(data.people || []);
      setPagination({
        page: data.pagination?.page ?? searchState.page,
        pageSize: data.pagination?.pageSize ?? 50,
        totalPages: data.pagination?.totalPages ?? 0,
        totalEntries: data.pagination?.totalResults ?? 0,
        hasMore: data.pagination?.hasMore ?? false,
      });
      setCached(data.cached ?? false);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return; // Request was cancelled, ignore
      }
      setError("Search failed. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchState.persona, searchState.page, searchState.keywords]);

  // Trigger search when persona or page changes
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch();
    }, 100); // 100ms debounce to avoid double-fires from URL updates

    return () => clearTimeout(timer);
  }, [executeSearch]);

  // Wrap setSearchState to reset page when persona or keywords changes
  const handleSetSearchState = useCallback(
    (
      update: Partial<{
        persona: string;
        page: number;
        sortBy: string;
        sortOrder: string;
        prospect: string;
        keywords: string;
      }>
    ) => {
      const personaChanged =
        update.persona !== undefined && update.persona !== searchState.persona;
      const keywordsChanged =
        update.keywords !== undefined && update.keywords !== searchState.keywords;
      if (personaChanged || keywordsChanged) {
        // Reset page to 1 when persona or keywords changes
        setSearchState({ ...update, page: 1 });
      } else {
        setSearchState(update);
      }
    },
    [searchState.persona, searchState.keywords, setSearchState]
  );

  return {
    searchState,
    setSearchState: handleSetSearchState,
    results,
    pagination,
    isLoading,
    error,
    cached,
    executeSearch,
  };
}
