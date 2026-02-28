"use client";

import type { Persona } from "@/lib/personas/types";
import { PersonaCard } from "./persona-card";
import { PersonaFormDialog } from "./persona-form-dialog";
import { Plus } from "lucide-react";

interface PersonaCardGridProps {
  personas: Persona[];
}

export function PersonaCardGrid({ personas }: PersonaCardGridProps) {
  return (
    <div
      className="grid gap-5"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}
    >
      {personas.map((persona) => (
        <PersonaCard key={persona.id} persona={persona} />
      ))}

      {/* Create New Persona CTA card */}
      <PersonaFormDialog
        mode="create"
        trigger={
          <button
            className="rounded-[14px] p-7 w-full cursor-pointer flex flex-col items-center justify-center gap-3 transition-all"
            style={{
              border: "1px dashed var(--border-default)",
              background: "transparent",
              minHeight: "280px",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = "var(--border-hover)";
              el.style.background = "rgba(255,255,255,0.01)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = "var(--border-default)";
              el.style.background = "transparent";
            }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "var(--gold-bg)" }}
            >
              <Plus
                className="h-5 w-5"
                style={{ color: "var(--gold-primary)" }}
              />
            </div>
            <span
              className="text-[14px] font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Create New Persona
            </span>
            <span
              className="text-[12px]"
              style={{ color: "var(--text-ghost)" }}
            >
              Custom filter combination
            </span>
          </button>
        }
      />
    </div>
  );
}
