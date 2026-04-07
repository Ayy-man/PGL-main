"use client";

// Stub — full implementation in Phase 29 plan 05
import type { Persona } from "@/lib/personas/types";

interface SearchSidebarRailProps {
  personas: Persona[];
  selectedId: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  createButton: React.ReactNode;
  createButtonCollapsed: React.ReactNode;
}

export function SearchSidebarRail({
  personas,
  selectedId,
  onSelect,
  collapsed,
  onToggleCollapse,
  createButton,
}: SearchSidebarRailProps) {
  return (
    <div
      className="flex flex-col border-r"
      style={{
        width: collapsed ? "64px" : "240px",
        minWidth: collapsed ? "64px" : "240px",
        borderColor: "var(--border-subtle)",
        transition: "width 0.2s",
      }}
    >
      <div className="flex items-center justify-between p-3">
        {!collapsed && createButton}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="ml-auto p-1 rounded"
          style={{ color: "var(--text-ghost)" }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>
      <div className="flex flex-col gap-1 px-2 overflow-y-auto">
        {personas.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className="text-left rounded-[6px] px-2 py-1.5 text-xs truncate"
            style={{
              background:
                selectedId === p.id
                  ? "color-mix(in oklch, var(--gold-primary) 12%, transparent)"
                  : "transparent",
              color:
                selectedId === p.id
                  ? "var(--gold-text)"
                  : "var(--text-secondary-ds)",
            }}
          >
            {collapsed ? p.name.slice(0, 1) : p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
