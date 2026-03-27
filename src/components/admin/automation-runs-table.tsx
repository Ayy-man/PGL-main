"use client";

import { useEffect, useState } from "react";
import { Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Run {
  id: string;
  functionId: string;
  functionName: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  label: string;
  inngestEventId: string | null;
}

interface AutomationRunsTableProps {
  onRunClick: (id: string, type: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
}

/* ------------------------------------------------------------------ */
/*  StatusBadge                                                        */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  let dotColor: string;
  let textColor: string;
  let bgColor: string;
  let label: string;

  if (normalized === "complete" || normalized === "completed") {
    dotColor = "oklch(0.72 0.17 142)";
    textColor = "oklch(0.72 0.17 142)";
    bgColor = "oklch(0.72 0.17 142 / 0.1)";
    label = "Completed";
  } else if (normalized === "failed") {
    dotColor = "oklch(0.62 0.19 22)";
    textColor = "oklch(0.62 0.19 22)";
    bgColor = "oklch(0.62 0.19 22 / 0.1)";
    label = "Failed";
  } else {
    dotColor = "oklch(0.75 0.15 85)";
    textColor = "oklch(0.75 0.15 85)";
    bgColor = "oklch(0.75 0.15 85 / 0.1)";
    label = "In Progress";
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: bgColor, color: textColor }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: dotColor }}
      />
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  FunctionIcon                                                       */
/* ------------------------------------------------------------------ */

function FunctionIcon({ functionId }: { functionId: string }) {
  if (functionId === "enrich-prospect") {
    return <Sparkles className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--gold-primary)" }} />;
  }
  return <Clock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-secondary-ds)" }} />;
}

/* ------------------------------------------------------------------ */
/*  Skeleton Rows                                                      */
/* ------------------------------------------------------------------ */

function TableSkeleton() {
  return (
    <>
      {/* Desktop skeleton */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr>
              {["Automation", "Target", "Status", "Duration", "Started"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left text-[11px] font-semibold uppercase tracking-wider px-4 py-3"
                    style={{ color: "var(--text-ghost)" }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-32" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-20 rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-12" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile skeleton */}
      <div className="md:hidden divide-y" style={{ borderColor: "var(--border-subtle)" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function AutomationRunsTable({ onRunClick }: AutomationRunsTableProps) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchRuns() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/automations/runs?limit=20");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setRuns(json.runs ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load runs");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRuns();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      {/* Section header */}
      <div className="space-y-1 mb-4">
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-ghost)" }}
        >
          Recent Runs
        </h2>
        <p className="text-xs" style={{ color: "var(--text-secondary-ds)" }}>
          Last 20 task executions across all automations.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="surface-card rounded-[14px] p-4 text-sm mb-4"
          style={{ color: "oklch(0.62 0.19 22)" }}
        >
          Failed to load recent runs: {error}
        </div>
      )}

      {/* Content */}
      <div className="surface-card rounded-[14px] overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : runs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-secondary-ds)" }}>
              No runs recorded yet.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    className="border-b"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    {["Automation", "Target", "Status", "Duration", "Started"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left text-[11px] font-semibold uppercase tracking-wider px-4 py-3"
                          style={{ color: "var(--text-ghost)" }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run, index) => (
                    <tr
                      key={`${run.functionId}-${run.id}`}
                      className={cn(
                        "cursor-pointer border-b last:border-b-0 row-hover-lift press-effect row-enter"
                      )}
                      style={{
                        borderColor: "var(--border-subtle)",
                        animationDelay: `${Math.min(index * 30, 300)}ms`,
                      }}
                      onClick={() => onRunClick(run.id, run.functionId)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FunctionIcon functionId={run.functionId} />
                          <span
                            className="text-sm font-medium"
                            style={{ color: "var(--text-primary-ds)" }}
                          >
                            {run.functionName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-sm"
                          style={{ color: "var(--text-secondary-ds)" }}
                        >
                          {run.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-sm font-mono"
                          style={{ color: "var(--text-secondary-ds)" }}
                        >
                          {run.durationMs != null
                            ? formatDuration(run.durationMs)
                            : "\u2014"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-ghost)" }}
                        >
                          {relativeTime(run.startedAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card layout */}
            <div
              className="md:hidden divide-y"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {runs.map((run, index) => (
                <div
                  key={`mobile-${run.functionId}-${run.id}`}
                  className="p-4 space-y-2 cursor-pointer press-effect row-enter"
                  style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                  onClick={() => onRunClick(run.id, run.functionId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FunctionIcon functionId={run.functionId} />
                      <span
                        className="font-medium text-sm"
                        style={{ color: "var(--text-primary-ds)" }}
                      >
                        {run.functionName}
                      </span>
                    </div>
                    <StatusBadge status={run.status} />
                  </div>
                  <div
                    className="flex items-center justify-between text-xs"
                    style={{ color: "var(--text-secondary-ds)" }}
                  >
                    <span>{run.label}</span>
                    <span className="font-mono">
                      {run.durationMs != null
                        ? formatDuration(run.durationMs)
                        : "\u2014"}
                    </span>
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--text-ghost)" }}
                  >
                    {relativeTime(run.startedAt)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
