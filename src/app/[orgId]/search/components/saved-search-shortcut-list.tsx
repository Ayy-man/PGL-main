"use client";

import { ChevronRight } from "lucide-react";
import { getPersonaColor } from "../lib/persona-color";
import type { Persona } from "@/lib/personas/types";

interface SavedSearchShortcutListProps {
  personas: Persona[];
  /** Map of persona id -> prospect count. Optional; unknown ids render "—". */
  counts?: Record<string, number>;
  onSelectSavedSearch: (id: string) => void;
  onViewAllSaved?: () => void;
  /** Maximum rows to render before the "View all" link (default 5). */
  maxItems?: number;
}

export function SavedSearchShortcutList({
  personas,
  counts = {},
  onSelectSavedSearch,
  onViewAllSaved,
  maxItems = 5,
}: SavedSearchShortcutListProps) {
  if (personas.length === 0) {
    return null;
  }

  const visible = personas.slice(0, maxItems);
  const hasMore = personas.length > maxItems;

  return (
    <section className="mt-8">
      <p
        className="text-[13px] uppercase tracking-wider font-medium mb-3"
        style={{ color: "var(--text-tertiary)" }}
      >
        Saved Searches
      </p>
      <ul className="flex flex-col gap-1">
        {visible.map((persona) => {
          const count = counts[persona.id];
          const countLabel =
            typeof count === "number" ? `${count.toLocaleString()} prospects` : "—";
          return (
            <li key={persona.id}>
              <button
                type="button"
                onClick={() => onSelectSavedSearch(persona.id)}
                className="flex items-center gap-3 w-full min-h-[40px] px-3 py-2 rounded-[8px] cursor-pointer transition-colors"
                style={{
                  background: "transparent",
                  border: "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--gold-bg)";
                  e.currentTarget.style.border = "1px solid var(--border-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.border = "1px solid transparent";
                }}
              >
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: getPersonaColor(persona.id) }}
                />
                <span
                  className="text-[13px] font-medium truncate"
                  style={{ color: "var(--text-primary-ds)" }}
                >
                  {persona.name}
                </span>
                <span
                  className="text-[13px] ml-1 flex-shrink-0"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  &middot; {countLabel}
                </span>
                <ChevronRight
                  className="h-[14px] w-[14px] ml-auto flex-shrink-0"
                  style={{ color: "var(--text-ghost)" }}
                />
              </button>
            </li>
          );
        })}
      </ul>
      {hasMore && onViewAllSaved && (
        <button
          type="button"
          onClick={onViewAllSaved}
          className="mt-3 text-[13px] font-medium cursor-pointer"
          style={{ color: "var(--gold-primary)" }}
        >
          View all {personas.length} &rarr;
        </button>
      )}
    </section>
  );
}
