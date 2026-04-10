"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import type { PersonaFilters } from "@/lib/personas/types";

type PillKey = "industry" | "title" | "location" | "networth";

interface FilterPillsRowProps {
  onApplyFilters: (filters: Partial<PersonaFilters>) => void;
  currentFilters?: Partial<PersonaFilters>;
}

const NET_WORTH_OPTIONS = [
  { label: "$1M – $5M", value: "net worth $1M to $5M" },
  { label: "$5M – $25M", value: "net worth $5M to $25M" },
  { label: "$25M – $100M", value: "net worth $25M to $100M" },
  { label: "$100M+", value: "ultra high net worth $100M+" },
];

const PILL_FILTER_KEY: Record<PillKey, keyof PersonaFilters> = {
  industry: "industries",
  title: "titles",
  location: "locations",
  networth: "net_worth_range",
};

export function FilterPillsRow({ onApplyFilters, currentFilters }: FilterPillsRowProps) {
  const [openPill, setOpenPill] = useState<PillKey | null>(null);
  const [industries, setIndustries] = useState("");
  const [titles, setTitles] = useState("");
  const [locations, setLocations] = useState("");
  const [netWorth, setNetWorth] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync from parent when currentFilters changes (L4 shared state)
  useEffect(() => {
    if (currentFilters) {
      setIndustries(currentFilters.industries?.join("; ") ?? "");
      setTitles(currentFilters.titles?.join("; ") ?? "");
      setLocations(currentFilters.locations?.join("; ") ?? "");
      setNetWorth(typeof currentFilters.net_worth_range === "string" ? currentFilters.net_worth_range : "");
    }
  }, [currentFilters]);

  // Click-outside closes any open pill
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpenPill(null);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const togglePill = (key: PillKey) => {
    setOpenPill((prev) => (prev === key ? null : key));
  };

  const apply = (key: PillKey) => {
    const filters: Partial<PersonaFilters> = {};
    if (key === "industry" && industries.trim()) {
      filters.industries = industries.split(";").map((s) => s.trim()).filter(Boolean);
    }
    if (key === "title" && titles.trim()) {
      filters.titles = titles.split(";").map((s) => s.trim()).filter(Boolean);
    }
    if (key === "location" && locations.trim()) {
      filters.locations = locations.split(";").map((s) => s.trim()).filter(Boolean);
    }
    if (key === "networth" && netWorth.trim()) {
      filters.net_worth_range = netWorth.trim();
    }
    onApplyFilters(filters);
    setOpenPill(null);
  };

  const clearPill = (key: PillKey) => {
    if (key === "industry") setIndustries("");
    if (key === "title") setTitles("");
    if (key === "location") setLocations("");
    if (key === "networth") setNetWorth("");
    onApplyFilters({ [PILL_FILTER_KEY[key]]: undefined } as Partial<PersonaFilters>);
  };

  const hasValue: Record<PillKey, boolean> = {
    industry: industries.trim().length > 0,
    title: titles.trim().length > 0,
    location: locations.trim().length > 0,
    networth: netWorth.trim().length > 0,
  };

  const PILLS: { key: PillKey; label: string }[] = [
    { key: "industry", label: "Industry" },
    { key: "title", label: "Title" },
    { key: "location", label: "Location" },
    { key: "networth", label: "Net Worth" },
  ];

  return (
    <div ref={containerRef} className="relative mt-3 flex flex-wrap items-center justify-center gap-2">
      {PILLS.map((pill) => {
        const isOpen = openPill === pill.key;
        const isActive = isOpen || hasValue[pill.key];
        return (
          <div key={pill.key} className="relative">
            <button
              type="button"
              onClick={() => togglePill(pill.key)}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium cursor-pointer transition-all duration-150"
              style={
                isActive
                  ? {
                      background: "var(--gold-bg)",
                      border: "1px solid var(--border-gold)",
                      color: "var(--gold-primary)",
                    }
                  : {
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-secondary-ds)",
                    }
              }
              aria-expanded={isOpen}
            >
              {pill.label}
              <ChevronDown
                className="h-3 w-3"
                style={{
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                }}
              />
            </button>

            {isOpen && (
              <div
                className="absolute left-1/2 top-[calc(100%+8px)] z-20 -translate-x-1/2 w-[280px] rounded-[12px] p-3"
                style={{
                  background: "var(--bg-elevated, #1a1a1a)",
                  border: "1px solid var(--border-default)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                {pill.key === "networth" ? (
                  <div className="flex flex-col gap-1.5">
                    {NET_WORTH_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNetWorth(opt.value)}
                        className="text-left rounded-[8px] px-3 py-2 text-[13px] cursor-pointer transition-colors"
                        style={{
                          background:
                            netWorth === opt.value ? "var(--gold-bg)" : "transparent",
                          border: `1px solid ${
                            netWorth === opt.value
                              ? "var(--border-gold)"
                              : "var(--border-subtle)"
                          }`,
                          color:
                            netWorth === opt.value
                              ? "var(--gold-primary)"
                              : "var(--text-primary-ds)",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    autoFocus
                    value={
                      pill.key === "industry"
                        ? industries
                        : pill.key === "title"
                        ? titles
                        : locations
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (pill.key === "industry") setIndustries(v);
                      if (pill.key === "title") setTitles(v);
                      if (pill.key === "location") setLocations(v);
                    }}
                    placeholder={
                      pill.key === "industry"
                        ? "Finance; Technology; Real Estate..."
                        : pill.key === "title"
                        ? "CEO; VP Finance; Director..."
                        : "New York; Miami; SF..."
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") apply(pill.key);
                    }}
                    className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none"
                    style={{
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-default)",
                      color: "var(--text-primary-ds)",
                    }}
                  />
                )}

                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => clearPill(pill.key)}
                    className="text-[11px] font-medium cursor-pointer"
                    style={{
                      color: "var(--text-tertiary)",
                      background: "transparent",
                      border: "none",
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => apply(pill.key)}
                    className="rounded-full px-3 py-1 text-[11px] font-semibold cursor-pointer"
                    style={{
                      background: "var(--gold-primary)",
                      color: "#0a0a0a",
                      border: "none",
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
