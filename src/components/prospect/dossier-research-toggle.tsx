"use client";

interface DossierResearchToggleProps {
  active: "dossier" | "research";
  onChange: (tab: "dossier" | "research") => void;
}

export function DossierResearchToggle({ active, onChange }: DossierResearchToggleProps) {
  return (
    <div
      className="flex gap-1 p-1 rounded-lg font-sans"
      style={{ background: "var(--bg-surface, rgba(255,255,255,0.04))" }}
    >
      {(["dossier", "research"] as const).map((tab) => {
        const isActive = active === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none"
            style={{
              color: isActive
                ? "var(--text-primary, #e8e4dc)"
                : "var(--text-tertiary, rgba(232,228,220,0.4))",
              borderBottom: isActive
                ? "2px solid var(--gold-primary, #d4af37)"
                : "2px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--text-secondary, rgba(232,228,220,0.7))";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--text-tertiary, rgba(232,228,220,0.4))";
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
