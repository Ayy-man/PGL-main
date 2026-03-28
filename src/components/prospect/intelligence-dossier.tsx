"use client";

import { BookOpen, Lightbulb, Zap } from "lucide-react";
import type { IntelligenceDossierData } from "@/types/database";

interface IntelligenceDossierProps {
  dossier: IntelligenceDossierData | null;
  generatedAt?: string | null;
}

export function IntelligenceDossier({ dossier, generatedAt }: IntelligenceDossierProps) {
  if (!dossier) {
    return (
      <div className="surface-card rounded-[14px] p-4 md:p-6">
        <h3 className="text-foreground text-xl font-bold font-serif flex items-center gap-2">
          <BookOpen className="h-5 w-5 shrink-0" style={{ color: "var(--gold-primary)" }} />
          Intelligence Dossier
        </h3>
        <p className="text-sm text-muted-foreground mt-3">
          No dossier generated yet. Will appear after enrichment completes.
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card rounded-[14px] p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-foreground text-xl font-bold font-serif flex items-center gap-2">
          <BookOpen className="h-5 w-5 shrink-0" style={{ color: "var(--gold-primary)" }} />
          Intelligence Dossier
        </h3>
        {generatedAt && (
          <span className="text-[11px]" style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}>
            {new Date(generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
      </div>

      {/* Summary — gold left-border accent */}
      <div className="mb-5 pl-4" style={{ borderLeft: "2px solid var(--border-gold, var(--gold-primary))" }}>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary, rgba(232,228,220,0.7))" }}>
          {dossier.summary}
        </p>
      </div>

      {/* Sections grid: Career, Wealth, Company */}
      <div className="grid grid-cols-1 gap-4 mb-5">
        <DossierSection title="Career Narrative" text={dossier.career_narrative} />
        <DossierSection title="Wealth Assessment" text={dossier.wealth_assessment} />
        <DossierSection title="Company Context" text={dossier.company_context} />
      </div>

      {/* Outreach Hooks
          Reactive update note: hooks pinned from the Research tab via ResearchPanel
          are appended to dossier.outreach_hooks server-side. The component receives
          the updated list on page refresh or when the parent re-fetches prospect data.
          For MVP, newly pinned hooks appear after page refresh (no real-time push). */}
      {dossier.outreach_hooks && dossier.outreach_hooks.length > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
            <Lightbulb className="h-3.5 w-3.5" style={{ color: "var(--gold-primary)" }} />
            Outreach Hooks
          </h4>
          <ul className="space-y-1.5">
            {dossier.outreach_hooks.map((hook, i) => (
              <li
                key={i}
                className="text-sm pl-4 relative"
                style={{ color: "var(--text-secondary, rgba(232,228,220,0.7))" }}
              >
                <span className="absolute left-0" style={{ color: "var(--gold-muted)" }}>-</span>
                {hook}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Facts */}
      {dossier.quick_facts && dossier.quick_facts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
            <Zap className="h-3.5 w-3.5" style={{ color: "var(--gold-primary)" }} />
            Quick Facts
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {dossier.quick_facts.map((fact, i) => (
              <div key={i} className="flex flex-col p-2 rounded-md" style={{ background: "rgba(255,255,255,0.02)" }}>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{fact.label}</span>
                <span className="text-sm text-foreground font-medium">{fact.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DossierSection({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        {title}
      </h4>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary, rgba(232,228,220,0.7))" }}>
        {text}
      </p>
    </div>
  );
}
