"use client";

// Phase 44 Plan 06 — Minimal tabs shell for the admin workspace.
// Rolled our own tabs instead of pulling a new dependency because
// @radix-ui/react-tabs is NOT installed (package.json ships checkbox, dialog,
// dropdown-menu, popover, select, separator, slot, toast, tooltip, but not
// react-tabs). Shadcn's tabs.tsx primitive does not live in this repo. Rather
// than add a dep mid-plan, we use button-triggered state locally.
//
// Rule 3 — Blocking issue auto-fix: the plan spec referenced Tabs/TabsList/
// TabsTrigger/TabsContent as if they existed; they do not. This component is
// the minimal shim. It preserves the semantics (two named tab panes with
// counts) while avoiding a new dependency install.

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  value: string;
  label: ReactNode;
  content: ReactNode;
}

interface WorkspaceTabsProps {
  tabs: Tab[];
  defaultValue?: string;
}

export function WorkspaceTabs({ tabs, defaultValue }: WorkspaceTabsProps) {
  const [active, setActive] = useState<string>(
    defaultValue ?? tabs[0]?.value ?? ""
  );

  return (
    <div className="w-full">
      <div
        className="inline-flex items-center gap-1 rounded-[8px] p-1 mb-4"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
        }}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.value === active;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.value)}
              className={cn(
                "px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-all cursor-pointer"
              )}
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
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div>
        {tabs.map((tab) => (
          <div
            key={tab.value}
            role="tabpanel"
            hidden={tab.value !== active}
          >
            {tab.value === active ? tab.content : null}
          </div>
        ))}
      </div>
    </div>
  );
}
