"use client";

interface ApiQuotaCardProps {
  data: { totals: Record<string, number>; days: number } | null;
}

const PROVIDERS = [
  { label: "Apollo",     cost: "$0.012", unit: "/rec" },
  { label: "Exa AI",     cost: "$0.045", unit: "/query" },
  { label: "ContactOut", cost: "$0.080", unit: "/email" },
];

export function ApiQuotaCard({ data: _data }: ApiQuotaCardProps) {
  // Skeleton state
  if (_data === null) {
    return (
      <div className="surface-admin-card rounded-[14px] p-6 relative overflow-hidden animate-pulse">
        <div className="h-3 w-40 bg-white/[0.06] rounded mb-4" />
        <div className="flex-1 flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between pb-2"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div className="h-3 w-20 bg-white/[0.06] rounded" />
              <div className="h-3 w-24 bg-white/[0.06] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="surface-admin-card rounded-[14px] p-6 relative overflow-hidden">
      <p
        className="text-[10px] font-semibold uppercase tracking-widest mb-4"
        style={{ color: "var(--admin-text-secondary)" }}
      >
        Unit Economics (Cost/Enrich)
      </p>

      <div className="flex-1 flex flex-col justify-center gap-4">
        {PROVIDERS.map((provider) => (
          <div
            key={provider.label}
            className="flex items-center justify-between pb-2"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <span
              className="text-sm"
              style={{ color: "var(--admin-text-secondary)" }}
            >
              {provider.label}
            </span>
            <span
              className="font-mono text-sm"
              style={{ color: "var(--text-primary-ds)" }}
            >
              {provider.cost}
              <span
                className="text-xs ml-0.5"
                style={{ color: "var(--text-ghost)" }}
              >
                {provider.unit}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-2 text-right">
        <span
          className="text-[10px]"
          style={{ color: "var(--gold-primary)" }}
        >
          Avg Blended Cost: $0.034
        </span>
      </div>
    </div>
  );
}
