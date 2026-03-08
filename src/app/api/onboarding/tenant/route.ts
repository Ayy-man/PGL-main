import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Authenticate user via session cookie
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Read tenant_id from app_metadata
    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      return NextResponse.json(
        { error: "No tenant assigned" },
        { status: 403 }
      );
    }

    // 3. Check onboarding_completed — must be false
    const onboardingCompleted = user.app_metadata?.onboarding_completed;
    if (onboardingCompleted === true) {
      return NextResponse.json(
        { error: "Onboarding already completed" },
        { status: 403 }
      );
    }

    // 4. Fetch tenant using admin client (bypass RLS)
    const admin = createAdminClient();
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .select("id, name, slug, logo_url, primary_color, secondary_color")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error("Failed to fetch tenant for onboarding:", tenantError);
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Onboarding tenant API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
