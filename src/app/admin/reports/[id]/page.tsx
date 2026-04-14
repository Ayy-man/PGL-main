import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import type { IssueReportEventWithActor } from "@/types/database";
import { ReportDetail } from "./report-detail";

export const dynamic = "force-dynamic";

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Path A: requireSuperAdmin returns SessionUser (see src/lib/auth/rbac.ts).
  const adminUser = await requireSuperAdmin();
  const adminUserId = adminUser.id;

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

  // Phase 38 side-effect #1: viewed_by_admin — dedup to one per admin per report per 24h.
  // Writes here (not in the GET API) because the admin UI is a server component that
  // never calls /api/admin/reports/[id]. All writes are fire-and-forget: failures log
  // but must not break the page render.
  if (adminUserId) {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentView } = await admin
        .from("issue_report_events")
        .select("id")
        .eq("report_id", id)
        .eq("actor_user_id", adminUserId)
        .eq("event_type", "viewed_by_admin")
        .gte("created_at", since)
        .limit(1)
        .maybeSingle();
      if (!recentView) {
        await admin.from("issue_report_events").insert({
          report_id: id,
          event_type: "viewed_by_admin",
          actor_user_id: adminUserId,
          actor_role: "admin",
        });
      }
    } catch (err) {
      console.error("[admin-reports] viewed_by_admin write failed:", err);
      // Do not throw — page must still render.
    }
  }

  // Phase 38 side-effect #2: screenshot_expired — fires when a screenshot_path was set
  // but createSignedUrl returned null. Dedup per distinct screenshot_path by storing
  // the path in the event's `note` field and filtering on equality.
  if (report.screenshot_path && !screenshotUrl) {
    try {
      const { data: priorExpired } = await admin
        .from("issue_report_events")
        .select("id")
        .eq("report_id", id)
        .eq("event_type", "screenshot_expired")
        .eq("note", report.screenshot_path)
        .limit(1)
        .maybeSingle();
      if (!priorExpired) {
        await admin.from("issue_report_events").insert({
          report_id: id,
          event_type: "screenshot_expired",
          actor_user_id: null,
          actor_role: "system",
          note: report.screenshot_path, // stash the path here to enable per-path dedup
        });
      }
    } catch (err) {
      console.error("[admin-reports] screenshot_expired write failed:", err);
      // Do not throw — page must still render.
    }
  }

  // Fetch audit events with joined actor for the timeline card.
  const { data: eventsRaw } = await admin
    .from("issue_report_events")
    .select(`
      id, report_id, event_type, actor_user_id, actor_role,
      from_status, to_status, note, created_at,
      actor:actor_user_id ( id, email, full_name )
    `)
    .eq("report_id", id)
    .order("created_at", { ascending: true });

  const events = (eventsRaw ?? []) as unknown as IssueReportEventWithActor[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ReportDetail report={report as any} screenshotUrl={screenshotUrl} events={events} />;
}
