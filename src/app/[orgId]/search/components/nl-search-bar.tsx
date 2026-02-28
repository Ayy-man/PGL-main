"use client";

import { useState, useRef, useCallback } from "react";
import { Search, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NLSearchBarProps {
  initialValue?: string;
  onSearch: (keywords: string) => void;
  isLoading?: boolean;
}

export function NLSearchBar({
  initialValue = "",
  onSearch,
  isLoading = false,
}: NLSearchBarProps) {
  const [value, setValue] = useState<string>(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAutoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;
    const clamped = Math.min(Math.max(scrollHeight, 56), 120);
    textarea.style.height = `${clamped}px`;
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

  const handleSearchClick = () => {
    onSearch(value.trim());
  };

  return (
    <div
      className="relative rounded-[12px] overflow-hidden"
      style={{
        background: "var(--bg-input)",
        border: `1px solid ${isFocused ? "var(--border-hover)" : "var(--border-subtle)"}`,
        transition: "border-color 0.2s ease",
      }}
    >
      {/* Left search icon */}
      <Search
        className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 shrink-0 pointer-events-none"
        style={{ color: "var(--text-muted)" }}
      />

      {/* Auto-resize textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full resize-none bg-transparent py-4 pl-14 pr-32 text-[16px] font-sans placeholder:italic outline-none"
        style={{
          color: "var(--text-primary-ds)",
          minHeight: "56px",
          maxHeight: "120px",
        }}
        placeholder="Describe your ideal prospect... e.g., 'Tech founders in Miami over $5M looking for investment properties'"
        rows={1}
      />

      {/* Right action area */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {/* Mic placeholder button (non-functional) */}
        <button
          type="button"
          disabled
          aria-label="Voice search (coming soon)"
          className="h-9 w-9 rounded-full flex items-center justify-center"
          style={{
            opacity: 0.3,
            background: "transparent",
            border: "none",
            cursor: "not-allowed",
          }}
        >
          <Mic className="h-4 w-4" style={{ color: "var(--text-secondary-ds)" }} />
        </button>

        {/* Gold search button */}
        <Button
          variant="gold"
          size="sm"
          onClick={handleSearchClick}
          disabled={isLoading || value.trim().length === 0}
        >
          Search
        </Button>
      </div>
    </div>
  );
}
