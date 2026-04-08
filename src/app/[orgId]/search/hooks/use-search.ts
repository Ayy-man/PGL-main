"use client";

import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import { useQueryStates, parseAsString, parseAsInteger } from "nuqs";
import type { ApolloPerson } from "@/lib/apollo/types";
import type { PersonaFiltersType } from "@/lib/apollo/schemas";

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
  filterOverrides: Partial<PersonaFiltersType>;
  setFilterOverrides: Dispatch<SetStateAction<Partial<PersonaFiltersType>>>;
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
  const [filterOverrides, setFilterOverrides] = useState<Partial<PersonaFiltersType>>({});

  const abortControllerRef = useRef<AbortController | null>(null);

  const executeSearch = useCallback(async () => {
    const hasPersona = Boolean(searchState.persona);
    const hasKeywords = Boolean(searchState.keywords?.trim());

    if (!hasPersona && !hasKeywords) {
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

    const searchStart = performance.now();
    console.info("[useSearch] ── Search started ──", {
      persona: searchState.persona || "(none)",
      keywords: searchState.keywords || "(none)",
      page: searchState.page,
      filterOverrides,
    });

    try {
      // ── Step 1: NL parse ──
      let nlFilters: Partial<PersonaFiltersType> = {};
      if (searchState.keywords?.trim()) {
        const parseStart = performance.now();
        console.info("[useSearch] [1/3] Parsing NL query:", searchState.keywords);
        try {
          const parseRes = await fetch("/api/search/parse-query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: searchState.keywords }),
            signal: controller.signal,
          });
          if (parseRes.ok) {
            const parsed = await parseRes.json();
            console.info(`[useSearch] [1/3] NL parse complete (${Math.round(performance.now() - parseStart)}ms):`, {
              parsed: parsed.parsed,
              filters: parsed.filters,
            });
            if (parsed.parsed && parsed.filters) {
              nlFilters = parsed.filters;
            }
          } else {
            console.warn(`[useSearch] [1/3] NL parse failed: ${parseRes.status} (${Math.round(performance.now() - parseStart)}ms)`);
          }
        } catch (parseErr) {
          if (parseErr instanceof DOMException && parseErr.name === "AbortError") throw parseErr;
          console.warn("[useSearch] [1/3] NL parse error (falling back to keywords):", parseErr);
        }
      } else {
        console.info("[useSearch] [1/3] NL parse skipped (persona-based search)");
      }

      // ── Step 2: Build merged filters ──
      const mergedOverrides: Partial<PersonaFiltersType> = {
        // If NL parse returned nothing, send raw keywords; otherwise use parsed filters
        ...(searchState.keywords && Object.keys(nlFilters).length === 0
          ? { keywords: searchState.keywords }
          : {}),
        ...nlFilters,
        ...filterOverrides,
      };

      const body: Record<string, unknown> = {
        page: searchState.page,
        pageSize: 25,
      };
      if (searchState.persona) {
        body.personaId = searchState.persona;
      }
      if (Object.keys(mergedOverrides).length > 0) {
        body.filterOverrides = mergedOverrides;
      }

      console.info("[useSearch] [2/3] Apollo request body:", JSON.stringify(body, null, 2));

      // ── Step 3: Call Apollo search API ──
      const apolloStart = performance.now();
      const response = await fetch("/api/search/apollo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const apolloMs = Math.round(performance.now() - apolloStart);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        console.error(`[useSearch] [3/3] Apollo API error: ${response.status} (${apolloMs}ms)`, errorBody);

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
      const totalMs = Math.round(performance.now() - searchStart);

      console.info(`[useSearch] [3/3] ── Search complete (${totalMs}ms) ──`, {
        results: data.people?.length ?? 0,
        totalResults: data.pagination?.totalResults ?? 0,
        cached: data.cached ?? false,
        apolloMs,
      });

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
        console.info("[useSearch] Search aborted (superseded by new request)");
        return;
      }
      console.error(`[useSearch] Search failed (${Math.round(performance.now() - searchStart)}ms):`, err);
      setError("Search failed. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchState.persona, searchState.page, searchState.keywords, JSON.stringify(filterOverrides)]);

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
    filterOverrides,
    setFilterOverrides,
  };
}
