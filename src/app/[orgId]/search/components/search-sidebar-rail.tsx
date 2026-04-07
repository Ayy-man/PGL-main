"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getPersonaColor } from "../lib/persona-color";
import type { Persona } from "@/lib/personas/types";

interface SearchSidebarRailProps {
  personas: Persona[];
  selectedId: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  createButton: React.ReactNode; // Expanded state: dashed-border "+ New" button
  createButtonCollapsed: React.ReactNode; // Collapsed state: icon-only "+" button
}

export function SearchSidebarRail({
  personas,
  selectedId,
  onSelect,
  collapsed,
  onToggleCollapse,
  createButton,
  createButtonCollapsed,
}: SearchSidebarRailProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className="flex flex-col flex-shrink-0 h-full overflow-hidden"
        style={{
          width: collapsed ? "48px" : "240px",
          transition: "width 200ms ease",
          background: "var(--bg-card-gradient)",
          borderRight: "1px solid var(--border-default)",
        }}
        aria-label="Saved searches sidebar"
      >
        {/* Toggle button */}
        <div
          className={collapsed ? "flex justify-center pt-3 pb-2" : "flex justify-end pt-3 pb-2 pr-2"}
        >
          <button
            onClick={onToggleCollapse}
            className="h-9 w-9 rounded-md flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-secondary-ds)" }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--gold-bg)";
              e.currentTarget.style.color = "var(--gold-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary-ds)";
            }}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Saved searches list */}
        <div className="flex-1 overflow-y-auto">
          {personas.map((persona) => {
            const isActive = persona.id === selectedId;
            const dot = (
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: getPersonaColor(persona.id) }}
              />
            );

            if (collapsed) {
              return (
                <Tooltip key={persona.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSelect(persona.id)}
                      className="flex items-center justify-center w-full h-[44px] cursor-pointer transition-colors"
                      style={
                        isActive
                          ? {
                              background: "var(--gold-bg)",
                              borderLeft: "2px solid var(--border-gold)",
                            }
                          : { background: "transparent" }
                      }
                      aria-label={persona.name}
                    >
                      {dot}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{persona.name}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <button
                key={persona.id}
                onClick={() => onSelect(persona.id)}
                className="flex items-center gap-3 w-full min-h-[44px] px-4 py-2 text-left transition-colors cursor-pointer"
                style={
                  isActive
                    ? {
                        background: "var(--gold-bg)",
                        border: "1px solid var(--border-gold)",
                        color: "var(--gold-primary)",
                      }
                    : {
                        background: "transparent",
                        border: "1px solid transparent",
                        color: "var(--text-secondary-ds)",
                      }
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--gold-bg)";
                    e.currentTarget.style.border = "1px solid var(--border-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.border = "1px solid transparent";
                  }
                }}
              >
                {dot}
                <span className="text-[13px] font-medium truncate">{persona.name}</span>
              </button>
            );
          })}
        </div>

        {/* + New button anchored at bottom */}
        <div className={collapsed ? "flex justify-center pb-4" : "p-3"}>
          {collapsed ? createButtonCollapsed : createButton}
        </div>
      </aside>
    </TooltipProvider>
  );
}
