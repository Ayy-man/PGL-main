"use client";

import { useState, useMemo } from "react";
import type { Persona } from "@/lib/personas/types";
import { PersonasLibrarySidebar } from "./personas-library-sidebar";
import { PersonaCardGrid } from "./persona-card-grid";
import { LiveDataStream } from "./live-data-stream";

interface PersonasLayoutProps {
  personas: Persona[];
}

export function PersonasLayout({ personas }: PersonasLayoutProps) {
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
    <div className="grid gap-5 min-h-0 grid-cols-1 lg:grid-cols-[220px_1fr_280px]">
      {/* Left sidebar — Library Stats + filters */}
      <PersonasLibrarySidebar
        personas={personas}
        selectedIndustries={selectedIndustries}
        onIndustryChange={setSelectedIndustries}
        freshness={freshness}
        onFreshnessChange={setFreshness}
      />

      {/* Center — Persona card grid (filtered) */}
      <PersonaCardGrid personas={filteredPersonas} />

      {/* Right sidebar — Live Data Stream */}
      <LiveDataStream />
    </div>
  );
}
