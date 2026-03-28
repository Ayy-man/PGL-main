"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// --- Actions Root ---

const Actions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  );
});
Actions.displayName = "Actions";

// --- ActionButton ---

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  active?: boolean;
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ className, label, active = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        title={label}
        aria-label={label}
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md transition-all",
          "text-foreground/40 hover:text-foreground/80 hover:bg-[rgba(255,255,255,0.06)]",
          active && "text-[#d4af37] hover:text-[#d4af37] bg-[rgba(212,175,55,0.08)]",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
ActionButton.displayName = "ActionButton";

export { Actions, ActionButton };
