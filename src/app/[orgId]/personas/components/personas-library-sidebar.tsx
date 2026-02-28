"use client";

import { useMemo } from "react";
import { Persona } from "@/lib/personas/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface PersonasLibrarySidebarProps {
  personas: Persona[];
  selectedIndustries: string[];
  onIndustryChange: (industries: string[]) => void;
  freshness: "live" | "past_week";
  onFreshnessChange: (freshness: "live" | "past_week") => void;
}

export function PersonasLibrarySidebar({
  personas,
  selectedIndustries,
  onIndustryChange,
  freshness,
  onFreshnessChange,
}: PersonasLibrarySidebarProps) {
  const activeCount = personas.length;

  const totalEstimate = useMemo(() => {
    const total = personas.reduce((sum, p) => {
      // Deterministic pseudo-random per persona based on id char codes
      const seed = p.id
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return sum + (seed % 200) * 5 + 50;
    }, 0);
    return total.toLocaleString();
  }, [personas]);

  const industries = useMemo(() => {
    const set = new Set<string>();
    personas.forEach((p) => p.filters.industries?.forEach((i) => set.add(i)));
    return Array.from(set).sort();
  }, [personas]);

  const toggleIndustry = (industry: string) => {
    if (selectedIndustries.includes(industry)) {
      onIndustryChange(selectedIndustries.filter((i) => i !== industry));
    } else {
      onIndustryChange([...selectedIndustries, industry]);
    }
  };

  const freshnessOptions: { value: "live" | "past_week"; label: string }[] = [
    { value: "live", label: "Live" },
    { value: "past_week", label: "Past Week" },
  ];

  return (
    <aside
      className="hidden lg:flex flex-col gap-6 overflow-y-auto"
      style={{
        background: "var(--bg-card-gradient)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "14px",
        padding: "24px",
      }}
    >
      {/* Section 1: Library Stats */}
      <div className="flex flex-col gap-3">
        <span
          className="text-[11px] font-semibold uppercase tracking-[1px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Library Stats
        </span>
        <div className="flex flex-row gap-3">
          {/* Active Personas chip */}
          <div
            className="flex-1 rounded-[8px] p-3"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
            }}
          >
            <div
              className="font-mono text-[22px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {activeCount}
            </div>
            <div
              className="text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Active Personas
            </div>
          </div>
          {/* Est. Matches chip */}
          <div
            className="flex-1 rounded-[8px] p-3"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
            }}
          >
            <div
              className="font-mono text-[22px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {totalEstimate}
            </div>
            <div
              className="text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Est. Matches
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "var(--border-subtle)" }} />

      {/* Section 2: Filter by Industry */}
      <div className="flex flex-col gap-3">
        <span
          className="text-[11px] font-semibold uppercase tracking-[1px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Filter by Industry
        </span>
        <div className="flex flex-col gap-2.5">
          {industries.length === 0 ? (
            <span
              className="text-[12px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              No industries defined
            </span>
          ) : (
            industries.map((industry) => (
              <div
                key={industry}
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => toggleIndustry(industry)}
              >
                <Checkbox
                  checked={selectedIndustries.includes(industry)}
                  onCheckedChange={() => toggleIndustry(industry)}
                  id={industry}
                />
                <Label
                  htmlFor={industry}
                  className="text-[13px] cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {industry}
                </Label>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "var(--border-subtle)" }} />

      {/* Section 3: Data Freshness */}
      <div className="flex flex-col gap-3">
        <span
          className="text-[11px] font-semibold uppercase tracking-[1px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Data Freshness
        </span>
        <div className="flex flex-col gap-2.5">
          {freshnessOptions.map(({ value, label }) => (
            <div
              key={value}
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => onFreshnessChange(value)}
            >
              {/* Custom radio circle */}
              <div
                className="h-4 w-4 rounded-full border flex items-center justify-center"
                style={{
                  borderColor:
                    freshness === value
                      ? "var(--gold-primary)"
                      : "var(--border-default)",
                }}
              >
                {freshness === value && (
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: "var(--gold-primary)" }}
                  />
                )}
              </div>
              <span
                className="text-[13px]"
                style={{
                  color:
                    freshness === value
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
