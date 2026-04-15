"use client";

import { useState, useRef, useCallback } from "react";
import { ArrowUp, Mic, Loader2, X } from "lucide-react";

interface NLSearchBarProps {
  initialValue?: string;
  onSearch: (keywords: string) => void;
  isLoading?: boolean;
  onClear?: () => void;
}

export function NLSearchBar({
  initialValue = "",
  onSearch,
  isLoading = false,
  onClear,
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
    const newValue = e.target.value;
    setValue(newValue);
    handleAutoResize();
    // If user clears the textarea completely, notify parent
    if (!newValue.trim() && onClear) {
      onClear();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) onSearch(value.trim());
    }
  };

  return (
    <div
      data-tour-id="nl-search-bar"
      className="relative rounded-[24px] overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${
          isFocused ? "rgba(var(--gold-primary-rgb), 0.55)" : "rgba(var(--gold-primary-rgb), 0.18)"
        }`,
        boxShadow: isFocused
          ? "inset 0 0 0 1px rgba(var(--gold-primary-rgb), 0.25), 0 0 0 4px rgba(var(--gold-primary-rgb), 0.08)"
          : "none",
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
      <div className="flex items-center justify-end px-3 pb-3">
        {/* Right — Mic + Clear + Send */}
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

          {/* Clear button — visible when text present and not loading */}
          {value.trim() && !isLoading && onClear && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                onClear();
                handleAutoResize();
                textareaRef.current?.focus();
              }}
              aria-label="Clear search"
              className="h-8 w-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
              style={{
                background: "transparent",
                color: "var(--text-tertiary)",
                border: "none",
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Send / ArrowUp */}
          <button
            type="button"
            onClick={() => { if (value.trim() && !isLoading) onSearch(value.trim()); }}
            disabled={isLoading || !value.trim()}
            aria-label={isLoading ? "Searching..." : "Search"}
            className="h-8 w-8 rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
            style={
              isLoading
                ? { background: "var(--gold-primary)", color: "#0a0a0a", opacity: 0.7 }
                : value.trim()
                  ? { background: "var(--gold-primary)", color: "#0a0a0a" }
                  : {
                      background: "var(--bg-elevated)",
                      color: "var(--text-ghost)",
                      opacity: 0.5,
                    }
            }
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
