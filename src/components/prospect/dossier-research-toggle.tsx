"use client";

interface DossierResearchToggleProps {
  active: "dossier" | "research";
  onChange: (tab: "dossier" | "research") => void;
}

export function DossierResearchToggle({ active, onChange }: DossierResearchToggleProps) {
  return (
    <div className="inline-flex gap-1 self-start font-sans">
      {(["dossier", "research"] as const).map((tab) => {
        const isActive = active === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className="px-3.5 py-1.5 text-xs font-medium rounded-[8px] transition-all duration-200 focus:outline-none cursor-pointer"
            style={{
              color: isActive
                ? "var(--gold-primary, #d4af37)"
                : "var(--text-tertiary, rgba(232,228,220,0.4))",
              background: isActive
                ? "var(--gold-bg-strong, rgba(212,175,55,0.12))"
                : "transparent",
              boxShadow: isActive
                ? "0 0 0 1px var(--border-gold, rgba(212,175,55,0.2))"
                : "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--text-secondary, rgba(232,228,220,0.7))";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.03)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--text-tertiary, rgba(232,228,220,0.4))";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
              }
            }}
          >
            {tab === "dossier" ? "Intelligence Dossier" : "Research"}
          </button>
        );
      })}
    </div>
  );
}
