"use client";

import { useState } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PersonaFilters } from "@/lib/personas/types";

interface AdvancedFiltersPanelProps {
  onApplyFilters: (filters: Partial<PersonaFilters>) => void;
  initialFilters?: Partial<PersonaFilters>;
}

export function AdvancedFiltersPanel({
  onApplyFilters,
  initialFilters,
}: AdvancedFiltersPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Initialize from initialFilters (join arrays with ", ")
  const [titles, setTitles] = useState<string>(
    initialFilters?.titles?.join(", ") ?? ""
  );
  const [locations, setLocations] = useState<string>(
    initialFilters?.locations?.join(", ") ?? ""
  );
  const [industries, setIndustries] = useState<string>(
    initialFilters?.industries?.join(", ") ?? ""
  );
  const [seniorities, setSeniorities] = useState<string>(
    initialFilters?.seniorities?.join(", ") ?? ""
  );

  const handleClear = () => {
    setTitles("");
    setLocations("");
    setIndustries("");
    setSeniorities("");
  };

  const handleApply = () => {
    const filters: Partial<PersonaFilters> = {};
    if (titles.trim())
      filters.titles = titles.split(",").map((s) => s.trim()).filter(Boolean);
    if (locations.trim())
      filters.locations = locations.split(",").map((s) => s.trim()).filter(Boolean);
    if (industries.trim())
      filters.industries = industries.split(",").map((s) => s.trim()).filter(Boolean);
    if (seniorities.trim())
      filters.seniorities = seniorities.split(",").map((s) => s.trim()).filter(Boolean);
    onApplyFilters(filters);
  };

  return (
    <div>
      {/* Toggle button — always visible */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex items-center gap-2 text-[13px] font-medium cursor-pointer transition-all duration-200"
        style={{
          color: isHovered ? "var(--text-primary-ds)" : "var(--text-secondary-ds)",
          background: "transparent",
          border: "none",
          padding: 0,
        }}
        aria-expanded={isOpen}
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0" />
        <span>Advanced Filters</span>
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
          <FilterInput
            label="Job Titles"
            value={titles}
            onChange={setTitles}
            placeholder="CEO, VP Finance, Director..."
          />
          <FilterInput
            label="Locations"
            value={locations}
            onChange={setLocations}
            placeholder="New York, Miami, SF..."
          />
          <FilterInput
            label="Industries"
            value={industries}
            onChange={setIndustries}
            placeholder="Finance, Technology, Real Estate..."
          />
          <FilterInput
            label="Seniority"
            value={seniorities}
            onChange={setSeniorities}
            placeholder="C-Suite, VP, Director..."
          />

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

// Internal sub-component for each filter input field
interface FilterInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

function FilterInput({ label, value, onChange, placeholder }: FilterInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div>
      <label
        className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="rounded-[8px] px-3 py-2 text-[13px] w-full outline-none"
        style={{
          background: "var(--bg-input)",
          border: `1px solid ${isFocused ? "var(--border-hover)" : "var(--border-subtle)"}`,
          color: "var(--text-primary-ds)",
          transition: "border-color 0.2s ease",
        }}
      />
    </div>
  );
}
