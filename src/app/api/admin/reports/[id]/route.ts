import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["open", "investigating", "resolved", "wontfix", "duplicate"] as const;
type Status = (typeof VALID_STATUSES)[number];

async function getSuperAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "super_admin") {
    return { ok: false as const, user: null };
  }
  return { ok: true as const, user };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await getSuperAdminUser();
  if (!gate.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
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
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Generate signed URL for screenshot if path is set (60-minute TTL)
  let screenshotUrl: string | null = null;
  if (report.screenshot_path) {
    const { data: signedData } = await admin.storage
      .from("issue-reports")
      .createSignedUrl(report.screenshot_path, 3600);
    screenshotUrl = signedData?.signedUrl ?? null;
  }

  return NextResponse.json({ report, screenshotUrl });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await getSuperAdminUser();
  if (!gate.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const user = gate.user;

  let body: { status?: Status; admin_notes?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!(VALID_STATUSES as readonly string[]).includes(body.status as string)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }
    update.status = body.status;
    // Auto-populate resolved_by and resolved_at on transition to "resolved"
    if (body.status === "resolved") {
      update.resolved_by = user.id;
      update.resolved_at = new Date().toISOString();
    }
  }

  if (body.admin_notes !== undefined) {
    update.admin_notes = body.admin_notes;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("issue_reports")
    .update(update)
    .eq("id", id)
    .select("id, status, admin_notes, resolved_by, resolved_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to update report", details: error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ report: data });
}
