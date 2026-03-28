"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Brain } from "lucide-react";

// --- Reasoning Root ---

interface ReasoningProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen?: boolean;
  defaultOpen?: boolean;
}

const Reasoning = React.forwardRef<HTMLDivElement, ReasoningProps>(
  ({ className, isOpen, defaultOpen = false, children, ...props }, ref) => {
    const [open, setOpen] = React.useState(defaultOpen);
    const controlled = isOpen !== undefined;
    const expanded = controlled ? isOpen : open;

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] overflow-hidden",
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child;
          const childType = (child as React.ReactElement & { type: { displayName?: string } }).type;
          if (childType.displayName === "ReasoningTrigger") {
            return React.cloneElement(child as React.ReactElement<{ onClick?: () => void; isOpen?: boolean }>, {
              onClick: controlled ? undefined : () => setOpen((v) => !v),
              isOpen: expanded,
            });
          }
          if (childType.displayName === "ReasoningContent") {
            return expanded ? child : null;
          }
          return child;
        })}
      </div>
    );
  }
);
Reasoning.displayName = "Reasoning";

// --- ReasoningTrigger ---

interface ReasoningTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isOpen?: boolean;
  duration?: number;
}

const ReasoningTrigger = React.forwardRef<HTMLButtonElement, ReasoningTriggerProps>(
  ({ className, isOpen, duration, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground/50 hover:text-foreground/70 transition-colors",
          className
        )}
        {...props}
      >
        <Brain className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">{children || "Reasoning"}</span>
        {duration !== undefined && (
          <span className="text-[11px] text-foreground/30">{duration}ms</span>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
    );
  }
);
ReasoningTrigger.displayName = "ReasoningTrigger";

// --- ReasoningContent ---

const ReasoningContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "border-t border-[rgba(255,255,255,0.06)] px-3 py-3 text-xs text-foreground/50 leading-relaxed whitespace-pre-wrap",
        className
      )}
      {...props}
    />
  );
});
ReasoningContent.displayName = "ReasoningContent";

export { Reasoning, ReasoningTrigger, ReasoningContent };
