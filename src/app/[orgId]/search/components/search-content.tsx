"use client";

import { useRouter } from "next/navigation";
import type { Persona } from "@/lib/personas/types";
import type { List } from "@/lib/lists/types";
import { useSearch } from "../hooks/use-search";
import { PersonaCard, CreatePersonaCard } from "./persona-card";
import { ProspectResultCard } from "./prospect-result-card";
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

  const selectedPersona = personas.find((p) => p.id === searchState.persona);
  const hasPersonaSelected = Boolean(searchState.persona);

  const handlePersonaSelect = (id: string) => {
    setSearchState({ persona: id });
  };

  const handleBackToPersonas = () => {
    setSearchState({ persona: "", page: 1 });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleProspectClick = (_prospectId: string) => {
    // Slide-over panel wired in Plan 06 — no-op placeholder
  };

  // ----------------------------------------------------------------
  // Error state
  // ----------------------------------------------------------------
  if (error) {
    return (
      <EmptyState icon={AlertCircle} title={error} variant="error">
        <Button variant="outline" size="sm" onClick={executeSearch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </EmptyState>
    );
  }

  // ----------------------------------------------------------------
  // Persona selection view (no persona selected)
  // ----------------------------------------------------------------
  if (!hasPersonaSelected) {
    return (
      <div>
        {/* Page header */}
        <div className="mb-12">
          <h1
            className="font-serif text-[38px] font-medium text-foreground"
            style={{ letterSpacing: "-0.5px" }}
          >
            Find Prospects
          </h1>
          <p className="mt-2 text-sm font-light text-muted-foreground/60">
            Select a persona to discover matching prospects
          </p>
        </div>

        {/* Persona card grid */}
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}
        >
          {personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              onSelect={handlePersonaSelect}
            />
          ))}
          <CreatePersonaCard
            onPress={() => router.push(`/${orgId}/personas/new`)}
          />
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // Results view (persona selected)
  // ----------------------------------------------------------------
  return (
    <div>
      {/* Results header */}
      <div className="mb-8">
        <button
          onClick={handleBackToPersonas}
          className="text-xs transition-colors cursor-pointer mb-4 block"
          style={{ color: "var(--gold-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--gold-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--gold-muted)";
          }}
        >
          ← Back to personas
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-[34px] font-medium text-foreground">
              {selectedPersona?.name ?? "Search Results"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedPersona?.description
                ? `${selectedPersona.description} · `
                : ""}
              {pagination.totalEntries > 0
                ? `${pagination.totalEntries.toLocaleString()} results`
                : isLoading
                  ? "Searching..."
                  : "No results"}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm">
              Filters
            </Button>
            <Button variant="gold" size="sm">
              Export CSV
            </Button>
          </div>
        </div>
      </div>

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
          description="Try broadening the persona filters — fewer constraints often surface better results."
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
            onClick={() => setSearchState({ page: searchState.page - 1 })}
          >
            Previous
          </Button>
          {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
            const pageNum = i + 1;
            const isActive = pageNum === searchState.page;
            return (
              <button
                key={pageNum}
                onClick={() => setSearchState({ page: pageNum })}
                disabled={isLoading}
                className="h-8 w-8 rounded-[6px] text-xs font-medium transition-all duration-200"
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
          })}
          <Button
            variant="ghost"
            size="sm"
            disabled={searchState.page >= pagination.totalPages || isLoading}
            onClick={() => setSearchState({ page: searchState.page + 1 })}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
