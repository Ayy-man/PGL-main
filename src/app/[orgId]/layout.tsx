import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { TourTrigger } from "@/components/onboarding/tour-trigger";
import { getThemeCSSVariables, isValidTheme, DEFAULT_THEME } from "@/lib/tenant-theme";
import type { OnboardingState } from "@/types/onboarding";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  let orgId: string;
  let tenant: { id: string; name: string; slug: string; logo_url: string | null; theme: string | null; is_active: boolean };
  let userName: string;
  let userInitials: string;
  let userRole: string;
  let userEmail: string | undefined;
  let savedSearchCount = 0;
  let listsCount = 0;
  let initialOnboardingState: OnboardingState | null = null;

  try {
    ({ orgId } = await params);
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("[TenantLayout] Auth error:", authError.message);
    }
    if (!user) {
      redirect("/login");
    }

    // Look up tenant by slug or UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
    const { data, error } = await supabase
      .from("tenants")
      .select("id, name, slug, logo_url, theme, is_active")
      .eq(isUuid ? "id" : "slug", orgId)
      .single();

    if (error || !data || !data.is_active) {
      console.error("[TenantLayout] Tenant query failed:", { orgId, error: error?.message, data });
      notFound();
    }

    tenant = data;

    // Live counts for sidebar nav badges (RLS handles tenant scoping for the session client)
    const tenantScopeId = (user.app_metadata?.tenant_id as string | undefined) ?? tenant.id;

    const [personasCountResult, listsCountResult] = await Promise.all([
      supabase
        .from("personas")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantScopeId),
      supabase
        .from("lists")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantScopeId),
    ]);

    savedSearchCount = personasCountResult.count ?? 0;
    listsCount = listsCountResult.count ?? 0;

    userName = user?.user_metadata?.full_name ?? user?.email ?? "User";
    userInitials = userName.charAt(0).toUpperCase() || "?";
    userRole = (user?.app_metadata?.role as string) || "assistant";
    userEmail = user?.email ?? undefined;
    initialOnboardingState =
      (user.app_metadata?.onboarding_state as OnboardingState | undefined) ?? null;
  } catch (err) {
    // Re-throw Next.js internal errors (redirect, notFound)
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("[TenantLayout] Server render error:", err);
    throw err;
  }

  // Compute per-tenant CSS variable overrides
  const themeKey = tenant.theme && isValidTheme(tenant.theme) ? tenant.theme : DEFAULT_THEME;
  const cssVars = getThemeCSSVariables(themeKey);
  const themeStyle = `:root { ${Object.entries(cssVars).map(([k, v]) => `${k}: ${v}`).join("; ")} }`;

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: "var(--bg-root)" }}
    >
      {/* Per-tenant theme override — server-rendered, no flash */}
      <style dangerouslySetInnerHTML={{ __html: themeStyle }} />

      {/* Content layer — above ambient glow (rendered in root layout) */}
      <div className="relative z-10 flex flex-1">
        <Sidebar
          orgId={orgId}
          tenantName={tenant.name}
          logoUrl={tenant.logo_url}
          userRole={userRole}
          userName={userName}
          userInitials={userInitials}
          userEmail={userEmail}
          savedSearchCount={savedSearchCount}
          listsCount={listsCount}
        />

        <div className="flex flex-1 flex-col min-w-0">
          <TopBar userName={userName} userInitials={userInitials} orgId={orgId} />

          {/* Page content with fade-in animation */}
          <main className="flex-1 overflow-y-auto">
            <div className="page-enter p-4 md:p-6 pb-20 lg:pb-6">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile bottom navigation — renders only below lg */}
        <MobileBottomNav orgId={orgId} userRole={userRole} />

        {/* Product tour — renders only when onboarding_state.tour_completed !== true */}
        <TourTrigger initialOnboardingState={initialOnboardingState} userRole={userRole} />
      </div>
    </div>
  );
}
