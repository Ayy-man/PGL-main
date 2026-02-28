"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Persona } from "@/lib/personas/types";

interface PersonaPillsProps {
  personas: Persona[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

function getPersonaColor(id: string): string {
  const hue = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return `hsl(${hue}, 60%, 50%)`;
}

function PersonaPill({
  persona,
  isActive,
  onSelect,
}: {
  persona: Persona;
  isActive: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const activeStyle = {
    background: "var(--gold-bg)",
    border: "1px solid var(--border-gold)",
    color: "var(--gold-primary)",
  };

  const restStyle = {
    background: hovered ? "var(--gold-bg)" : "var(--bg-elevated)",
    border: `1px solid ${hovered ? "var(--border-hover)" : "var(--border-default)"}`,
    color: "var(--text-secondary-ds)",
  };

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => !isActive && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={isActive ? activeStyle : restStyle}
      className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 cursor-pointer shrink-0"
    >
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ background: getPersonaColor(persona.id) }}
      />
      {persona.name}
    </button>
  );
}

function NewPersonaPill({ onCreateNew }: { onCreateNew: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onCreateNew}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "transparent",
        border: `1px dashed ${hovered ? "var(--border-hover)" : "var(--border-default)"}`,
        color: hovered ? "var(--gold-primary)" : "var(--text-secondary-ds)",
      }}
      className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 cursor-pointer shrink-0"
    >
      <Plus className="h-3 w-3" />
      New Persona
    </button>
  );
}

export function PersonaPills({
  personas,
  selectedId,
  onSelect,
  onCreateNew,
}: PersonaPillsProps) {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-wider font-semibold mb-2"
        style={{ color: "var(--text-tertiary)" }}
      >
        Saved Personas
      </p>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {personas.map((persona) => (
          <PersonaPill
            key={persona.id}
            persona={persona}
            isActive={persona.id === selectedId}
            onSelect={() => onSelect(persona.id)}
          />
        ))}
        <NewPersonaPill onCreateNew={onCreateNew} />
      </div>
    </div>
  );
}
