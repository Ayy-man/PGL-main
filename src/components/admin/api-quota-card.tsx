"use client";

import { Activity } from "lucide-react";

interface QuotaData {
  totals: Record<string, number>;
  days: number;
}

interface ApiQuotaCardProps {
  data: QuotaData | null;
}

const PROVIDERS = [
  { key: "apollo", label: "Apollo" },
  { key: "contactout", label: "ContactOut" },
  { key: "exa", label: "Exa" },
  { key: "edgar", label: "EDGAR" },
  { key: "claude", label: "Claude" },
];

export function ApiQuotaCard({ data }: ApiQuotaCardProps) {
  // Skeleton state
  if (data === null) {
    return (
      <div className="surface-admin-card rounded-[14px] p-5 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-3 w-28 bg-white/[0.06] rounded" />
          <div className="h-4 w-4 bg-white/[0.06] rounded" />
        </div>
        <div className="space-y-2.5 mt-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-20 bg-white/[0.06] rounded" />
              <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full" />
              <div className="h-3 w-8 bg-white/[0.06] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const allZero = Object.values(data.totals).every((v) => v === 0);
  const maxValue = Math.max(...Object.values(data.totals), 1);

  return (
    <div className="surface-admin-card rounded-[14px] p-5">
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--admin-text-secondary)" }}
        >
          API Quota Burn ({data.days}d)
        </p>
        <Activity
          className="h-4 w-4 shrink-0"
          style={{ color: "var(--admin-text-secondary)", opacity: 0.7 }}
        />
      </div>

      {allZero ? (
        <p
          className="text-xs py-4 text-center"
          style={{ color: "var(--admin-text-secondary)" }}
        >
          No API usage data yet
        </p>
      ) : (
        <div className="space-y-2">
          {PROVIDERS.map(({ key, label }) => {
            const count = data.totals[key] ?? 0;
            const pct = maxValue > 0 ? Math.round((count / maxValue) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-2">
                <span
                  className="text-xs w-20 shrink-0"
                  style={{ color: "var(--admin-text-secondary)" }}
                >
                  {label}
                </span>
                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: "var(--gold-primary)",
                    }}
                  />
                </div>
                <span
                  className="text-xs font-mono w-10 text-right shrink-0"
                  style={{
                    color:
                      count > 0
                        ? "var(--gold-primary)"
                        : "var(--text-secondary)",
                  }}
                >
                  {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
