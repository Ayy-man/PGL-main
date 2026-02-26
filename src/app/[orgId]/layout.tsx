import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Search, Bell } from "lucide-react";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Look up tenant by slug or UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("id, name, slug, logo_url, primary_color, secondary_color, is_active")
    .eq(isUuid ? "id" : "slug", orgId)
    .single();

  if (error || !tenant || !tenant.is_active) {
    notFound();
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: "var(--bg-root)" }}
    >
      {/* Ambient gold glow — decorative, behind all content */}
      <div className="ambient-glow-top" aria-hidden="true" />
      <div className="ambient-glow-bottom" aria-hidden="true" />

      {/* Content layer — above ambient glow */}
      <div className="relative z-10 flex flex-1">
        <Sidebar
          orgId={orgId}
          tenantName={tenant.name}
          logoUrl={tenant.logo_url}
        />

        <div className="flex flex-1 flex-col min-w-0">
          {/* Top bar — 56px, sticky, backdrop blur */}
          <header
            className="sticky top-0 z-30 flex h-14 items-center justify-between px-6"
            style={{
              background: "rgba(8,8,10,0.8)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            {/* Left: Command palette search placeholder */}
            <div
              className="flex items-center gap-2 rounded-[8px] px-3 py-1.5 text-sm cursor-pointer"
              style={{
                width: "320px",
                background: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary-ds)",
              }}
            >
              <Search className="h-4 w-4 shrink-0" />
              <span>Search...</span>
              <kbd
                className="ml-auto rounded border px-1.5 py-0.5 text-[10px] font-mono"
                style={{
                  borderColor: "var(--border-subtle)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-ghost)",
                }}
              >
                ⌘K
              </kbd>
            </div>

            {/* Right: Notification bell + user avatar */}
            <div className="flex items-center gap-3">
              <button
                className="ghost-hover rounded-[8px] p-2 cursor-pointer"
                style={{ color: "var(--text-secondary-ds)" }}
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
              </button>
              {/* User avatar placeholder */}
              <div
                className="h-8 w-8 rounded-full"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                }}
              />
            </div>
          </header>

          {/* Page content with fade-in animation */}
          <main className="flex-1 overflow-y-auto">
            <div className="page-enter p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
