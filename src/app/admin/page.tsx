"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PlatformPulse } from "@/components/admin/platform-pulse";
import { TenantHeatmap } from "@/components/admin/tenant-heatmap";
import { EnrichmentHealthChart } from "@/components/admin/enrichment-health-chart";
import { FunnelChart as FunnelChartComponent } from "@/components/admin/funnel-chart";
import { ErrorFeed } from "@/components/admin/error-feed";
import { RefreshCw } from "lucide-react";

// --- Types ---

interface PulseData {
  totalProspects: number;
  enrichmentCoverage: number;
  enrichmentFailed: number;
  activeUsersToday: number;
  activeUsers7dAvg: number;
}

interface HeatmapData {
  tenants: Array<{
    id: string;
    name: string;
    userCount: number;
    searches7d: number;
    enrichments7d: number;
    exports7d: number;
    lastActive: string | null;
    users: Array<{
      id: string;
      fullName: string;
      searches7d: number;
      enrichments7d: number;
      exports7d: number;
    }>;
  }>;
}

interface EnrichmentDataPoint {
  date: string;
  contactout_success: number;
  contactout_failed: number;
  exa_success: number;
  exa_failed: number;
  edgar_success: number;
  edgar_failed: number;
  claude_success: number;
  claude_failed: number;
}

interface FunnelDataPoint {
  stage: string;
  value: number;
}

interface ErrorData {
  data: Array<{
    id: string;
    fullName: string;
    userName: string;
    tenantName: string;
    tenantId: string;
    enrichmentStatus: string;
    sourceDetails: Record<string, { status: string; error?: string; at?: string }>;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

// --- Helpers ---

function formatSecondsAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return minutes === 1 ? "1 min ago" : `${minutes} min ago`;
}

// --- Page Component ---

export default function AdminDashboard() {
  const [pulseData, setPulseData] = useState<PulseData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentDataPoint[] | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelDataPoint[] | null>(null);
  const [errorData, setErrorData] = useState<ErrorData | null>(null);
  const [quotaData, setQuotaData] = useState<{ totals: Record<string, number>; days: number } | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorPage, setErrorPage] = useState(1);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const errorPageRef = useRef(errorPage);
  errorPageRef.current = errorPage;

  const fetchAll = useCallback(async (isBackground: boolean) => {
    if (isBackground) {
      setIsRefreshing(true);
    }

    try {
      const [pulseRes, heatmapRes, enrichmentRes, funnelRes, errorRes, quotaRes] =
        await Promise.all([
          fetch("/api/admin/dashboard"),
          fetch("/api/admin/tenants/activity"),
          fetch("/api/admin/enrichment/health?days=14"),
          fetch("/api/admin/funnel?days=7"),
          fetch(`/api/admin/errors?limit=50&page=${errorPageRef.current}`),
          fetch("/api/admin/quota?days=7"),
        ]);

      const [pulse, heatmap, enrichment, funnel, errors, quota] = await Promise.all([
        pulseRes.ok ? pulseRes.json() : null,
        heatmapRes.ok ? heatmapRes.json() : null,
        enrichmentRes.ok ? enrichmentRes.json() : null,
        funnelRes.ok ? funnelRes.json() : null,
        errorRes.ok ? errorRes.json() : null,
        quotaRes.ok ? quotaRes.json() : null,
      ]);

      if (pulse) setPulseData(pulse);
      if (heatmap) setHeatmapData(heatmap);
      if (quota) setQuotaData(quota);
      setEnrichmentData(enrichment?.data ?? []);
      setFunnelData(funnel?.data ?? []);
      setErrorData(errors ?? { data: [], total: 0, page: 1, limit: 50 });

      setLastFetched(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  // 60-second background polling
  useEffect(() => {
    const interval = setInterval(() => fetchAll(true), 60_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // "Updated X seconds ago" ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      if (lastFetched) {
        setSecondsAgo(Math.floor((Date.now() - lastFetched.getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(ticker);
  }, [lastFetched]);

  // Error feed pagination
  const handleErrorPageChange = useCallback(async (page: number) => {
    setErrorPage(page);
    try {
      const res = await fetch(`/api/admin/errors?limit=50&page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setErrorData(data);
      }
    } catch {
      // Silently fail — existing data remains visible
    }
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium tracking-tight" style={{ fontSize: "38px", letterSpacing: "-0.5px" }}>
            Platform Health
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--admin-text-secondary)" }}>
            Real-time platform monitoring
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {isRefreshing && (
            <RefreshCw
              className="h-4 w-4 animate-spin"
              style={{ color: "var(--gold-primary)" }}
            />
          )}
          {lastFetched && (
            <span>Updated {formatSecondsAgo(secondsAgo)}</span>
          )}
        </div>
      </div>

      {/* Section 1: Platform Pulse */}
      <PlatformPulse data={pulseData} quotaData={quotaData} />

      {/* Section 2: Tenant Activity Heatmap */}
      <section>
        <h2 className="font-serif text-xl font-semibold mb-4 admin-section-heading">
          Tenant Activity
        </h2>
        <TenantHeatmap data={heatmapData} />
      </section>

      {/* Section 3: Graphs (2-up layout) */}
      <section>
        <h2 className="font-serif text-xl font-semibold mb-4 admin-section-heading">
          Pipeline Analytics
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <EnrichmentHealthChart data={enrichmentData} />
          <FunnelChartComponent data={funnelData} />
        </div>
      </section>

      {/* Section 4: Error/Failure Feed */}
      <section>
        <h2 className="font-serif text-xl font-semibold mb-4 admin-section-heading">
          Recent Failures
        </h2>
        <ErrorFeed data={errorData} onPageChange={handleErrorPageChange} />
      </section>
    </div>
  );
}
