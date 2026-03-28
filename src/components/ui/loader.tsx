"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// --- Loader Root ---

type LoaderVariant = "dots" | "spinner" | "pulse";

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: LoaderVariant;
  size?: "sm" | "md" | "lg";
}

const Loader = React.forwardRef<HTMLDivElement, LoaderProps>(
  ({ className, variant = "dots", size = "md", ...props }, ref) => {
    const sizeMap = {
      sm: "gap-1",
      md: "gap-1.5",
      lg: "gap-2",
    };
    const dotSize = {
      sm: "h-1.5 w-1.5",
      md: "h-2 w-2",
      lg: "h-2.5 w-2.5",
    };

    if (variant === "spinner") {
      return (
        <div
          ref={ref}
          className={cn(
            "rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[rgba(212,175,55,0.7)] animate-spin",
            size === "sm" && "h-4 w-4",
            size === "md" && "h-5 w-5",
            size === "lg" && "h-6 w-6",
            className
          )}
          {...props}
        />
      );
    }

    if (variant === "dots") {
      return (
        <div
          ref={ref}
          className={cn("flex items-center", sizeMap[size], className)}
          {...props}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "rounded-full bg-foreground/40",
                dotSize[size],
                "animate-bounce"
              )}
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      );
    }

    // pulse variant
    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-1", className)}
        {...props}
      >
        <span
          className={cn(
            "rounded-full bg-[rgba(212,175,55,0.6)] animate-pulse",
            dotSize[size]
          )}
        />
      </div>
    );
  }
);
Loader.displayName = "Loader";

export { Loader };
export type { LoaderVariant };
