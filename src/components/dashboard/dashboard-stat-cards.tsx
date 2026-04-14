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
  index,
}: {
  icon: typeof Upload;
  label: string;
  value: string;
  subtitle: string;
  index: number;
}) {
  return (
    <div
      className="rounded-[14px] px-6 py-5 text-center row-enter"
      style={{
        background: "var(--bg-card-gradient, rgba(255,255,255,0.03))",
        border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
        animationDelay: `${index * 60}ms`,
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

  const cards = [
    {
      icon: Upload,
      label: "Total Exports",
      value: totalExports.toLocaleString(),
      subtitle: "Files generated this period",
    },
    {
      icon: Download,
      label: "Downloads Ready",
      value: downloadsReady.toLocaleString(),
      subtitle: "Prospects across all lists",
    },
    {
      icon: Award,
      label: "Enrichment Rate",
      value: enrichmentRate > 0 ? `${enrichmentRate}%` : "0%",
      subtitle: enrichmentSubtitle,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <StatCard
          key={card.label}
          icon={card.icon}
          label={card.label}
          value={card.value}
          subtitle={card.subtitle}
          index={index}
        />
      ))}
    </div>
  );
}
