"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  MinusCircle,
  Loader,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SourceBreakdownEntry {
  name: string;
  status: string;
  error: string | null;
  at: string | null;
}

interface ProspectInfo {
  name: string;
  title: string | null;
  company: string | null;
}

interface RunDetail {
  id: string;
  functionId: string;
  functionName: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  sourceBreakdown?: SourceBreakdownEntry[];
  prospect?: ProspectInfo;
  inngestEventId?: string | null;
  inngestRunData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

interface AutomationDetailDrawerProps {
  runId: string | null;
  runType: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function formatTimestamp(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/* ------------------------------------------------------------------ */
/*  StatusBadge                                                        */
/* ------------------------------------------------------------------ */

function StatusBadge({
  status,
  size = "sm",
}: {
  status: string;
  size?: "sm" | "lg";
}) {
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

  const sizeClasses = size === "lg" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses}`}
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
/*  SourceStatusIcon                                                   */
/* ------------------------------------------------------------------ */

function SourceStatusIcon({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "complete" || normalized === "completed") {
    return (
      <CheckCircle
        className="h-4 w-4 flex-shrink-0 mt-0.5"
        style={{ color: "oklch(0.72 0.17 142)" }}
      />
    );
  }
  if (normalized === "failed" || normalized === "error") {
    return (
      <XCircle
        className="h-4 w-4 flex-shrink-0 mt-0.5"
        style={{ color: "oklch(0.62 0.19 22)" }}
      />
    );
  }
  if (normalized === "skipped") {
    return (
      <MinusCircle
        className="h-4 w-4 flex-shrink-0 mt-0.5"
        style={{ color: "var(--text-ghost)" }}
      />
    );
  }
  // pending / in_progress
  return (
    <Loader
      className="h-4 w-4 flex-shrink-0 mt-0.5 animate-spin"
      style={{ color: "oklch(0.75 0.15 85)" }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  TimingField                                                        */
/* ------------------------------------------------------------------ */

function TimingField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: "var(--text-ghost)" }}>
        {label}
      </p>
      <p
        className="text-sm font-medium mt-0.5"
        style={{ color: "var(--text-primary-ds)" }}
      >
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status Banner                                                      */
/* ------------------------------------------------------------------ */

function StatusBanner({ data }: { data: RunDetail }) {
  const normalized = data.status.toLowerCase();
  const isEnrichment = data.functionId === "enrich-prospect";

  let bgColor: string;
  let borderColor: string;
  let titleColor: string;
  let descColor: string;
  let title: string;
  let description: string;

  if (normalized === "failed") {
    bgColor = "oklch(0.62 0.19 22 / 0.08)";
    borderColor = "oklch(0.62 0.19 22 / 0.2)";
    titleColor = "oklch(0.62 0.19 22)";
    descColor = "oklch(0.62 0.19 22 / 0.7)";
    title = "Enrichment failed";
    description = "Check source details below for error information.";
  } else if (normalized === "in_progress" || normalized === "pending") {
    bgColor = "oklch(0.75 0.15 85 / 0.08)";
    borderColor = "oklch(0.75 0.15 85 / 0.2)";
    titleColor = "oklch(0.75 0.15 85)";
    descColor = "oklch(0.75 0.15 85 / 0.7)";
    title = "In progress";
    description = isEnrichment
      ? "Enrichment is currently running."
      : "Aggregation is in progress.";
  } else {
    // complete
    bgColor = "oklch(0.72 0.17 142 / 0.08)";
    borderColor = "oklch(0.72 0.17 142 / 0.2)";
    titleColor = "oklch(0.72 0.17 142)";
    descColor = "oklch(0.72 0.17 142 / 0.7)";

    if (isEnrichment) {
      const failedCount =
        data.sourceBreakdown?.filter(
          (s) => s.status.toLowerCase() === "failed" || s.status.toLowerCase() === "error"
        ).length ?? 0;
      if (failedCount > 0) {
        bgColor = "oklch(0.75 0.15 85 / 0.08)";
        borderColor = "oklch(0.75 0.15 85 / 0.2)";
        titleColor = "oklch(0.75 0.15 85)";
        descColor = "oklch(0.75 0.15 85 / 0.7)";
        title = "Partial enrichment";
        description = `${failedCount} source${failedCount === 1 ? "" : "s"} failed \u2014 see breakdown below.`;
      } else {
        title = "All sources completed";
        description = "Enrichment finished successfully across all sources.";
      }
    } else {
      // cron
      const meta = data.metadata as Record<string, unknown> | null;
      const rowsUpserted = meta?.rowsUpserted;
      const date =
        (meta?.date as string) || data.startedAt?.slice(0, 10) || "\u2014";
      if (rowsUpserted != null) {
        title = `Aggregated ${rowsUpserted} row${Number(rowsUpserted) === 1 ? "" : "s"} for ${date}`;
      } else {
        title = `Aggregation complete for ${date}`;
      }
      description = "Daily metrics aggregation ran successfully.";
    }
  }

  return (
    <div
      className="rounded-[14px] p-4"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      <p className="font-semibold text-sm" style={{ color: titleColor }}>
        {title}
      </p>
      <p className="text-xs mt-1" style={{ color: descColor }}>
        {description}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Drawer Skeleton                                                    */
/* ------------------------------------------------------------------ */

function DrawerSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-20 rounded-full ml-auto" />
      </div>
      <Skeleton className="h-3 w-48 ml-11" />

      {/* Banner */}
      <Skeleton className="h-16 w-full rounded-[14px]" />

      {/* Timing grid */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>

      {/* Source breakdown */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>

      {/* Prospect */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DrawerContent                                                      */
/* ------------------------------------------------------------------ */

function DrawerContent({
  data,
  onOpenChange,
}: {
  data: RunDetail;
  onOpenChange: (open: boolean) => void;
}) {
  const [reEnriching, setReEnriching] = useState(false);
  const [reEnrichResult, setReEnrichResult] = useState<string | null>(null);
  const [backHovered, setBackHovered] = useState(false);
  const [reEnrichHovered, setReEnrichHovered] = useState(false);
  const [inngestHovered, setInngestHovered] = useState(false);

  const handleReEnrich = async () => {
    if (!data.prospect || data.functionId !== "enrich-prospect") return;
    setReEnriching(true);
    setReEnrichResult(null);
    try {
      const res = await fetch(`/api/prospects/${data.id}/enrich`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReEnrichResult("success");
    } catch {
      setReEnrichResult("error");
    } finally {
      setReEnriching(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div
        className="p-4 md:p-6 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded transition-colors"
            style={{
              color: "var(--text-secondary-ds)",
              background: backHovered
                ? "rgba(255,255,255,0.05)"
                : "transparent",
            }}
            onMouseEnter={() => setBackHovered(true)}
            onMouseLeave={() => setBackHovered(false)}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2
            className="font-serif text-lg font-semibold flex-1"
            style={{ color: "var(--text-primary-ds)" }}
          >
            {data.functionName}
          </h2>
          <StatusBadge status={data.status} size="lg" />
        </div>
        <p
          className="text-xs font-mono ml-8"
          style={{ color: "var(--text-ghost)" }}
        >
          {data.id}
        </p>
      </div>

      {/* Scrollable body */}
      <div className="p-4 md:p-6 space-y-4">
        {/* Status Banner */}
        <StatusBanner data={data} />

        {/* Timing Grid */}
        <div
          className="pt-4 border-t"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="grid grid-cols-2 gap-4">
            <TimingField
              label="Created"
              value={formatTimestamp(data.startedAt)}
            />
            <TimingField
              label="Started"
              value={formatTimestamp(data.startedAt)}
            />
            <TimingField
              label="Finished"
              value={
                data.finishedAt ? formatTimestamp(data.finishedAt) : "\u2014"
              }
            />
            <TimingField
              label="Duration"
              value={
                data.durationMs != null
                  ? formatDuration(data.durationMs)
                  : "\u2014"
              }
            />
            <TimingField label="Attempts" value="1" />
          </div>
        </div>

        {/* Source Breakdown (enrichment only) */}
        {data.sourceBreakdown && data.sourceBreakdown.length > 0 && (
          <div
            className="pt-4 border-t space-y-3"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-ghost)" }}
            >
              Source Breakdown
            </h3>
            {data.sourceBreakdown.map((source) => (
              <div
                key={source.name}
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <SourceStatusIcon status={source.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-sm font-medium capitalize"
                      style={{ color: "var(--text-primary-ds)" }}
                    >
                      {source.name}
                    </span>
                    <span
                      className="text-xs capitalize"
                      style={{ color: "var(--text-ghost)" }}
                    >
                      {source.status}
                    </span>
                  </div>
                  {source.error && (
                    <p
                      className="text-xs mt-1 truncate"
                      style={{ color: "oklch(0.62 0.19 22)" }}
                      title={source.error}
                    >
                      {source.error}
                    </p>
                  )}
                  {source.at && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--text-ghost)" }}
                    >
                      {formatTimestamp(source.at)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Prospect Context (enrichment only) */}
        {data.prospect && (
          <div
            className="pt-4 border-t space-y-3"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-ghost)" }}
            >
              Prospect
            </h3>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{
                  background: "var(--gold-bg)",
                  color: "var(--gold-primary)",
                  border: "1px solid var(--border-gold)",
                }}
              >
                {data.prospect.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary-ds)" }}
                >
                  {data.prospect.name || "Unknown"}
                </p>
                {(data.prospect.title || data.prospect.company) && (
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-secondary-ds)" }}
                  >
                    {[data.prospect.title, data.prospect.company]
                      .filter(Boolean)
                      .join(" at ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div
          className="pt-4 border-t flex flex-wrap gap-3"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {data.functionId === "enrich-prospect" && data.prospect && (
            <button
              onClick={handleReEnrich}
              disabled={reEnriching}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: reEnrichHovered
                  ? "var(--gold-bg-strong)"
                  : "var(--gold-bg)",
                color: "var(--gold-primary)",
                border: "1px solid var(--border-gold)",
              }}
              onMouseEnter={() => setReEnrichHovered(true)}
              onMouseLeave={() => setReEnrichHovered(false)}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${reEnriching ? "animate-spin" : ""}`}
              />
              {reEnriching ? "Enriching..." : "Re-enrich"}
            </button>
          )}
          {data.inngestEventId && (
            <a
              href="https://app.inngest.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors"
              style={{
                background: inngestHovered
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(255,255,255,0.05)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary-ds)",
              }}
              onMouseEnter={() => setInngestHovered(true)}
              onMouseLeave={() => setInngestHovered(false)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View in Inngest
            </a>
          )}
        </div>

        {/* Re-enrich feedback */}
        {reEnrichResult === "success" && (
          <div
            className="rounded-lg p-3 text-xs"
            style={{
              background: "oklch(0.72 0.17 142 / 0.08)",
              color: "oklch(0.72 0.17 142)",
            }}
          >
            Re-enrichment triggered successfully. The run will appear in the
            table shortly.
          </div>
        )}
        {reEnrichResult === "error" && (
          <div
            className="rounded-lg p-3 text-xs"
            style={{
              background: "oklch(0.62 0.19 22 / 0.08)",
              color: "oklch(0.62 0.19 22)",
            }}
          >
            Failed to trigger re-enrichment. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Drawer Component                                              */
/* ------------------------------------------------------------------ */

export function AutomationDetailDrawer({
  runId,
  runType,
  open,
  onOpenChange,
}: AutomationDetailDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async (id: string, type: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/automations/runs/${id}?type=${encodeURIComponent(type)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: RunDetail = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load details");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && runId && runType) {
      fetchDetail(runId, runType);
    }
    if (!open) {
      setData(null);
      setError(null);
    }
  }, [open, runId, runType, fetchDetail]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[520px] sm:max-w-[520px] p-0 overflow-hidden flex flex-col"
        style={{
          background: "oklch(0.16 0.01 80)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Run Details</SheetTitle>
          <SheetDescription>Automation run details</SheetDescription>
        </SheetHeader>

        {loading ? (
          <DrawerSkeleton />
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-2">
              <p
                className="text-sm"
                style={{ color: "oklch(0.62 0.19 22)" }}
              >
                {error}
              </p>
              <button
                onClick={() => {
                  if (runId && runType) fetchDetail(runId, runType);
                }}
                className="text-xs underline"
                style={{ color: "var(--text-secondary-ds)" }}
              >
                Retry
              </button>
            </div>
          </div>
        ) : data ? (
          <DrawerContent data={data} onOpenChange={onOpenChange} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
