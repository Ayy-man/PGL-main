"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { getPersonaColor } from "../lib/persona-color";
import type { Persona } from "@/lib/personas/types";

interface SavedSearchShortcutListProps {
  personas: Persona[];
  /** Map of persona id -> prospect count. Optional; unknown ids render "—". */
  counts?: Record<string, number>;
  onSelectSavedSearch: (id: string) => void;
  onViewAllSaved?: () => void;
  /** Pre-fill NLSearchBar textarea without submitting. */
  onPrefillSearch?: (query: string) => void;
  /** Maximum cards to render before the "View all" link (default 6). */
  maxItems?: number;
}

const SUGGESTED_PERSONAS = [
  {
    id: "suggestion-finance",
    label: "Finance Elite",
    description: "MD+ at investment banks, hedge funds, private equity",
    query:
      "Managing Directors at investment banks, hedge funds, and private equity firms with $10M+ investable assets",
    dotColor: "hsl(45, 70%, 55%)",
  },
  {
    id: "suggestion-tech",
    label: "Tech Founders",
    description: "Series B+ founders with liquidity events",
    query:
      "Founders of Series B or later startups, or companies with recent acquisition exits, in tech",
    dotColor: "hsl(210, 60%, 55%)",
  },
  {
    id: "suggestion-realestate",
    label: "Real Estate Principals",
    description: "Commercial RE owners with $5M+ portfolios",
    query: "Commercial real estate owners and principals with portfolios over $5M",
    dotColor: "hsl(140, 50%, 45%)",
  },
];

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "Not run yet";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Not run yet";
  const diffMs = Date.now() - then;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function SearchCard({
  persona,
  countLabel,
  onClick,
}: {
  persona: Persona;
  countLabel: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const lastRun = formatRelative(persona.last_refreshed_at ?? persona.last_used_at);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left w-full rounded-[14px] p-4 cursor-pointer transition-all duration-150 relative"
      style={{
        border: `1px solid ${hovered ? "var(--border-gold)" : "var(--border-subtle)"}`,
        background: hovered ? "var(--gold-bg)" : "var(--bg-elevated)",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      {/* Top row: dot + name (full-width, wraps) + play icon */}
      <div className="flex items-start gap-2 mb-2 pr-6">
        <span
          className="h-2 w-2 rounded-full flex-shrink-0 mt-1.5"
          style={{ background: getPersonaColor(persona.id) }}
        />
        <span
          className="text-[14px] font-medium leading-snug whitespace-normal break-words line-clamp-2"
          style={{ color: "var(--text-primary-ds)" }}
        >
          {persona.name}
        </span>
      </div>

      {/* Play icon — top right corner */}
      <Play
        className="absolute top-4 right-4 h-3.5 w-3.5"
        style={{
          color: hovered ? "var(--gold-primary)" : "var(--text-tertiary)",
          fill: hovered ? "var(--gold-primary)" : "transparent",
        }}
      />

      {/* Metadata row */}
      <div className="flex items-center gap-2 text-[11px]">
        <span style={{ color: "var(--gold-primary)", opacity: 0.85 }}>
          {countLabel}
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>·</span>
        <span style={{ color: "var(--text-tertiary)" }}>{lastRun}</span>
      </div>
    </button>
  );
}

function SuggestionCard({
  suggestion,
  onPrefill,
}: {
  suggestion: {
    id: string;
    label: string;
    description: string;
    query: string;
    dotColor: string;
  };
  onPrefill?: (query: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onPrefill?.(suggestion.query)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left w-full rounded-[14px] p-4 cursor-pointer transition-all duration-150"
      style={{
        border: `1px solid ${hovered ? "var(--border-gold)" : "var(--border-subtle)"}`,
        background: hovered ? "var(--gold-bg)" : "var(--bg-elevated)",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ background: suggestion.dotColor }}
        />
        <span
          className="text-[14px] font-medium truncate"
          style={{ color: "var(--text-primary-ds)" }}
        >
          {suggestion.label}
        </span>
      </div>
      <span
        className="text-[12px] font-light"
        style={{ color: "var(--text-secondary-ds)" }}
      >
        {suggestion.description}
      </span>
    </button>
  );
}

export function SavedSearchShortcutList({
  personas,
  counts = {},
  onSelectSavedSearch,
  onViewAllSaved,
  onPrefillSearch,
  maxItems = 6,
}: SavedSearchShortcutListProps) {
  if (personas.length === 0) {
    return (
      <section className="mt-10">
        <p
          className="text-[13px] uppercase tracking-wider font-medium mb-4"
          style={{ color: "var(--text-tertiary)" }}
        >
          Start with a template
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SUGGESTED_PERSONAS.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} onPrefill={onPrefillSearch} />
          ))}
        </div>
      </section>
    );
  }

  const visible = personas.slice(0, maxItems);
  const hasMore = personas.length > maxItems;

  return (
    <section className="mt-10">
      <p
        className="text-[13px] uppercase tracking-wider font-medium mb-4"
        style={{ color: "var(--text-tertiary)" }}
      >
        Saved Searches
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {visible.map((persona) => {
          const count = counts[persona.id];
          const countLabel =
            typeof count === "number" ? `${count.toLocaleString()} prospects` : "—";
          return (
            <SearchCard
              key={persona.id}
              persona={persona}
              countLabel={countLabel}
              onClick={() => onSelectSavedSearch(persona.id)}
            />
          );
        })}
      </div>
      {hasMore && onViewAllSaved && (
        <button
          type="button"
          onClick={onViewAllSaved}
          className="mt-4 text-[13px] font-medium cursor-pointer"
          style={{ color: "var(--gold-primary)", background: "transparent", border: "none" }}
        >
          View all {personas.length} &rarr;
        </button>
      )}
    </section>
  );
}
