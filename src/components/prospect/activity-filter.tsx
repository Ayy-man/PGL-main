"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { ActivityCategory, CATEGORY_COLORS } from "@/types/activity";

interface ActivityFilterProps {
  activeCategories: ActivityCategory[];
  showSystemEvents: boolean;
  eventCount: number;
  onCategoriesChange: (categories: ActivityCategory[]) => void;
  onShowSystemEventsChange: (show: boolean) => void;
}

const ALL_CATEGORIES: ActivityCategory[] = ["outreach", "data", "team", "custom"];

export function ActivityFilter({
  activeCategories,
  showSystemEvents,
  eventCount,
  onCategoriesChange,
  onShowSystemEventsChange,
}: ActivityFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  function toggleCategory(cat: ActivityCategory) {
    if (activeCategories.includes(cat)) {
      onCategoriesChange(activeCategories.filter((c) => c !== cat));
    } else {
      onCategoriesChange([...activeCategories, cat]);
    }
  }

  function removeCategory(cat: ActivityCategory) {
    onCategoriesChange(activeCategories.filter((c) => c !== cat));
  }

  // Pills: only show if not all categories are selected
  const allSelected = ALL_CATEGORIES.every((c) => activeCategories.includes(c));
  const activePills = allSelected ? [] : activeCategories;

  return (
    <div className="flex flex-col gap-2">
      {/* Filter row */}
      <div className="flex items-center justify-between">
        {/* Left: Filter dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[8px] border transition-all duration-150"
            style={{
              background: isOpen ? "rgba(212,175,55,0.05)" : "rgba(255,255,255,0.03)",
              borderColor: isOpen
                ? "rgba(212,175,55,0.3)"
                : "var(--border-default, rgba(255,255,255,0.06))",
              color: "var(--text-secondary, rgba(232,228,220,0.7))",
            }}
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filter
            <ChevronDown
              className="h-3 w-3 transition-transform duration-150"
              style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {/* Dropdown panel */}
          {isOpen && (
            <div
              className="absolute top-full left-0 mt-1 z-50 rounded-[8px] border p-3 min-w-[200px]"
              style={{
                background: "var(--bg-elevated, #1a1a1a)",
                borderColor: "var(--border-default, rgba(255,255,255,0.06))",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              <p
                className="text-[10px] uppercase tracking-wider mb-2"
                style={{ color: "var(--text-secondary, rgba(232,228,220,0.4))" }}
              >
                Categories
              </p>

              <div className="flex flex-col gap-1.5">
                {ALL_CATEGORIES.map((cat) => {
                  const colors = CATEGORY_COLORS[cat];
                  const checked = activeCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className="flex items-center gap-2 cursor-pointer py-0.5 group"
                    >
                      {/* Custom checkbox */}
                      <div
                        onClick={() => toggleCategory(cat)}
                        className="flex items-center justify-center w-4 h-4 rounded-sm border flex-shrink-0 transition-all duration-150"
                        style={{
                          background: checked ? colors.dot : "transparent",
                          borderColor: checked ? colors.dot : "var(--border-default, rgba(255,255,255,0.15))",
                        }}
                      >
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 12 12">
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      {/* Color dot */}
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: colors.dot }}
                      />
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-foreground, rgba(232,228,220,0.9))" }}
                        onClick={() => toggleCategory(cat)}
                      >
                        {colors.label}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Separator */}
              <div
                className="my-2 h-px"
                style={{ background: "var(--border-default, rgba(255,255,255,0.06))" }}
              />

              {/* System events toggle */}
              <label className="flex items-center gap-2 cursor-pointer py-0.5">
                <div
                  onClick={() => onShowSystemEventsChange(!showSystemEvents)}
                  className="flex items-center justify-center w-4 h-4 rounded-sm border flex-shrink-0 transition-all duration-150"
                  style={{
                    background: showSystemEvents
                      ? "var(--info, #3b82f6)"
                      : "transparent",
                    borderColor: showSystemEvents
                      ? "var(--info, #3b82f6)"
                      : "var(--border-default, rgba(255,255,255,0.15))",
                  }}
                >
                  {showSystemEvents && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-foreground, rgba(232,228,220,0.9))" }}
                  onClick={() => onShowSystemEventsChange(!showSystemEvents)}
                >
                  Show system events
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Right: event count */}
        <span
          className="text-xs"
          style={{ color: "var(--text-secondary, rgba(232,228,220,0.5))" }}
        >
          {eventCount} {eventCount === 1 ? "event" : "events"}
        </span>
      </div>

      {/* Active filter pills */}
      {activePills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activePills.map((cat) => {
            const colors = CATEGORY_COLORS[cat];
            return (
              <span
                key={cat}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full border"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "var(--border-default, rgba(255,255,255,0.06))",
                  color: "var(--text-foreground, rgba(232,228,220,0.9))",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: colors.dot }}
                />
                {colors.label}
                <button
                  onClick={() => removeCategory(cat)}
                  className="ml-0.5 flex-shrink-0"
                  style={{ color: "var(--text-secondary, rgba(232,228,220,0.5))" }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
