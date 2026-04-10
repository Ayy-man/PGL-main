import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const rawNext = searchParams.get("next") ?? "/";

  // Sanitize redirect path: must be a relative path, no protocol, no path traversal
  const next =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.includes("..") &&
    !rawNext.includes("://")
      ? rawNext
      : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Recovery tokens must land on the reset-password page, not the dashboard
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.app_metadata?.tenant_id;
      const role = user?.app_metadata?.role;

      // Redirect users who haven't completed onboarding
      // Tenant admins see full org setup; agents/assistants just set password
      if (
        user?.app_metadata?.onboarding_completed === false &&
        role !== "super_admin"
      ) {
        if (role === "tenant_admin") {
          return NextResponse.redirect(
            `${origin}/onboarding/confirm-tenant`
          );
        }
        return NextResponse.redirect(
          `${origin}/onboarding/set-password`
        );
      }

      if (role === 'super_admin') {
        return NextResponse.redirect(`${origin}/admin`);
      }
      if (tenantId) {
        return NextResponse.redirect(`${origin}/${tenantId}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
