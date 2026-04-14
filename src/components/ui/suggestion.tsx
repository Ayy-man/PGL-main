"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// --- Suggestion Root ---

interface SuggestionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  highlighted?: boolean;
}

const Suggestion = React.forwardRef<HTMLButtonElement, SuggestionProps>(
  ({ className, highlighted = false, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
          "text-left text-foreground/70 hover:text-foreground",
          highlighted
            ? "border-[var(--border-gold)] bg-[var(--gold-bg)] hover:bg-[var(--gold-bg-strong)]"
            : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.15)]",
          className
        )}
        {...props}
      />
    );
  }
);
Suggestion.displayName = "Suggestion";

// --- SuggestionGroup ---

const SuggestionGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    />
  );
});
SuggestionGroup.displayName = "SuggestionGroup";

// --- SuggestionLabel ---

const SuggestionLabel = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn("text-[11px] font-medium uppercase tracking-wider text-foreground/40", className)}
      {...props}
    />
  );
});
SuggestionLabel.displayName = "SuggestionLabel";

export { Suggestion, SuggestionGroup, SuggestionLabel };
