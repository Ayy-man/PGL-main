"use client";

import { useState, useEffect, useMemo } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/ui/tag-input";
import type { PersonaFilters } from "@/lib/personas/types";

interface AdvancedFiltersPanelProps {
  onApplyFilters: (filters: Partial<PersonaFilters>) => void;
  initialFilters?: Partial<PersonaFilters>;
  currentFilters?: Partial<PersonaFilters>;
}

export function AdvancedFiltersPanel({
  onApplyFilters,
  initialFilters,
  currentFilters,
}: AdvancedFiltersPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Local state as tag arrays
  const [titles, setTitles] = useState<string[]>(
    initialFilters?.titles ?? []
  );
  const [locations, setLocations] = useState<string[]>(
    initialFilters?.locations ?? []
  );
  const [industries, setIndustries] = useState<string[]>(
    initialFilters?.industries ?? []
  );
  const [seniorities, setSeniorities] = useState<string[]>(
    initialFilters?.seniorities ?? []
  );

  // Sync from parent when currentFilters changes (L4 shared state)
  useEffect(() => {
    if (currentFilters) {
      setTitles(currentFilters.titles ?? []);
      setLocations(currentFilters.locations ?? []);
      setIndustries(currentFilters.industries ?? []);
      setSeniorities(currentFilters.seniorities ?? []);
    }
  }, [currentFilters]);

  // Detect if local state differs from applied currentFilters
  const diffDetected = useMemo(() => {
    const arrDiff = (a: string[] | undefined, b: string[]) => {
      const aArr = a ?? [];
      if (aArr.length !== b.length) return true;
      return aArr.some((v, i) => v !== b[i]);
    };
    return (
      arrDiff(currentFilters?.titles, titles) ||
      arrDiff(currentFilters?.locations, locations) ||
      arrDiff(currentFilters?.industries, industries) ||
      arrDiff(currentFilters?.seniorities, seniorities)
    );
  }, [currentFilters, titles, locations, industries, seniorities]);

  const handleClear = () => {
    setTitles([]);
    setLocations([]);
    setIndustries([]);
    setSeniorities([]);
    onApplyFilters({
      titles: undefined,
      locations: undefined,
      industries: undefined,
      seniorities: undefined,
      net_worth_range: undefined,
    });
  };

  const handleApply = () => {
    const filters: Partial<PersonaFilters> = {};
    if (titles.length > 0) filters.titles = titles;
    if (locations.length > 0) filters.locations = locations;
    if (industries.length > 0) filters.industries = industries;
    if (seniorities.length > 0) filters.seniorities = seniorities;
    onApplyFilters(filters);
  };

  return (
    <div>
      {/* Toggle button — always visible */}
      <button
        type="button"
        data-tour-id="advanced-filters-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 text-[13px] font-medium cursor-pointer transition-all duration-200 hover:text-[var(--text-primary-ds)]"
        style={{
          color: "var(--text-secondary-ds)",
          background: "transparent",
          border: "none",
          padding: 0,
        }}
        aria-expanded={isOpen}
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0" />
        <span>Advanced Filters</span>
        {diffDetected && isOpen && (
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: "var(--gold-primary)" }}
            aria-label="Unapplied changes"
          />
        )}
        <ChevronDown
          className="h-4 w-4 shrink-0"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>

      {/* Collapsible panel */}
      {isOpen && (
        <div
          className="mt-3 rounded-[12px] p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div>
            <label
              className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Job Titles
            </label>
            <TagInput
              value={titles}
              onChange={setTitles}
              placeholder="CEO, VP Finance..."
            />
          </div>
          <div>
            <label
              className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Locations
            </label>
            <TagInput
              value={locations}
              onChange={setLocations}
              placeholder="New York, Miami..."
            />
          </div>
          <div>
            <label
              className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Industries
            </label>
            <TagInput
              value={industries}
              onChange={setIndustries}
              placeholder="Finance, Technology..."
            />
          </div>
          <div>
            <label
              className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Seniority
            </label>
            <TagInput
              value={seniorities}
              onChange={setSeniorities}
              placeholder="C-Suite, VP..."
            />
          </div>

          {/* Bottom action row */}
          <div className="col-span-1 sm:col-span-2 flex items-center justify-end gap-3 pt-1">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleClear}
            >
              Clear
            </Button>
            <Button
              variant="gold"
              size="sm"
              type="button"
              onClick={handleApply}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
