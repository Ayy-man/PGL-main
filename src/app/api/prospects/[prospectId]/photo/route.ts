import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-logger";

/**
 * POST /api/prospects/[prospectId]/photo
 *
 * Uploads a prospect photo to Supabase Storage (general bucket)
 * and saves the public URL to manual_photo_url on the prospect row.
 *
 * Storage upload uses the admin client (bypasses Storage RLS).
 * DB update uses the user session client (enforced by RLS).
 *
 * Allowed formats: PNG, JPG, WebP (no SVG — security risk).
 * Max size: 2MB.
 */

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ prospectId: string }> }
) {
  try {
    // 1. Authenticate with user session client
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found" },
        { status: 401 }
      );
    }

    // 2. Extract route param
    const { prospectId } = await context.params;

    // 3. Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid form data" },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 }
      );
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 2MB limit" },
        { status: 400 }
      );
    }

    // 5. Validate MIME type (SVG excluded — can contain scripts)
    if (
      !ALLOWED_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_MIME_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, WebP" },
        { status: 400 }
      );
    }

    // 6. Build storage path
    const ext = MIME_TO_EXT[file.type];
    const storagePath = `prospect-photos/${prospectId}.${ext}`;

    // 7. Upload to Supabase Storage with admin client
    const admin = createAdminClient();
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await admin.storage
      .from("general")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Prospect photo upload failed:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload photo" },
        { status: 500 }
      );
    }

    // 8. Get public URL
    const {
      data: { publicUrl },
    } = admin.storage.from("general").getPublicUrl(storagePath);

    // 9. Update prospect with user session client (RLS enforces tenant ownership)
    const { error: updateError } = await supabase
      .from("prospects")
      .update({
        manual_photo_url: publicUrl,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", prospectId)
      .eq("tenant_id", tenantId);

    if (updateError) {
      console.error("Failed to save photo URL to prospect:", updateError);
      return NextResponse.json(
        { error: "Failed to save photo URL" },
        { status: 500 }
      );
    }

    // 10. Log activity (fire-and-forget)
    logActivity({
      tenantId,
      userId: user.id,
      actionType: "photo_uploaded",
      targetType: "prospect",
      targetId: prospectId,
    }).catch(() => {});

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Photo upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
