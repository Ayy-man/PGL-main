import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/rbac";

export async function GET() {
  try {
    // Guard: Only super admin can fetch tenants
    await requireSuperAdmin();

    const supabase = createAdminClient();

    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(tenants);
  } catch (error) {
    console.error("Failed to fetch tenants:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}
