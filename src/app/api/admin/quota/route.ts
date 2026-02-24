import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Guard: Only super admin can access quota data
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Coming Soon — Redis counter instrumentation not yet deployed.
    // Once `api_usage:{provider}:{YYYY-MM-DD}` keys are populated via INCR,
    // this endpoint can be updated to read those values from Redis.
    return NextResponse.json({
      status: "coming_soon",
      message:
        "API quota tracking will be available after Redis instrumentation is deployed",
      providers: ["apollo", "contactout", "exa", "edgar", "claude"],
    });
  } catch (error) {
    console.error("Quota API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quota data" },
      { status: 500 }
    );
  }
}
