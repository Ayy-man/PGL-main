"use client";

import { useState } from "react";
import type { Persona } from "@/lib/personas/types";

interface PersonaCardProps {
  persona: Persona;
  onSelect: (id: string) => void;
}

function getFilterTags(persona: Persona): string[] {
  const tags: string[] = [];
  if (persona.filters.titles?.length) {
    tags.push(...persona.filters.titles.slice(0, 3));
  }
  if (persona.filters.seniorities?.length) {
    tags.push(...persona.filters.seniorities.slice(0, 2));
  }
  if (persona.filters.industries?.length) {
    tags.push(...persona.filters.industries.slice(0, 2));
  }
  return tags.slice(0, 5);
}

export function PersonaCard({ persona, onSelect }: PersonaCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const tags = getFilterTags(persona);

  return (
    <button
      onClick={() => onSelect(persona.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="rounded-[14px] p-7 text-left transition-all duration-200 cursor-pointer overflow-hidden relative w-full"
      style={{
        background: isHovered ? "var(--bg-card-hover)" : "var(--bg-card-gradient)",
        border: isHovered
          ? "1px solid rgba(212,175,55,0.3)"
          : "1px solid var(--border-subtle)",
      }}
    >
      {/* Gold corner accent */}
      <div
        className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
        style={{
          background: "radial-gradient(circle at top right, rgba(212,175,55,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Name row */}
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-[22px] font-semibold text-foreground leading-tight">
          {persona.name}
        </span>
        {persona.is_starter && (
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--gold-text)" }}
          >
            Starter
          </span>
        )}
      </div>

      {/* Description */}
      {persona.description && (
        <p className="text-[13px] font-light text-muted-foreground mt-2">
          {persona.description}
        </p>
      )}

      {/* Title tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-2.5 py-1 rounded-[6px]"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer row */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {tags.length > 0 ? `${tags.length} active filters` : "All prospects"}
        </span>
        <span
          className="text-sm font-medium"
          style={{ color: "var(--gold-primary)" }}
        >
          Search →
        </span>
      </div>
    </button>
  );
}

interface CreatePersonaCardProps {
  onPress: () => void;
}

export function CreatePersonaCard({ onPress }: CreatePersonaCardProps) {
  return (
    <button
      onClick={onPress}
      className="rounded-[14px] p-7 text-left transition-all duration-200 cursor-pointer w-full flex flex-col items-center justify-center gap-3 border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
      style={{ minHeight: "160px" }}
    >
      {/* Plus circle */}
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: "48px",
          height: "48px",
          background: "var(--gold-bg)",
          border: "1px solid var(--border-gold)",
        }}
      >
        <span
          className="text-[24px] font-semibold leading-none"
          style={{ color: "var(--gold-primary)" }}
        >
          +
        </span>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Create Persona</p>
        <p className="text-xs text-muted-foreground/50 mt-1">Custom filter combination</p>
      </div>
    </button>
  );
}
