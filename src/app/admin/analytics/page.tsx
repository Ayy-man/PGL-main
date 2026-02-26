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
}

interface Tenant {
  id: string;
  name: string;
}

export default function SuperAdminAnalyticsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAccessAndLoadTenants() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      if (user.app_metadata?.role !== "super_admin") {
        router.push("/dashboard");
        return;
      }
      // Fetch tenants for filter dropdown
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id, name")
        .order("name");
      if (tenantData) setTenants(tenantData);
    }
    checkAccessAndLoadTenants();
  }, [router]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ range: dateRange });
        if (selectedTenant) params.set("tenant_id", selectedTenant);
        const res = await fetch(`/api/analytics?${params.toString()}`);
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
  }, [dateRange, selectedTenant]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Platform Analytics
          </h1>
          <p className="mt-1 text-muted-foreground">
            Cross-tenant usage metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="rounded-md border bg-muted px-3 py-1.5 text-sm text-foreground focus:border-gold focus:outline-none"
          >
            <option value="">All Tenants</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <DateRangeFilter
            selectedRange={dateRange}
            onRangeChange={setDateRange}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-[8px] border border-destructive/30 bg-destructive/10 p-4 text-destructive">
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
        </>
      ) : null}
    </div>
  );
}
