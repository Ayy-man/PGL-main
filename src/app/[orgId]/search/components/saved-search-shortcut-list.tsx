"use client";

import { useState } from "react";
import { Play, Plus } from "lucide-react";
import { getPersonaColor } from "../lib/persona-color";
import type { Persona } from "@/lib/personas/types";

interface SavedSearchShortcutListProps {
  personas: Persona[];
  counts?: Record<string, number>;
  onSelectSavedSearch: (id: string) => void;
  onViewAllSaved?: () => void;
  onPrefillSearch?: (query: string) => void;
  maxItems?: number;
  onCreateNew?: () => void;
}

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

/** Horizontal row — used when fewer than 3 saved searches */
function SearchRow({
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
  const color = getPersonaColor(persona.id);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-4 w-full rounded-[12px] px-4 py-3 cursor-pointer transition-all duration-150 text-left"
      style={{
        border: `1px solid ${hovered ? "rgba(var(--gold-primary-rgb), 0.2)" : "rgba(255,255,255,0.06)"}`,
        background: hovered ? "var(--gold-bg)" : "var(--bg-elevated)",
        boxShadow: hovered ? "0 2px 12px rgba(0,0,0,0.12)" : "none",
      }}
    >
      {/* Colored dot indicator */}
      <span
        className="h-[6px] w-[6px] rounded-full shrink-0"
        style={{ background: color }}
      />
      {/* Name — full, no truncation */}
      <span
        className="flex-1 text-[14px] font-medium"
        style={{ color: "var(--text-primary-ds)" }}
      >
        {persona.name}
      </span>

      {/* Description if available */}
      {persona.description && (
        <span
          className="hidden sm:block text-[12px] font-light shrink-0 max-w-[200px] truncate"
          style={{ color: "var(--text-secondary-ds)" }}
        >
          {persona.description}
        </span>
      )}

      {/* Meta */}
      <span className="text-[11px] font-light shrink-0" style={{ color: "var(--text-tertiary)" }}>
        {countLabel}
      </span>
      <span className="text-[11px] font-light shrink-0" style={{ color: "var(--text-tertiary)" }}>
        {lastRun}
      </span>

      {/* Run button */}
      <div
        className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors"
        style={{
          background: hovered ? "rgba(var(--gold-primary-rgb), 0.15)" : "rgba(255,255,255,0.04)",
          color: hovered ? "var(--gold-primary)" : "var(--text-secondary-ds)",
          border: `1px solid ${hovered ? "rgba(var(--gold-primary-rgb), 0.3)" : "rgba(255,255,255,0.08)"}`,
        }}
      >
        <Play className="h-3 w-3" style={{ fill: "currentColor" }} />
        Run
      </div>
    </button>
  );
}

/** Card — used when 3+ saved searches (grid layout) */
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
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.12)" : "none",
      }}
    >
      <div className="flex items-start gap-2 mb-2 pr-6">
        <span
          className="h-2 w-2 rounded-full flex-shrink-0 mt-1.5"
          style={{ background: getPersonaColor(persona.id) }}
        />
        <span
          className="text-[14px] font-medium leading-snug"
          style={{ color: "var(--text-primary-ds)" }}
        >
          {persona.name}
        </span>
      </div>

      <Play
        className="absolute top-4 right-4 h-3.5 w-3.5"
        style={{
          color: hovered ? "var(--gold-primary)" : "var(--text-tertiary)",
          fill: hovered ? "var(--gold-primary)" : "transparent",
        }}
      />

      <div className="flex items-center gap-2 text-[11px]">
        <span style={{ color: "var(--gold-primary)", opacity: 0.85 }}>{countLabel}</span>
        <span style={{ color: "var(--text-tertiary)" }}>·</span>
        <span style={{ color: "var(--text-tertiary)" }}>{lastRun}</span>
      </div>
    </button>
  );
}

export function SavedSearchShortcutList({
  personas,
  counts = {},
  onSelectSavedSearch,
  onViewAllSaved,
  onPrefillSearch: _onPrefillSearch,
  maxItems = 6,
  onCreateNew,
}: SavedSearchShortcutListProps) {
  if (personas.length === 0) return null;

  const visible = personas.slice(0, maxItems);
  const hasMore = personas.length > maxItems;
  const useRows = visible.length < 3;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[13px] uppercase tracking-wider font-medium"
          style={{ color: "var(--text-tertiary)" }}
        >
          Saved Searches
        </p>
        {onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            className="flex items-center gap-1.5 text-[12px] font-medium cursor-pointer transition-colors px-2.5 py-1 rounded-full"
            style={{
              background: "transparent",
              border: "1px dashed var(--border-default)",
              color: "var(--text-tertiary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--gold-primary)";
              e.currentTarget.style.borderColor = "var(--border-gold)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
              e.currentTarget.style.borderColor = "var(--border-default)";
            }}
          >
            <Plus className="h-3 w-3" />
            New Search
          </button>
        )}
      </div>

      {useRows ? (
        <div className="flex flex-col gap-2">
          {visible.map((persona) => {
            const count = counts[persona.id];
            const countLabel =
              typeof count === "number" ? `${count.toLocaleString()} prospects` : "—";
            return (
              <SearchRow
                key={persona.id}
                persona={persona}
                countLabel={countLabel}
                onClick={() => onSelectSavedSearch(persona.id)}
              />
            );
          })}
        </div>
      ) : (
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
      )}

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
