"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// --- Shimmer Root ---

interface ShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
}

const Shimmer = React.forwardRef<HTMLDivElement, ShimmerProps>(
  ({ className, active = true, ...props }, ref) => {
    if (!active) return null;
    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-3 w-full", className)}
        {...props}
      />
    );
  }
);
Shimmer.displayName = "Shimmer";

// --- ShimmerLine ---

interface ShimmerLineProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: "full" | "3/4" | "1/2" | "1/3" | "2/3";
}

const ShimmerLine = React.forwardRef<HTMLDivElement, ShimmerLineProps>(
  ({ className, width = "full", ...props }, ref) => {
    const widthMap = {
      full: "w-full",
      "3/4": "w-3/4",
      "1/2": "w-1/2",
      "1/3": "w-1/3",
      "2/3": "w-2/3",
    };
    return (
      <div
        ref={ref}
        className={cn(
          "h-3 rounded-full bg-[rgba(255,255,255,0.06)] animate-pulse",
          widthMap[width],
          className
        )}
        {...props}
      />
    );
  }
);
ShimmerLine.displayName = "ShimmerLine";

// --- ShimmerBlock ---

interface ShimmerBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: string;
}

const ShimmerBlock = React.forwardRef<HTMLDivElement, ShimmerBlockProps>(
  ({ className, height = "h-20", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full rounded-lg bg-[rgba(255,255,255,0.04)] animate-pulse",
          height,
          className
        )}
        {...props}
      />
    );
  }
);
ShimmerBlock.displayName = "ShimmerBlock";

// --- ShimmerCard ---

const ShimmerCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-[rgba(255,255,255,0.06)] p-4 flex flex-col gap-3",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded-full bg-[rgba(255,255,255,0.08)] animate-pulse shrink-0" />
        <div className="h-3 w-24 rounded-full bg-[rgba(255,255,255,0.08)] animate-pulse" />
      </div>
      <ShimmerLine width="full" />
      <ShimmerLine width="3/4" />
      <ShimmerLine width="1/2" />
    </div>
  );
});
ShimmerCard.displayName = "ShimmerCard";

export { Shimmer, ShimmerLine, ShimmerBlock, ShimmerCard };
