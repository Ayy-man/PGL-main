import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { ReportsTable } from "./reports-table";

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
  const { data: reports } = await admin
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
    .limit(25);

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
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ReportsTable initialReports={(reports ?? []) as any} initialStatus={initialStatus} />
    </div>
  );
}
