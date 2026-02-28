"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import type { Persona } from "@/lib/personas/types";
import { EmptyState } from "@/components/ui/empty-state";

interface PersonaPillRowProps {
  personas: Persona[];
  orgId: string;
}

const MAX_VISIBLE = 8;

export function PersonaPillRow({ personas, orgId }: PersonaPillRowProps) {
  if (personas.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No personas yet"
        description="Create personas to start finding high-net-worth prospects"
      />
    );
  }

  const visible = personas.slice(0, MAX_VISIBLE);
  const remaining = personas.length - MAX_VISIBLE;

  return (
    <div>
      <h3
        className="font-serif text-[22px] font-semibold mb-4"
        style={{ color: "var(--text-primary)" }}
      >
        Target Personas
      </h3>
      <div className="flex flex-wrap gap-2">
        {visible.map((persona) => (
          <Link
            key={persona.id}
            href={`/${orgId}/search?persona=${persona.id}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            {persona.name}
          </Link>
        ))}
        {remaining > 0 && (
          <Link
            href={`/${orgId}/personas`}
            className="inline-flex items-center px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors"
            style={{
              background: "var(--gold-bg)",
              border: "1px solid var(--border-gold)",
              color: "var(--gold-text)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--gold-bg-strong)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--gold-bg)";
            }}
          >
            +{remaining} more
          </Link>
        )}
      </div>
    </div>
  );
}
