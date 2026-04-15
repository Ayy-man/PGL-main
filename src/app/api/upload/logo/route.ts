import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateOnboardingState } from "@/app/actions/onboarding-state";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
] as const;

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: Request) {
  try {
    // 1. Authenticate user — must be super_admin or tenant_admin
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.app_metadata?.role as string | undefined;
    if (role !== "super_admin" && role !== "tenant_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const tenantId = formData.get("tenantId") as string | null;
    const file = formData.get("file") as File | null;

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    // Verify tenant ownership: non-super-admins can only upload to their own tenant
    if (role !== "super_admin") {
      const userTenantId = user.app_metadata?.tenant_id as string | undefined;
      if (userTenantId !== tenantId) {
        return NextResponse.json(
          { error: "Forbidden: cannot modify another tenant" },
          { status: 403 }
        );
      }
    }

    if (!file) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 }
      );
    }

    // 3. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 2MB limit" },
        { status: 400 }
      );
    }

    // 4. Validate MIME type
    if (
      !ALLOWED_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_MIME_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, SVG, WebP" },
        { status: 400 }
      );
    }

    // 5. Determine file extension from MIME type
    const ext = MIME_TO_EXT[file.type];
    const storagePath = `tenant-logos/${tenantId}.${ext}`;

    // 6. Upload to Supabase Storage using admin client
    const admin = createAdminClient();
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await admin.storage
      .from("general")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Logo upload failed:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload logo" },
        { status: 500 }
      );
    }

    // 7. Get public URL
    const {
      data: { publicUrl },
    } = admin.storage.from("general").getPublicUrl(storagePath);

    // 8. Update tenants.logo_url with the public URL
    const { error: updateError } = await admin
      .from("tenants")
      .update({ logo_url: publicUrl })
      .eq("id", tenantId);

    if (updateError) {
      console.error("Failed to update tenant logo_url:", updateError);
      return NextResponse.json(
        { error: "Failed to update tenant record" },
        { status: 500 }
      );
    }

    // 9. Phase 41-04 — flip admin_checklist.upload_logo. Fire-and-forget:
    //    logo upload already succeeded, so we never want an observer failure
    //    to surface as a 500.
    try {
      await updateOnboardingState({ admin_checklist: { upload_logo: true } });
    } catch (err) {
      console.error("[onboarding] upload_logo observer failed:", err);
    }

    // 10. Return the public URL
    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
