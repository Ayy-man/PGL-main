import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { ReportsTable, OverdueClosedList, type OverdueClosedRow } from "./reports-table";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; tenant?: string }>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const initialStatus = params.status ?? "open";

  const admin = createAdminClient();
  const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Parallelize both queries — they don't depend on each other and we already have the
  // admin client. Overdue-closed renders dimmed above the main table as a review queue.
  const [reportsResult, overdueResult] = await Promise.all([
    admin
      .from("issue_reports")
      .select(
        `
          id, category, description, status, target_type, target_id, target_snapshot,
          screenshot_path, page_path, created_at,
          tenants:tenant_id ( id, name, slug ),
          users:user_id ( id, email, full_name )
        `
      )
      .eq("status", initialStatus)
      .order("created_at", { ascending: false })
      .limit(25),
    admin
      .from("issue_reports")
      .select(
        `
          id, category, description, status, target_type, target_id, target_snapshot,
          screenshot_path, page_path, created_at, resolved_at,
          tenants:tenant_id ( id, name, slug ),
          users:user_id ( id, email, full_name )
        `
      )
      .in("status", ["resolved", "wontfix", "duplicate"])
      .lt("resolved_at", thirtyDaysAgoIso)
      .order("resolved_at", { ascending: true })
      .limit(25),
  ]);

  const reports = reportsResult.data;
  const overdueClosed = (overdueResult.data ?? []) as unknown as OverdueClosedRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="font-serif text-3xl font-bold tracking-tight"
          style={{ color: "var(--text-primary-ds)" }}
        >
          Issue Reports
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary-ds)" }}>
          Tenant-submitted bug reports and data quality issues across all tenants.
        </p>
      </div>

      {overdueClosed.length > 0 && (
        <section className="space-y-3 opacity-90">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--admin-text-secondary)" }}
            >
              Overdue Closed ({overdueClosed.length})
            </h2>
            <span className="text-xs text-muted-foreground">
              Closed over 30 days ago — review for archival
            </span>
          </div>
          <OverdueClosedList reports={overdueClosed} />
        </section>
      )}

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ReportsTable initialReports={(reports ?? []) as any} initialStatus={initialStatus} />
    </div>
  );
}
