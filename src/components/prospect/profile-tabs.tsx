"use client";

export type ProfileTabName =
  | "overview"
  | "activity"
  | "sec-filings"
  | "enrichment"
  | "notes"
  | "lists";

const TABS: ProfileTabName[] = [
  "overview",
  "activity",
  "sec-filings",
  "enrichment",
  "notes",
  "lists",
];

interface ProfileTabsProps {
  activeTab: ProfileTabName;
  onTabChange: (tab: ProfileTabName) => void;
}

function formatTabLabel(tab: ProfileTabName): string {
  return tab.replace(/-/g, " ");
}

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div
      className="sticky top-14 z-10 border-b border-border px-4 lg:px-14 scroll-fade-right"
      style={{ background: "var(--background)" }}
    >
      {/* Horizontally scrollable tab row — no wrapping on mobile */}
      <div className="flex gap-0 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              className="relative whitespace-nowrap pb-3 pt-4 text-sm capitalize transition-colors duration-200 cursor-pointer mr-6 shrink-0"
              style={{
                color: isActive ? "var(--text-primary-ds)" : "var(--text-secondary-ds)",
                fontWeight: isActive ? 500 : 400,
              }}
              onClick={() => onTabChange(tab)}
            >
              {formatTabLabel(tab)}
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-200"
                style={{
                  background: "var(--gold-primary)",
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? "scaleX(1)" : "scaleX(0)",
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
