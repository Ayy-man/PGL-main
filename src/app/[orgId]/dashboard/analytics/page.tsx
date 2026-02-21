"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DateRangeFilter } from "@/components/charts/date-range-filter";
import { MetricsCards } from "@/components/charts/metrics-cards";
import { UsageChart } from "@/components/charts/usage-chart";

type DateRange = "7d" | "30d" | "90d";

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
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to fetch analytics");
        }
        const json = await res.json();
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
          <p className="mt-1 text-muted-foreground">
            Usage metrics for your team
          </p>
        </div>
        <DateRangeFilter
          selectedRange={dateRange}
          onRangeChange={setDateRange}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border bg-card"
              />
            ))}
          </div>
          <div className="h-[400px] animate-pulse rounded-xl border bg-card" />
        </div>
      ) : data ? (
        <>
          <MetricsCards totals={data.totals} />
          <UsageChart data={data.daily} />

          {data.userBreakdown && data.userBreakdown.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 font-serif text-xl font-semibold">
                Team Breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Searches</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile Views</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enrichments</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.userBreakdown.map((user) => (
                      <tr
                        key={user.userId}
                        className="border-b last:border-0 transition-colors hover:bg-muted/50"
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
