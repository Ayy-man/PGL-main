import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("issue_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  if (error) {
    // Return 0 on error rather than crashing the nav badge
    return NextResponse.json({ open: 0, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ open: count ?? 0 });
}
