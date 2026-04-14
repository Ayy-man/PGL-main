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

  // Phase 38: fetch events for consumers of this endpoint (ASC order, joined actor).
  // NOTE: viewed_by_admin and screenshot_expired writes live in the page.tsx server
  // loader (Plan 03 Task 2), NOT here — the admin UI does not call this GET, so
  // writes here would never fire on a real page visit.
  const { data: events } = await admin
    .from("issue_report_events")
    .select(`
      id, report_id, event_type, actor_user_id, actor_role,
      from_status, to_status, note, created_at,
      actor:actor_user_id ( id, email, full_name )
    `)
    .eq("report_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ report, screenshotUrl, events: events ?? [] });
}

const CLOSED_STATUSES: readonly string[] = ["resolved", "wontfix", "duplicate"];

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

  const admin = createAdminClient();

  // Fetch current row so we can diff and capture from_status/current note.
  const { data: current, error: readErr } = await admin
    .from("issue_reports")
    .select("id, status, admin_notes")
    .eq("id", id)
    .single();

  if (readErr || !current) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Normalize incoming values — treat undefined as "no change".
  const nextStatus: Status = (body.status ?? current.status) as Status;
  const nextNotes: string | null =
    body.admin_notes !== undefined ? body.admin_notes : current.admin_notes;

  // Close-requires-note guard (server-side source of truth).
  const notesEmpty = !nextNotes || nextNotes.trim().length === 0;
  const isClosing = CLOSED_STATUSES.includes(nextStatus) && (body.status !== undefined || body.admin_notes !== undefined);
  const wasAlreadyClosed = CLOSED_STATUSES.includes(current.status);
  if (isClosing && notesEmpty && !(wasAlreadyClosed && body.status === undefined)) {
    // Block the close if: target is a closed status AND notes are empty AND this is not a no-op PATCH that leaves the row untouched.
    return NextResponse.json(
      { error: "A note is required when closing an issue" },
      { status: 400 }
    );
  }

  // Validate status enum if provided.
  if (body.status !== undefined && !(VALID_STATUSES as readonly string[]).includes(body.status as string)) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  // Build the update payload.
  const update: Record<string, unknown> = {};
  const statusChanged = body.status !== undefined && body.status !== current.status;
  const notesChanged = body.admin_notes !== undefined && body.admin_notes !== current.admin_notes;

  if (body.status !== undefined) {
    update.status = body.status;
    // Reopen: transitioning FROM a closed status TO a non-closed status — clear resolution metadata.
    // Covers reopen from resolved/wontfix/duplicate back to open/investigating regardless of which
    // closed status was set. Evaluated before the resolve branch since the two are mutually exclusive.
    if (
      CLOSED_STATUSES.includes(current.status) &&
      !CLOSED_STATUSES.includes(body.status as string)
    ) {
      update.resolved_by = null;
      update.resolved_at = null;
    } else if (body.status === "resolved" && current.status !== "resolved") {
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

  // Append audit event(s). status_changed takes precedence over note_added when both happen.
  // Capture the newly-inserted event with actor join so the client can optimistically prepend
  // it to the timeline without a second roundtrip.
  let newEvent: unknown = null;
  try {
    if (statusChanged) {
      const { data: inserted } = await admin
        .from("issue_report_events")
        .insert({
          report_id: id,
          event_type: "status_changed",
          actor_user_id: user.id,
          actor_role: "admin",
          from_status: current.status,
          to_status: body.status,
          // Capture the current (post-update) note so triage history reads naturally.
          note: nextNotes && nextNotes.trim().length > 0 ? nextNotes : null,
        })
        .select("*, actor:actor_user_id (id, email, full_name)")
        .single();
      newEvent = inserted;
    } else if (notesChanged) {
      const { data: inserted } = await admin
        .from("issue_report_events")
        .insert({
          report_id: id,
          event_type: "note_added",
          actor_user_id: user.id,
          actor_role: "admin",
          note: nextNotes && nextNotes.trim().length > 0 ? nextNotes : null,
        })
        .select("*, actor:actor_user_id (id, email, full_name)")
        .single();
      newEvent = inserted;
    }
  } catch (err) {
    console.error("[admin-reports] failed to append event:", err);
    // Do not fail the request — the row update already succeeded.
  }

  return NextResponse.json({ report: data, event: newEvent });
}
