"use client";

interface ExportActivityChartProps {
  data: {
    tenants: Array<{
      name: string;
      exports7d: number;
    }>;
  } | null;
}

export function ExportActivityChart({ data }: ExportActivityChartProps) {
  // Skeleton state
  if (data === null) {
    return (
      <div className="surface-admin-card rounded-[14px] p-6 flex flex-col animate-pulse">
        <div className="h-3 w-36 bg-white/[0.06] rounded mb-4" />
        <div className="flex-1 flex items-end gap-2 px-2 pb-2 min-h-[120px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-white/[0.06]"
              style={{ height: `${20 + i * 15}%` }}
            />
          ))}
        </div>
        <div
          className="mt-1"
          style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
        />
        <div className="flex justify-between mt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 h-2 bg-white/[0.06] rounded mx-0.5" />
          ))}
        </div>
      </div>
    );
  }

  const tenants = data.tenants.slice(0, 5);

  // Empty state
  if (tenants.length === 0) {
    return (
      <div className="surface-admin-card rounded-[14px] p-6 flex flex-col">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-4"
          style={{ color: "var(--admin-text-secondary)" }}
        >
          Export Activity (7d)
        </p>
        <div className="flex-1 flex items-center justify-center min-h-[120px]">
          <p
            className="text-sm"
            style={{ color: "var(--admin-text-secondary)" }}
          >
            No export data yet
          </p>
        </div>
      </div>
    );
  }

  const maxExports = Math.max(...tenants.map((t) => t.exports7d), 1);

  const bars = tenants.map((tenant) => ({
    name: tenant.name,
    exports: tenant.exports7d,
    heightPct: Math.max((tenant.exports7d / maxExports) * 100, 5),
  }));

  return (
    <div className="surface-admin-card rounded-[14px] p-6 flex flex-col">
      <p
        className="text-[10px] font-semibold uppercase tracking-widest mb-4"
        style={{ color: "var(--admin-text-secondary)" }}
      >
        Export Activity (7d)
      </p>

      <div className="flex-1 flex items-end gap-2 px-2 pb-2 min-h-[120px]">
        {bars.map((bar) => (
          <div
            key={bar.name}
            className="flex-1 rounded-t-sm relative cursor-default"
            style={{
              height: `${bar.heightPct}%`,
              background: "rgba(255,255,255,0.05)",
              transition: "background 0.15s ease",
            }}
            title={`${bar.name}: ${bar.exports} exports`}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--gold-bg-strong)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
          />
        ))}
      </div>

      <div
        className="mt-1"
        style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
      />
      <div
        className="flex justify-between text-[10px] mt-1"
        style={{ color: "var(--text-ghost)" }}
      >
        {bars.map((bar) => (
          <span
            key={bar.name}
            className="flex-1 text-center truncate px-0.5"
          >
            {bar.name.split(" ")[0]}
          </span>
        ))}
      </div>
    </div>
  );
}
