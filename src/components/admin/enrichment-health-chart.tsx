"use client";

import { ShieldCheck } from "lucide-react";

interface EnrichmentHealthChartProps {
  data: Array<{
    date: string;
    contactout_success: number;
    contactout_failed: number;
    exa_success: number;
    exa_failed: number;
    edgar_success: number;
    edgar_failed: number;
    claude_success: number;
    claude_failed: number;
  }> | null;
}

const PROVIDERS = [
  { dataPrefix: "contactout", label: "Apollo Scraper" },
  { dataPrefix: "exa", label: "Exa Neural" },
  { dataPrefix: "edgar", label: "ContactOut" },
] as const;

type CircuitStatus = "closed" | "half-open" | "open";

const STATUS_CONFIG: Record<
  CircuitStatus,
  {
    color: string;
    glow: string;
    label: string;
    pulse: boolean;
    badgeBg: string;
    badgeBorder: string;
  }
> = {
  closed: {
    color: "var(--success)",
    glow: "rgba(34,197,94,0.6)",
    label: "Closed",
    pulse: false,
    badgeBg: "rgba(34,197,94,0.10)",
    badgeBorder: "1px solid rgba(34,197,94,0.20)",
  },
  "half-open": {
    color: "var(--warning)",
    glow: "rgba(245,158,11,0.6)",
    label: "Half-Open",
    pulse: true,
    badgeBg: "rgba(245,158,11,0.10)",
    badgeBorder: "1px solid rgba(245,158,11,0.20)",
  },
  open: {
    color: "oklch(0.62 0.19 22)",
    glow: "rgba(239,68,68,0.6)",
    label: "Open",
    pulse: false,
    badgeBg: "rgba(239,68,68,0.10)",
    badgeBorder: "1px solid rgba(239,68,68,0.20)",
  },
};

function deriveStatus(
  successCount: number,
  failCount: number
): CircuitStatus {
  const total = successCount + failCount;
  if (total === 0) return "closed";
  const failRatio = failCount / total;
  if (failRatio > 0.5) return "open";
  if (failRatio > 0.2) return "half-open";
  return "closed";
}

export function EnrichmentHealthChart({ data }: EnrichmentHealthChartProps) {
  if (data === null) {
    return (
      <div className="surface-admin-card rounded-[14px] p-6 relative overflow-hidden">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-4"
          style={{ color: "var(--admin-text-secondary)" }}
        >
          Enrichment Health (CB)
        </p>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-10 bg-white/[0.06] rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="surface-admin-card rounded-[14px] p-6 relative overflow-hidden">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-4"
          style={{ color: "var(--admin-text-secondary)" }}
        >
          Enrichment Health (CB)
        </p>
        <div className="flex items-center justify-center h-20">
          <p
            className="text-xs"
            style={{ color: "var(--admin-text-secondary)" }}
          >
            No enrichment data yet
          </p>
        </div>
      </div>
    );
  }

  const latestDay = data[data.length - 1];

  const latestDayRecord = latestDay as unknown as Record<string, number>;

  const providerStatuses = PROVIDERS.map((provider) => {
    const prefix = provider.dataPrefix;
    const successCount = latestDayRecord[`${prefix}_success`] ?? 0;
    const failCount = latestDayRecord[`${prefix}_failed`] ?? 0;
    const status = deriveStatus(successCount, failCount);
    return { ...provider, status };
  });

  return (
    <div className="surface-admin-card rounded-[14px] p-6 relative overflow-hidden group">
      {/* Decorative background icon */}
      <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-[0.05] group-hover:opacity-[0.10] transition-opacity">
        <ShieldCheck
          className="h-20 w-20"
          style={{ color: "var(--gold-primary)" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-4"
          style={{ color: "var(--admin-text-secondary)" }}
        >
          Enrichment Health (CB)
        </p>

        <div className="space-y-2">
          {providerStatuses.map((provider) => {
            const cfg = STATUS_CONFIG[provider.status];
            return (
              <div
                key={provider.dataPrefix}
                className="flex items-center justify-between p-2 rounded"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`size-2 rounded-full ${cfg.pulse ? "animate-pulse" : ""}`}
                    style={{
                      background: cfg.color,
                      boxShadow: `0 0 8px ${cfg.glow}`,
                    }}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--text-primary-ds)" }}
                  >
                    {provider.label}
                  </span>
                </div>
                <span
                  className="text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5"
                  style={{
                    color: cfg.color,
                    background: cfg.badgeBg,
                    border: cfg.badgeBorder,
                  }}
                >
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
