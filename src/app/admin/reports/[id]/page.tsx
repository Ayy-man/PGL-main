import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { ReportDetail } from "./report-detail";

export const dynamic = "force-dynamic";

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;

  const admin = createAdminClient();
  const { data: report, error } = await admin
    .from("issue_reports")
    .select(
      `
        *,
        tenants:tenant_id ( id, name, slug ),
        users:user_id ( id, email, full_name ),
        resolver:resolved_by ( id, email, full_name )
      `
    )
    .eq("id", id)
    .single();

  if (error || !report) {
    notFound();
  }

  // Generate signed URL for screenshot server-side (60-minute TTL)
  let screenshotUrl: string | null = null;
  if (report.screenshot_path) {
    const { data: signedData } = await admin.storage
      .from("issue-reports")
      .createSignedUrl(report.screenshot_path, 3600);
    screenshotUrl = signedData?.signedUrl ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ReportDetail report={report as any} screenshotUrl={screenshotUrl} />;
}
