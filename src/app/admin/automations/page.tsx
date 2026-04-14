"use client";

import { useEffect, useState, useCallback } from "react";
import { AutomationsSummary } from "@/components/admin/automations-summary";
import { AutomationHealthCard } from "@/components/admin/automation-health-card";
import { AutomationRunsTable } from "@/components/admin/automation-runs-table";
import { AutomationDetailDrawer } from "@/components/admin/automation-detail-drawer";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SummaryData {
  totalAutomations: number;
  activeSchedules: number;
  runs24h: number;
  failures24h: number;
  successRate: number;
}

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

interface AutomationsData {
  summary: SummaryData;
  functions: AutomationFunction[];
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AutomationsPage() {
  const [data, setData] = useState<AutomationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Drawer state */
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRunType, setSelectedRunType] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ---- fetch ---- */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/automations");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: AutomationsData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  /* Initial load */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* 60-second polling — pauses when tab hidden */
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchData();
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  /* ---- handlers ---- */
  const handleRunClick = useCallback((id: string, type: string) => {
    setSelectedRunId(id);
    setSelectedRunType(type);
    setDrawerOpen(true);
  }, []);

  /* ---- render ---- */
  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl md:text-2xl font-semibold" style={{ color: "var(--text-primary-ds)" }}>
            Automations
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary-ds)" }}>
            Monitor background task health, schedule status, and recent run history.
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={fetchData}
              className={cn(
                "p-2 rounded-[8px] transition-colors duration-200 text-[var(--text-secondary-ds)]",
                "hover:text-[var(--gold-primary)] hover:bg-[var(--gold-bg)]",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold-primary)]/40"
              )}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="rounded-[8px] border px-4 py-3 text-sm"
          style={{ color: "oklch(0.62 0.19 22)", borderColor: "oklch(0.62 0.19 22)" }}
        >
          Failed to load automations data: {error}
        </div>
      )}

      {/* Summary Stat Cards */}
      <AutomationsSummary data={data?.summary} loading={loading && !data} />

      {/* Automation Health Cards */}
      <div>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-1"
          style={{ color: "var(--text-ghost)" }}
        >
          Task Health
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--text-secondary-ds)" }}>
          Status and performance of each background automation task.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading && !data
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="surface-card rounded-[14px] p-4 md:p-6">
                  <Skeleton className="h-4 w-40 mb-3" />
                  <Skeleton className="h-3 w-full mb-3" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))
            : data?.functions.map((fn) => (
                <AutomationHealthCard key={fn.id} function={fn} />
              ))}
        </div>
      </div>

      {/* Recent Runs Table */}
      <AutomationRunsTable onRunClick={handleRunClick} />

      {/* Detail Drawer */}
      <AutomationDetailDrawer
        runId={selectedRunId}
        runType={selectedRunType}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
