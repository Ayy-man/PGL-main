"use client";

import { useState, useRef, useCallback } from "react";
import { ArrowUp, Mic, SlidersHorizontal } from "lucide-react";

interface NLSearchBarProps {
  initialValue?: string;
  onSearch: (keywords: string) => void;
  isLoading?: boolean;
  onToggleFilters?: () => void;
  filtersOpen?: boolean;
}

export function NLSearchBar({
  initialValue = "",
  onSearch,
  isLoading = false,
  onToggleFilters,
  filtersOpen = false,
}: NLSearchBarProps) {
  const [value, setValue] = useState<string>(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAutoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height =
      Math.min(Math.max(textarea.scrollHeight, 56), 200) + "px";
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    handleAutoResize();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSearch(value.trim());
    }
  };

  return (
    <div
      className="relative rounded-[24px] overflow-hidden"
      style={{
        background: "var(--bg-input)",
        border: `1px solid ${
          isFocused ? "rgba(212,175,55,0.3)" : "rgba(212,175,55,0.15)"
        }`,
        boxShadow: isFocused ? "0 0 0 3px rgba(212,175,55,0.06)" : "none",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {/* Auto-resize textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[16px] font-sans placeholder:italic outline-none"
        style={{
          color: "var(--text-primary-ds)",
          minHeight: "56px",
          maxHeight: "200px",
        }}
        placeholder="Describe your ideal prospect..."
        rows={1}
      />

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between px-3 pb-3">
        {/* Left — Filters chip */}
        <button
          type="button"
          onClick={onToggleFilters}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium cursor-pointer transition-colors"
          style={
            filtersOpen
              ? {
                  background: "var(--gold-bg)",
                  border: "1px solid var(--border-gold)",
                  color: "var(--gold-primary)",
                }
              : {
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary-ds)",
                }
          }
        >
          <SlidersHorizontal className="h-3 w-3" />
          Filters
        </button>

        {/* Right — Mic + Send */}
        <div className="flex items-center gap-2">
          {/* Mic — disabled */}
          <button
            type="button"
            disabled
            aria-label="Voice search (coming soon)"
            className="h-8 w-8 rounded-full flex items-center justify-center"
            style={{
              opacity: 0.25,
              background: "transparent",
              border: "none",
              cursor: "not-allowed",
            }}
          >
            <Mic className="h-4 w-4" style={{ color: "var(--text-secondary-ds)" }} />
          </button>

          {/* Send / ArrowUp */}
          <button
            type="button"
            onClick={() => onSearch(value.trim())}
            disabled={isLoading || !value.trim()}
            aria-label="Search"
            className="h-8 w-8 rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
            style={
              value.trim()
                ? { background: "var(--gold-primary)", color: "#0a0a0a" }
                : {
                    background: "var(--bg-elevated)",
                    color: "var(--text-ghost)",
                    opacity: 0.5,
                  }
            }
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
