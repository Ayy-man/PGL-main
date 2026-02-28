import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sparkles, History, Download } from "lucide-react";
import { getPersonas } from "@/lib/personas/queries";
import { getLists } from "@/lib/lists/queries";
import { DashboardStatCards } from "@/components/dashboard/dashboard-stat-cards";
import { PersonaPillRow } from "@/components/dashboard/persona-pill-row";
import { RecentExportsTable } from "@/components/dashboard/recent-exports-table";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import type { ActivityLogEntry } from "@/lib/activity-logger";

export default async function TenantDashboard({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const tenantId = user.app_metadata?.tenant_id as string;
  const role = user.app_metadata?.role as string;
  const isAdmin = role === "tenant_admin" || role === "super_admin";

  // --- Date ranges ---
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startDateStr = sevenDaysAgo.toISOString().split("T")[0];
  const endDateStr = now.toISOString().split("T")[0];

  const twentyFourHoursAgo = new Date(
    now.getTime() - 24 * 60 * 60 * 1000
  ).toISOString();

  // --- Parallel data fetching ---
  const fetchPromises: [
    Promise<Awaited<ReturnType<typeof getPersonas>>>,
    Promise<Awaited<ReturnType<typeof getLists>>>,
    Promise<{ count: number | null } | null>,
    Promise<{
      totalLogins: number;
      searchesExecuted: number;
      profilesViewed: number;
      profilesEnriched: number;
      csvExports: number;
      listsCreated: number;
    } | null>,
    Promise<ActivityLogEntry[]>,
  ] = [
    getPersonas(tenantId).catch(() => []),
    getLists(tenantId).catch(() => []),
    // New prospects count (last 24h)
    (async () => {
      try {
        const { count } = await supabase
          .from("prospects")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte("created_at", twentyFourHoursAgo);
        return { count };
      } catch {
        return null;
      }
    })(),
    // Analytics totals (admin-only, 7d)
    isAdmin
      ? (async () => {
          try {
            const { data: metrics } = await supabase
              .from("usage_metrics_daily")
              .select("*")
              .eq("tenant_id", tenantId)
              .gte("date", startDateStr)
              .lte("date", endDateStr);
            if (!metrics || metrics.length === 0) {
              return {
                totalLogins: 0,
                searchesExecuted: 0,
                profilesViewed: 0,
                profilesEnriched: 0,
                csvExports: 0,
                listsCreated: 0,
              };
            }
            const totals = {
              totalLogins: 0,
              searchesExecuted: 0,
              profilesViewed: 0,
              profilesEnriched: 0,
              csvExports: 0,
              listsCreated: 0,
            };
            for (const m of metrics) {
              totals.totalLogins += m.total_logins || 0;
              totals.searchesExecuted += m.searches_executed || 0;
              totals.profilesViewed += m.profiles_viewed || 0;
              totals.profilesEnriched += m.profiles_enriched || 0;
              totals.csvExports += m.csv_exports || 0;
              totals.listsCreated += m.lists_created || 0;
            }
            return totals;
          } catch {
            return null;
          }
        })()
      : Promise.resolve(null),
    // Recent exports (last 5 csv_exported entries)
    (async () => {
      try {
        const { data } = await supabase
          .from("activity_log")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("action_type", "csv_exported")
          .order("created_at", { ascending: false })
          .limit(5);
        return (data as ActivityLogEntry[]) ?? [];
      } catch {
        return [];
      }
    })(),
  ];

  const [personas, lists, newProspectsResult, analyticsTotals, recentExports] =
    await Promise.all(fetchPromises);
  const newProspectsCount = newProspectsResult?.count ?? 0;

  // Resolve user names for export entries
  const userMap: Record<string, string> = {};
  const uniqueUserIds = Array.from(
    new Set(recentExports.map((e) => e.user_id))
  );
  if (uniqueUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, first_name, last_name")
      .in("id", uniqueUserIds);
    if (profiles) {
      for (const p of profiles) {
        const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
        userMap[p.id] = name || p.id.slice(0, 8);
      }
    }
  }

  // Compute derived stats
  const totalExports = analyticsTotals?.csvExports ?? 0;
  const downloadsReady = lists.reduce(
    (sum, l) => sum + (l.member_count ?? 0),
    0
  );
  const profilesViewed = analyticsTotals?.profilesViewed ?? 0;
  const profilesEnriched = analyticsTotals?.profilesEnriched ?? 0;
  const enrichmentRate =
    profilesViewed > 0
      ? Math.round((profilesEnriched / profilesViewed) * 100)
      : 0;

  return (
    <div className="page-enter space-y-8">
      {/* New prospects alert banner */}
      {newProspectsCount > 0 && (
        <div
          className="flex items-center gap-3 rounded-[14px] px-5 py-3"
          style={{
            background: "var(--gold-bg-strong)",
            border: "1px solid var(--border-gold)",
          }}
        >
          <Sparkles
            className="h-4 w-4 shrink-0"
            style={{ color: "var(--gold-primary)" }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: "var(--gold-primary)" }}
          >
            {newProspectsCount} new{" "}
            {newProspectsCount === 1 ? "prospect" : "prospects"} found in the
            last 24h
          </p>
          <Link
            href={`/${orgId}/search`}
            className="ml-auto text-xs underline cursor-pointer"
            style={{ color: "var(--gold-text)" }}
          >
            View
          </Link>
        </div>
      )}

      {/* Title row with action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1
            className="font-serif font-semibold"
            style={{
              fontSize: "38px",
              letterSpacing: "-0.5px",
              color: "var(--text-primary)",
            }}
          >
            Executive Strategy Dashboard
          </h1>
          <p
            className="mt-1 text-xs uppercase tracking-[1.5px] font-semibold"
            style={{ color: "var(--text-tertiary)" }}
          >
            UHNW Lead Scraping & Export Management
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/${orgId}/exports`}
            className="ghost-hover inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-medium cursor-pointer transition-colors"
            style={{
              border: "1px solid var(--border-default)",
              color: "var(--text-secondary)",
            }}
          >
            <History className="h-4 w-4" />
            Export History
          </Link>
          <Link
            href={`/${orgId}/search`}
            className="card-interactive inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-semibold cursor-pointer transition-colors"
            style={{
              background: "var(--gold-primary)",
              color: "var(--bg-primary)",
            }}
          >
            <Download className="h-4 w-4" />
            Download New List
          </Link>
        </div>
      </div>

      {/* Stat cards (admin-only) */}
      {isAdmin && analyticsTotals && (
        <DashboardStatCards
          totalExports={totalExports}
          downloadsReady={downloadsReady}
          enrichmentRate={enrichmentRate}
        />
      )}

      {/* Two-column layout: Recent Exports + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Exports table (2/3 width) */}
        <div className="lg:col-span-2">
          <RecentExportsTable
            exports={recentExports}
            userMap={userMap}
            orgId={orgId}
          />
        </div>

        {/* Activity Feed (1/3 width) */}
        {isAdmin && (
          <div className="surface-card rounded-[14px] p-5">
            <ActivityFeed />
          </div>
        )}
      </div>

      {/* Persona pill row (all roles) */}
      <PersonaPillRow personas={personas} orgId={orgId} />
    </div>
  );
}
