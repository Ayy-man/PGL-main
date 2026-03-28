"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Wrench, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type ToolCallStatus = "running" | "completed" | "failed";

// --- ToolCall Root ---

interface ToolCallProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: ToolCallStatus;
}

const ToolCall = React.forwardRef<HTMLDivElement, ToolCallProps>(
  ({ className, status = "running", ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-status={status}
        className={cn(
          "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
          status === "running" && "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]",
          status === "completed" && "border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.04)]",
          status === "failed" && "border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.04)]",
          className
        )}
        {...props}
      />
    );
  }
);
ToolCall.displayName = "ToolCall";

// --- ToolCallIcon ---

interface ToolCallIconProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: ToolCallStatus;
}

const ToolCallIcon = React.forwardRef<HTMLDivElement, ToolCallIconProps>(
  ({ className, status = "running", ...props }, ref) => {
    const Icon =
      status === "completed"
        ? CheckCircle
        : status === "failed"
        ? AlertCircle
        : Loader2;

    return (
      <div
        ref={ref}
        className={cn("mt-0.5 shrink-0", className)}
        {...props}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            status === "running" && "animate-spin text-foreground/40",
            status === "completed" && "text-green-500",
            status === "failed" && "text-red-500"
          )}
        />
      </div>
    );
  }
);
ToolCallIcon.displayName = "ToolCallIcon";

// --- ToolCallContent ---

const ToolCallContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-1 flex-col gap-0.5 min-w-0", className)}
      {...props}
    />
  );
});
ToolCallContent.displayName = "ToolCallContent";

// --- ToolCallName ---

const ToolCallName = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn("text-xs font-medium text-foreground/80 flex items-center gap-1.5", className)}
      {...props}
    />
  );
});
ToolCallName.displayName = "ToolCallName";

// --- ToolCallDescription ---

const ToolCallDescription = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn("text-xs text-foreground/40 truncate", className)}
      {...props}
    />
  );
});
ToolCallDescription.displayName = "ToolCallDescription";

export { ToolCall, ToolCallIcon, ToolCallContent, ToolCallName, ToolCallDescription };
export type { ToolCallStatus };
