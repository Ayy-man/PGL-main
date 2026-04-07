"use client";

import type { ConfigStatus } from "@/types/admin-api-keys";

interface StatusBadgeProps {
  status: ConfigStatus;
  mockActive?: boolean;
}

const CONFIG: Record<ConfigStatus, { label: string; color: string; bg: string }> = {
  configured: {
    label: "Configured",
    color: "var(--success)",
    bg: "color-mix(in oklch, var(--success) 12%, transparent)",
  },
  missing: {
    label: "Missing",
    color: "oklch(0.62 0.19 22)",
    bg: "color-mix(in oklch, oklch(0.62 0.19 22) 12%, transparent)",
  },
  partial: {
    label: "Partial",
    color: "oklch(0.80 0.15 85)",
    bg: "color-mix(in oklch, oklch(0.80 0.15 85) 12%, transparent)",
  },
};

const MOCK_CONFIG = {
  label: "Mock Active",
  color: "oklch(0.80 0.15 85)",
  bg: "color-mix(in oklch, oklch(0.80 0.15 85) 16%, transparent)",
};

export function StatusBadge({ status, mockActive }: StatusBadgeProps) {
  const cfg = mockActive ? MOCK_CONFIG : CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}
