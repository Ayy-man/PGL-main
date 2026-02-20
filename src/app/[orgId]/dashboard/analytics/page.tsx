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
        <div className="rounded-lg border border-red-900 bg-red-950 p-4 text-red-300">
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
                    <tr className="border-b border text-left text-muted-foreground">
                      <th className="pb-3 pr-4">User</th>
                      <th className="pb-3 pr-4">Searches</th>
                      <th className="pb-3 pr-4">Profile Views</th>
                      <th className="pb-3 pr-4">Enrichments</th>
                      <th className="pb-3">Exports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.userBreakdown.map((user, i) => (
                      <tr
                        key={user.userId}
                        className={i % 2 === 0 ? "bg-card" : "bg-background"}
                      >
                        <td className="py-2 pr-4 font-mono text-xs text-foreground">
                          {user.userId.slice(0, 8)}...
                        </td>
                        <td className="py-2 pr-4 text-foreground">
                          {user.searchesExecuted}
                        </td>
                        <td className="py-2 pr-4 text-foreground">
                          {user.profilesViewed}
                        </td>
                        <td className="py-2 pr-4 text-foreground">
                          {user.profilesEnriched}
                        </td>
                        <td className="py-2 text-foreground">
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
