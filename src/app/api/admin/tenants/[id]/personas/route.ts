import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Guard: Only super admin can access tenant personas
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const admin = createAdminClient();

    const { data: personas, error } = await admin
      .from("personas")
      .select("id, name, last_used_at, filters")
      .eq("tenant_id", id)
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .limit(3);

    if (error) {
      throw new Error(`Personas query failed: ${error.message}`);
    }

    return NextResponse.json({ personas: personas ?? [] });
  } catch (error) {
    console.error("Failed to fetch tenant personas:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant personas" },
      { status: 500 }
    );
  }
}
