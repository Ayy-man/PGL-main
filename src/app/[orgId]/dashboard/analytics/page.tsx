"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MetricsCards } from "@/components/charts/metrics-cards";
import { UsageChart } from "@/components/charts/usage-chart";

type DateRange = "7d" | "30d" | "90d";

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

interface AnalyticsData {
  daily: Array<{
    date: string;
    searchesExecuted: number;
    profilesViewed: number;
    profilesEnriched: number;
    csvExports: number;
  }>;
  totals: {
    totalLogins: number;
    searchesExecuted: number;
    profilesViewed: number;
    profilesEnriched: number;
    csvExports: number;
    listsCreated: number;
  };
  userBreakdown?: Array<{
    userId: string;
    searchesExecuted: number;
    profilesViewed: number;
    profilesEnriched: number;
    csvExports: number;
  }>;
}

export default function TenantAnalyticsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const role = user.app_metadata?.role;
      if (role !== "tenant_admin" && role !== "super_admin") {
        router.push("/dashboard");
      }
    }
    checkAccess();
  }, [router]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/analytics?range=${dateRange}`);
        const text = await res.text();
        let json: { data: AnalyticsData } | null = null;
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
        if (!res.ok || !json) {
          throw new Error("Failed to fetch analytics");
        }
        setData(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateRange]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Team Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Usage metrics for your team
          </p>
        </div>

        {/* Period toggle — segmented control with gold active state */}
        <div
          className="inline-flex rounded-md p-0.5"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {DATE_RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDateRange(value)}
              className="px-3 py-1.5 text-sm font-medium rounded-sm transition-all duration-150 cursor-pointer"
              style={
                dateRange === value
                  ? {
                      background: "var(--gold-bg-strong)",
                      color: "var(--gold-primary)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    }
                  : { color: "rgba(232,228,220,0.5)" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-[14px]"
                style={{
                  background: "var(--bg-card-gradient)",
                  border: "1px solid var(--border-subtle)",
                }}
              />
            ))}
          </div>
          <div
            className="h-[400px] animate-pulse rounded-[14px]"
            style={{
              background: "var(--bg-card-gradient)",
              border: "1px solid var(--border-subtle)",
            }}
          />
        </div>
      ) : data ? (
        <>
          <MetricsCards totals={data.totals} />

          {/* Chart container with design system surface treatment */}
          <div
            className="rounded-[14px] p-7"
            style={{
              background: "var(--bg-card-gradient)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <h2 className="font-serif text-xl font-semibold mb-6">
              Activity Over Time
            </h2>
            <UsageChart data={data.daily} />
          </div>

          {data.userBreakdown && data.userBreakdown.length > 0 && (
            <div
              className="rounded-[14px] p-7"
              style={{
                background: "var(--bg-card-gradient)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <h2 className="font-serif text-xl font-semibold mb-4">
                Team Breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="text-left"
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    >
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        User
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Searches
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Profile Views
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Enrichments
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Exports
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.userBreakdown.map((user) => (
                      <tr
                        key={user.userId}
                        className="transition-colors"
                        style={{ borderBottom: "1px solid var(--border-subtle)" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background =
                            "rgba(255,255,255,0.02)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background =
                            "transparent";
                        }}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-foreground">
                          {user.userId.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {user.searchesExecuted}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {user.profilesViewed}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {user.profilesEnriched}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {user.csvExports}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
