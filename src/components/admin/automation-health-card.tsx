"use client";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LastRun {
  status: string;
  startedAt: string;
  finishedAt: string | null;
}

interface SourceHealthEntry {
  success: number;
  failed: number;
}

interface AutomationFunction {
  id: string;
  name: string;
  description: string;
  type: "cron" | "event";
  trigger: string;
  runs24h: number;
  successRate: number;
  lastRun: LastRun | null;
  nextRun: string | null;
  sourceHealth?: Record<string, SourceHealthEntry>;
}

interface AutomationHealthCardProps {
  function: AutomationFunction;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const target = new Date(dateStr).getTime();
  const diffMs = now - target;
  const absMs = Math.abs(diffMs);
  const isFuture = diffMs < 0;

  const minutes = Math.floor(absMs / 60_000);
  const hours = Math.floor(absMs / 3_600_000);
  const days = Math.floor(absMs / 86_400_000);

  let label: string;
  if (minutes < 1) {
    label = "just now";
    return label;
  } else if (minutes < 60) {
    label = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  } else if (hours < 24) {
    label = hours === 1 ? "about 1 hour" : `about ${hours} hours`;
  } else {
    label = days === 1 ? "about 1 day" : `about ${days} days`;
  }

  return isFuture ? `in ${label}` : `${label} ago`;
}

/* ------------------------------------------------------------------ */
/*  Health badge                                                       */
/* ------------------------------------------------------------------ */

interface HealthConfig {
  label: string;
  color: string;
  bg: string;
}

function getHealthConfig(fn: AutomationFunction): HealthConfig {
  if (fn.runs24h === 0 && fn.lastRun === null) {
    return {
      label: "Never Run",
      color: "var(--text-ghost)",
      bg: "rgba(255,255,255,0.05)",
    };
  }
  if (fn.successRate >= 90) {
    return {
      label: "Healthy",
      color: "oklch(0.72 0.17 142)",
      bg: "rgba(74,222,128,0.1)",
    };
  }
  if (fn.successRate >= 70) {
    return {
      label: "Degraded",
      color: "oklch(0.80 0.15 85)",
      bg: "rgba(250,204,21,0.1)",
    };
  }
  return {
    label: "Down",
    color: "oklch(0.62 0.19 22)",
    bg: "rgba(248,113,113,0.1)",
  };
}

/* ------------------------------------------------------------------ */
/*  StatusBadge                                                        */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return null;

  let dotColor: string;
  let textColor: string;
  let label: string;

  switch (status.toLowerCase()) {
    case "completed":
      dotColor = "oklch(0.72 0.17 142)";
      textColor = "oklch(0.72 0.17 142)";
      label = "Completed";
      break;
    case "failed":
      dotColor = "oklch(0.62 0.19 22)";
      textColor = "oklch(0.62 0.19 22)";
      label = "Failed";
      break;
    case "in_progress":
    case "running":
      dotColor = "oklch(0.80 0.15 85)";
      textColor = "oklch(0.80 0.15 85)";
      label = "In Progress";
      break;
    default:
      dotColor = "var(--text-ghost)";
      textColor = "var(--text-ghost)";
      label = status;
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: textColor }}>
      <span
        className="inline-block size-1.5 rounded-full"
        style={{ background: dotColor }}
      />
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  SourceDot                                                          */
/* ------------------------------------------------------------------ */

function SourceDot({
  source,
  success,
  failed,
}: {
  source: string;
  success: number;
  failed: number;
}) {
  const total = success + failed;
  let dotColor: string;

  if (total === 0) {
    dotColor = "var(--text-ghost)";
  } else if (failed === 0) {
    dotColor = "oklch(0.72 0.17 142)";
  } else if (success > failed) {
    dotColor = "oklch(0.80 0.15 85)";
  } else {
    dotColor = "oklch(0.62 0.19 22)";
  }

  return (
    <div className="flex items-center gap-1.5" title={`${source}: ${success} ok, ${failed} failed`}>
      <span
        className="inline-block size-2 rounded-full"
        style={{ background: dotColor }}
      />
      <span className="text-xs capitalize" style={{ color: "var(--text-secondary-ds)" }}>
        {source}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Success rate bar color                                             */
/* ------------------------------------------------------------------ */

function barColor(rate: number): string {
  if (rate >= 90) return "oklch(0.72 0.17 142)";
  if (rate >= 70) return "oklch(0.80 0.15 85)";
  return "oklch(0.62 0.19 22)";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AutomationHealthCard({ function: fn }: AutomationHealthCardProps) {
  const health = getHealthConfig(fn);

  return (
    <div className="surface-card rounded-[14px] p-4 md:p-6 space-y-3">
      {/* Header: name + health badge */}
      <div className="flex items-center justify-between">
        <h3
          className="font-serif text-base font-semibold"
          style={{ color: "var(--text-primary-ds)" }}
        >
          {fn.name}
        </h3>
        <span
          className={cn("text-xs font-medium px-2 py-0.5 rounded-full")}
          style={{ color: health.color, background: health.bg }}
        >
          {health.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs" style={{ color: "var(--text-secondary-ds)" }}>
        {fn.description}
      </p>

      {/* Metrics */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span style={{ color: "var(--text-secondary-ds)" }}>Type</span>
          <span className="font-mono text-xs" style={{ color: "var(--text-primary-ds)" }}>
            {fn.type === "cron" ? fn.trigger : "Event-driven"}
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "var(--text-secondary-ds)" }}>Runs (24h)</span>
          <span style={{ color: "var(--text-primary-ds)" }}>{fn.runs24h}</span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ color: "var(--text-secondary-ds)" }}>Success rate</span>
          <span style={{ color: "var(--text-primary-ds)" }}>{fn.successRate}%</span>
        </div>
        {/* Success rate bar */}
        <div className="h-1.5 rounded-full" style={{ background: "var(--border-subtle)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${fn.successRate}%`,
              background: barColor(fn.successRate),
            }}
          />
        </div>
      </div>

      {/* Last run + Next run */}
      <div
        className="pt-2 border-t space-y-1 text-sm"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex justify-between items-center">
          <span style={{ color: "var(--text-secondary-ds)" }}>Last run</span>
          <span className="flex items-center gap-1.5" style={{ color: "var(--text-primary-ds)" }}>
            <StatusBadge status={fn.lastRun?.status} />
            {fn.lastRun
              ? relativeTime(fn.lastRun.finishedAt || fn.lastRun.startedAt)
              : "Never"}
          </span>
        </div>
        {fn.nextRun && (
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary-ds)" }}>Next run</span>
            <span style={{ color: "var(--text-primary-ds)" }}>{relativeTime(fn.nextRun)}</span>
          </div>
        )}
      </div>

      {/* Source health (enrich-prospect only) */}
      {fn.sourceHealth && (
        <div className="pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: "var(--text-ghost)" }}
          >
            Source Health
          </p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(fn.sourceHealth).map(([source, { success, failed }]) => (
              <SourceDot key={source} source={source} success={success} failed={failed} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
