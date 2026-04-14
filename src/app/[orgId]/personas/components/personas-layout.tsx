"use client";

import { useState, useMemo, Suspense } from "react";
import type { Persona } from "@/lib/personas/types";
import { PersonasLibrarySidebar } from "./personas-library-sidebar";
import { PersonaCardGrid } from "./persona-card-grid";
import { LiveDataStream } from "./live-data-stream";
import { cn } from "@/lib/utils";

interface PersonasLayoutProps {
  personas: Persona[];
  prospectCount: number;
  hasActivity: boolean;
  orgId: string;
  canEdit?: boolean;
}

export function PersonasLayout({ personas, prospectCount, hasActivity, orgId, canEdit = true }: PersonasLayoutProps) {
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [freshness, setFreshness] = useState<"live" | "past_week">("live");

  const filteredPersonas = useMemo(() => {
    let result = personas;

    // Industry filter
    if (selectedIndustries.length > 0) {
      result = result.filter((p) =>
        p.filters.industries?.some((ind) => selectedIndustries.includes(ind))
      );
    }

    // Freshness filter
    if (freshness === "past_week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter(
        (p) => p.last_used_at && new Date(p.last_used_at) >= weekAgo
      );
    }

    return result;
  }, [personas, selectedIndustries, freshness]);

  return (
    <div className={cn(
      "grid gap-5 min-h-0",
      hasActivity
        ? "grid-cols-1 lg:grid-cols-[220px_1fr_280px]"
        : "grid-cols-1 lg:grid-cols-[220px_1fr]"
    )}>
      {/* Left sidebar — Library Stats + filters (desktop only) */}
      <div className="hidden lg:block">
        <PersonasLibrarySidebar
          personas={personas}
          prospectCount={prospectCount}
          selectedIndustries={selectedIndustries}
          onIndustryChange={setSelectedIndustries}
          freshness={freshness}
          onFreshnessChange={setFreshness}
        />
      </div>

      {/* Center — Persona card grid (filtered) */}
      <Suspense fallback={null}>
        <PersonaCardGrid personas={filteredPersonas} orgId={orgId} canEdit={canEdit} />
      </Suspense>

      {/* Right sidebar — Live Data Stream (only when there's activity, desktop only) */}
      {hasActivity && (
        <div className="hidden lg:block">
          <LiveDataStream />
        </div>
      )}
    </div>
  );
}
