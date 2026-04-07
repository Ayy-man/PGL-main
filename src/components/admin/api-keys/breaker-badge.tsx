"use client";

import type { BreakerState } from "@/types/admin-api-keys";

interface BreakerBadgeProps {
  state: BreakerState;
}

const CONFIG: Record<Exclude<BreakerState, "none">, { label: string; color: string }> = {
  closed: { label: "Breaker: Closed", color: "var(--success)" },
  half_open: { label: "Breaker: Half-Open", color: "oklch(0.80 0.15 85)" },
  open: { label: "Breaker: Open", color: "oklch(0.62 0.19 22)" },
};

export function BreakerBadge({ state }: BreakerBadgeProps) {
  if (state === "none") return null;
  const cfg = CONFIG[state];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wide uppercase"
      style={{ color: cfg.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}
