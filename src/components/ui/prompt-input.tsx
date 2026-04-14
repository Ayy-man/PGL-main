"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// --- PromptInput Root ---

interface PromptInputProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean;
}

const PromptInputContext = React.createContext<{ isLoading: boolean }>({
  isLoading: false,
});

const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  ({ className, isLoading = false, ...props }, ref) => {
    return (
      <PromptInputContext.Provider value={{ isLoading }}>
        <div
          ref={ref}
          className={cn(
            "flex flex-col gap-2 rounded-xl border border-border-subtle bg-bg-elevated p-3 focus-within:border-[var(--border-gold)] transition-colors",
            className
          )}
          {...props}
        />
      </PromptInputContext.Provider>
    );
  }
);
PromptInput.displayName = "PromptInput";

// --- PromptInputTextarea ---

type PromptInputTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const PromptInputTextarea = React.forwardRef<
  HTMLTextAreaElement,
  PromptInputTextareaProps
>(({ className, ...props }, ref) => {
  const { isLoading } = React.useContext(PromptInputContext);

  return (
    <textarea
      ref={ref}
      disabled={isLoading}
      rows={1}
      className={cn(
        "w-full resize-none bg-transparent text-sm text-foreground placeholder:text-foreground/40 focus:outline-none disabled:opacity-50",
        "min-h-[36px] max-h-[200px]",
        className
      )}
      onInput={(e) => {
        const target = e.currentTarget;
        target.style.height = "auto";
        target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
      }}
      {...props}
    />
  );
});
PromptInputTextarea.displayName = "PromptInputTextarea";

// --- PromptInputActions ---

const PromptInputActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex items-center justify-between gap-2", className)}
      {...props}
    />
  );
});
PromptInputActions.displayName = "PromptInputActions";

export { PromptInput, PromptInputTextarea, PromptInputActions };
