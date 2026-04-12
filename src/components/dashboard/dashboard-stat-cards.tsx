import { Upload, Download, Award } from "lucide-react";

interface DashboardStatCardsProps {
  totalExports: number;
  downloadsReady: number;
  enrichmentRate: number;
  profilesEnriched?: number;
  profilesViewed?: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: typeof Upload;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div
      className="rounded-[14px] px-6 py-5 text-center"
      style={{
        background: "var(--bg-card-gradient, rgba(255,255,255,0.03))",
        border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
      }}
    >
      <div
        className="inline-flex items-center justify-center h-9 w-9 rounded-[8px] mb-3"
        style={{
          background: "rgba(212,175,55,0.08)",
          border: "1px solid rgba(212,175,55,0.12)",
        }}
      >
        <Icon
          className="h-4 w-4"
          style={{ color: "var(--gold-primary)" }}
        />
      </div>
      <p
        className="text-[10px] font-semibold uppercase tracking-[1.5px] mb-2"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </p>
      <p
        className="font-serif text-3xl font-bold leading-none"
        style={{ color: "var(--text-primary-ds, var(--text-primary))" }}
      >
        {value}
      </p>
      <p
        className="text-[11px] mt-2"
        style={{ color: "var(--text-tertiary)" }}
      >
        {subtitle}
      </p>
    </div>
  );
}

export function DashboardStatCards({
  totalExports,
  downloadsReady,
  enrichmentRate,
  profilesEnriched,
  profilesViewed,
}: DashboardStatCardsProps) {
  const enrichmentSubtitle =
    profilesEnriched != null && profilesViewed != null
      ? `${profilesEnriched} of ${profilesViewed} profiles`
      : "Profiles enriched vs. viewed";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        icon={Upload}
        label="Total Exports"
        value={totalExports.toLocaleString()}
        subtitle="Files generated this period"
      />
      <StatCard
        icon={Download}
        label="Downloads Ready"
        value={downloadsReady.toLocaleString()}
        subtitle="Prospects across all lists"
      />
      <StatCard
        icon={Award}
        label="Enrichment Rate"
        value={enrichmentRate > 0 ? `${enrichmentRate}%` : "0%"}
        subtitle={enrichmentSubtitle}
      />
    </div>
  );
}
