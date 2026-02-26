"use client";

import { useRef } from "react";
import { Users, Activity, UserCheck } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";
import { ComingSoonCard } from "@/components/admin/coming-soon-card";

interface PlatformPulseProps {
  data: {
    totalProspects: number;
    enrichmentCoverage: number;
    enrichmentFailed: number;
    activeUsersToday: number;
    activeUsers7dAvg: number;
  } | null;
}

function SkeletonCard() {
  return (
    <div
      className="rounded-[14px] p-5 animate-pulse"
      style={{
        background: "var(--bg-card-gradient)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-28 bg-muted rounded" />
        <div className="h-4 w-4 bg-muted rounded" />
      </div>
      <div className="h-9 w-20 bg-muted rounded mb-2" />
      <div className="h-3 w-36 bg-muted rounded" />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  accentSubtitle?: boolean;
}

function StatCard({ label, value, subtitle, icon, accentSubtitle }: StatCardProps) {
  const animated = useCountUp(value);
  const isNonZero = value > 0;

  return (
    <div
      className="rounded-[14px] p-5"
      style={{
        background: "var(--bg-card-gradient)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className="text-muted-foreground/60">{icon}</span>
      </div>
      <p
        className="font-serif font-bold leading-none"
        style={{
          fontSize: "36px",
          color: isNonZero ? "var(--gold-primary)" : "var(--text-secondary)",
        }}
      >
        {animated.toLocaleString()}
      </p>
      <p
        className="mt-1.5 text-xs"
        style={{ color: accentSubtitle ? "var(--gold-primary)" : "var(--text-secondary)" }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function ApiQuotaPlaceholder() {
  return (
    <div
      className="rounded-[14px] p-5"
      style={{
        background: "var(--bg-card-gradient)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          API Quota Burn
        </p>
        <span className="text-muted-foreground">
          <Activity className="h-4 w-4" />
        </span>
      </div>
      <p
        className="font-serif font-bold leading-none mb-3"
        style={{ fontSize: "36px", color: "var(--text-secondary)" }}
      >
        —
      </p>
      <div className="space-y-2">
        {["Apollo", "ContactOut", "Exa", "EDGAR", "Claude"].map((provider) => (
          <div key={provider} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20 shrink-0">
              {provider}
            </span>
            <div className="flex-1 h-1.5 bg-muted rounded-full">
              <div className="h-1.5 w-0 rounded-full" style={{ background: "var(--gold-primary)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlatformPulse({ data }: PlatformPulseProps) {
  const hasAnimated = useRef(false);

  if (data === null) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  // Only animate on first non-null data load
  const shouldAnimate = !hasAnimated.current;
  if (!hasAnimated.current) {
    hasAnimated.current = true;
  }

  const successRate =
    data.totalProspects > 0
      ? Math.round(
          ((data.totalProspects - data.enrichmentFailed) / data.totalProspects) * 100
        )
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Prospects"
        value={shouldAnimate ? data.totalProspects : data.totalProspects}
        subtitle={`enrichment coverage: ${data.enrichmentCoverage}%`}
        icon={<Users className="h-4 w-4" />}
        accentSubtitle={false}
      />

      <StatCard
        label="Enrichment Pipeline"
        value={successRate}
        subtitle={`${data.enrichmentFailed.toLocaleString()} failed`}
        icon={<Activity className="h-4 w-4" />}
        accentSubtitle={true}
      />

      <ComingSoonCard>
        <ApiQuotaPlaceholder />
      </ComingSoonCard>

      <StatCard
        label="Active Users Today"
        value={data.activeUsersToday}
        subtitle={`7d avg: ${data.activeUsers7dAvg}`}
        icon={<UserCheck className="h-4 w-4" />}
        accentSubtitle={false}
      />
    </div>
  );
}
