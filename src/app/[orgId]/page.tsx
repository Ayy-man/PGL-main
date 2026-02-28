import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import { getPersonas } from "@/lib/personas/queries";
import { getLists } from "@/lib/lists/queries";
import { StatPills } from "@/components/dashboard/stat-pills";
import { PersonaPillRow } from "@/components/dashboard/persona-pill-row";
import { RecentListsPreview } from "@/components/dashboard/recent-lists-preview";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

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

  const firstName =
    user.user_metadata?.first_name || user.email?.split("@")[0] || "there";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // --- Parallel data fetching ---
  // Calculate 7d date range for analytics
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startDateStr = sevenDaysAgo.toISOString().split("T")[0];
  const endDateStr = now.toISOString().split("T")[0];

  // Calculate 24h ago for new prospects banner
  const twentyFourHoursAgo = new Date(
    now.getTime() - 24 * 60 * 60 * 1000
  ).toISOString();

  // Build parallel fetch array
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
    // Analytics totals (admin-only, 7d) — direct Supabase query, not /api/analytics
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
  ];

  const [personas, lists, newProspectsResult, analyticsTotals] =
    await Promise.all(fetchPromises);
  const newProspectsCount = newProspectsResult?.count ?? 0;

  return (
    <div className="page-enter space-y-8">
      {/* Greeting header */}
      <div>
        <h1
          className="font-serif font-semibold"
          style={{
            fontSize: "38px",
            letterSpacing: "-0.5px",
            color: "var(--text-primary)",
          }}
        >
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{today}</p>
      </div>

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

      {/* Stat pills (admin-only) */}
      {isAdmin && analyticsTotals && <StatPills totals={analyticsTotals} />}

      {/* Search hero — secondary action */}
      <Link
        href={`/${orgId}/search`}
        className="card-interactive group relative flex items-center gap-6 rounded-[14px] p-8 cursor-pointer block"
      >
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] transition-colors"
          style={{
            background: "var(--gold-bg)",
            color: "var(--gold-primary)",
          }}
        >
          <Search className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-serif text-xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Search Prospects
            </span>
            <ArrowRight
              className="h-4 w-4 opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
              style={{ color: "var(--gold-primary)" }}
            />
          </div>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Find high-net-worth buyers matching your personas
          </p>
        </div>
      </Link>

      {/* Persona pill row (all roles) */}
      <PersonaPillRow personas={personas} orgId={orgId} />

      {/* Two-column layout: Recent Lists + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Lists (all roles) */}
        <RecentListsPreview lists={lists} orgId={orgId} />

        {/* Activity Feed (admin-only) */}
        {isAdmin && <ActivityFeed />}
      </div>
    </div>
  );
}
