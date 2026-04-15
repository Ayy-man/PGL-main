import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
}

/**
 * Minimal Tailwind-only progress bar primitive. No Radix dependency — we only
 * need a filled bar at `value / max * 100%`. Used by the admin onboarding
 * checklist to show `completed/total` progress.
 */
export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, max = 100, className, ...rest }, ref) => {
    const safeMax = max <= 0 ? 100 : max;
    const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full",
          "bg-[var(--border-subtle)]",
          className
        )}
        {...rest}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${pct}%`,
            background: "var(--gold-primary)",
          }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";
