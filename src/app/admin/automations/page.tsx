"use client";

import { useEffect, useState, useCallback } from "react";
import { AutomationsSummary } from "@/components/admin/automations-summary";
import { AutomationHealthCard } from "@/components/admin/automation-health-card";
import { AutomationRunsTable } from "@/components/admin/automation-runs-table";
import { AutomationDetailDrawer } from "@/components/admin/automation-detail-drawer";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const [refreshHovered, setRefreshHovered] = useState(false);

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

  /* 60-second polling */
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 60_000);
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
        <button
          onClick={fetchData}
          className="p-2 rounded-[8px] transition-colors duration-200"
          style={{
            color: refreshHovered ? "var(--gold-primary)" : "var(--text-secondary-ds)",
            background: refreshHovered ? "var(--gold-bg)" : "transparent",
          }}
          onMouseEnter={() => setRefreshHovered(true)}
          onMouseLeave={() => setRefreshHovered(false)}
          title="Refresh"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="surface-card rounded-[14px] p-4 text-sm"
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
            ? Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="surface-card rounded-[14px] p-4 md:p-6 animate-pulse">
                  <div className="h-4 w-40 bg-white/[0.06] rounded mb-3" />
                  <div className="h-3 w-full bg-white/[0.06] rounded mb-3" />
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-white/[0.06] rounded" />
                    <div className="h-3 w-full bg-white/[0.06] rounded" />
                    <div className="h-3 w-full bg-white/[0.06] rounded" />
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
