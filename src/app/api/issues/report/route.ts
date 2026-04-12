import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

const issuePayloadSchema = z.object({
  category: z.enum([
    "incorrect_data",
    "missing_data",
    "bad_source",
    "bug",
    "other",
  ]),
  description: z.string().min(1).max(5000),
  page_url: z.string().url(),
  page_path: z.string().min(1),
  user_agent: z.string().optional(),
  viewport: z
    .object({ w: z.number(), h: z.number() })
    .optional(),
  target_type: z
    .enum(["prospect", "list", "persona", "search", "none"])
    .optional(),
  target_id: z.string().uuid().optional(),
  target_snapshot: z.record(z.string(), z.unknown()).optional(),
});

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_SCREENSHOT_TYPES = ["image/png", "image/jpeg"];

export async function POST(request: Request) {
  try {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("[issue-report] Auth failed:", userError?.message);
    return NextResponse.json({ error: "Unauthorized", details: userError?.message }, { status: 401 });
  }
  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 403 });
  }

  // Parse multipart/form-data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart body" },
      { status: 400 }
    );
  }

  const payloadRaw = formData.get("payload");
  if (typeof payloadRaw !== "string" || !payloadRaw) {
    return NextResponse.json(
      { error: "Missing payload field" },
      { status: 400 }
    );
  }

  let payloadParsed: unknown;
  try {
    payloadParsed = JSON.parse(payloadRaw);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const validation = issuePayloadSchema.safeParse(payloadParsed);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: validation.error.issues,
      },
      { status: 400 }
    );
  }
  const payload = validation.data;

  // Validate optional screenshot file
  const screenshotField = formData.get("screenshot");
  const screenshot =
    screenshotField && typeof screenshotField !== "string"
      ? (screenshotField as File)
      : null;

  if (screenshot) {
    if (screenshot.size > MAX_SCREENSHOT_BYTES) {
      return NextResponse.json(
        { error: "Screenshot exceeds 5MB" },
        { status: 400 }
      );
    }
    if (!ALLOWED_SCREENSHOT_TYPES.includes(screenshot.type)) {
      return NextResponse.json(
        { error: "Screenshot must be PNG or JPEG" },
        { status: 400 }
      );
    }
  }

  // Generate the ID client-side so we don't need .select("id") after insert.
  // Supabase .insert().select() requires SELECT permission, but tenants have
  // INSERT-only RLS (no SELECT policy). Using crypto.randomUUID() avoids this.
  const reportId = crypto.randomUUID();

  const insertRow = {
    id: reportId,
    tenant_id: tenantId,
    user_id: user.id,
    category: payload.category,
    description: payload.description,
    page_url: payload.page_url,
    page_path: payload.page_path,
    user_agent: payload.user_agent ?? null,
    viewport: payload.viewport ?? null,
    target_type: payload.target_type ?? "none",
    target_id: payload.target_id ?? null,
    target_snapshot: payload.target_snapshot ?? null,
    screenshot_path: null,
  };

  const { error: insertError } = await supabase
    .from("issue_reports")
    .insert(insertRow);

  if (insertError) {
    console.error("[issue-report] INSERT failed:", {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      tenantId,
      userId: user.id,
      category: payload.category,
    });
    return NextResponse.json(
      { error: "Failed to create report", details: insertError.message, code: insertError.code },
      { status: 500 }
    );
  }

  // Upload screenshot if provided; fall back to null on failure
  let screenshotPath: string | null = null;
  if (screenshot) {
    try {
      const ext = screenshot.type === "image/jpeg" ? "jpg" : "png";
      const path = `${tenantId}/${reportId}.${ext}`;
      const arrayBuffer = await screenshot.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("issue-reports")
        .upload(path, arrayBuffer, {
          contentType: screenshot.type || "image/jpeg",
          upsert: false,
        });
      if (!uploadError) {
        screenshotPath = path;
        // Use admin client for UPDATE — tenant has INSERT-only RLS, no UPDATE policy
        const admin = createAdminClient();
        await admin
          .from("issue_reports")
          .update({ screenshot_path: path })
          .eq("id", reportId);
      }
    } catch {
      // swallow — screenshot is optional, report already inserted
    }
  }

  // Fire-and-forget activity log (must NOT block response)
  logActivity({
    tenantId,
    userId: user.id,
    actionType: "issue_reported",
    targetType: "issue_report",
    targetId: reportId,
    metadata: { category: payload.category, screenshot: screenshotPath !== null },
  }).catch(() => {
    /* ignore */
  });

  return NextResponse.json({ id: reportId }, { status: 201 });
  } catch (err) {
    console.error("[issue-report] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
