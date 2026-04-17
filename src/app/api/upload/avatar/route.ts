import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 2MB limit" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json({ error: "Invalid file type. Allowed: PNG, JPG, WebP" }, { status: 400 });
    }

    const ext = MIME_TO_EXT[file.type];
    const storagePath = `user-avatars/${user.id}.${ext}`;

    const admin = createAdminClient();
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await admin.storage
      .from("general")
      .upload(storagePath, fileBuffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error("Avatar upload failed:", uploadError);
      return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
    }

    const { data: { publicUrl } } = admin.storage.from("general").getPublicUrl(storagePath);

    const { error: updateError } = await admin
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update user avatar_url:", updateError);
      return NextResponse.json({ error: "Failed to update user record" }, { status: 500 });
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Best-effort removal across all possible extensions
    const exts = ["png", "jpg", "webp"];
    await Promise.allSettled(
      exts.map((ext) =>
        admin.storage.from("general").remove([`user-avatars/${user.id}.${ext}`])
      )
    );

    const { error: updateError } = await admin
      .from("users")
      .update({ avatar_url: null })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update user record" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
