import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Public endpoint — returns tenant logo + theme by slug.
 * Used by the login page to show tenant branding.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenants")
    .select("name, logo_url, theme")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    name: data.name,
    logoUrl: data.logo_url,
    theme: data.theme || "gold",
  });
}
