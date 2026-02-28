import { requireSuperAdmin } from "@/lib/auth/rbac";
import { AdminNavLinks } from "./admin-nav-links";
import { AdminMobileSidebar } from "./admin-mobile-sidebar";
import { TopBar } from "@/components/layout/top-bar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard: Only super_admin can access /admin routes
  const user = await requireSuperAdmin();
  const userName = user.fullName || user.email || "Admin";
  const userInitials = userName.charAt(0).toUpperCase() || "A";

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: "var(--bg-root)" }}
    >
      {/* Content layer — above ambient glow */}
      <div className="relative z-10 flex flex-1">
        {/* Desktop admin sidebar */}
        <aside
          className="hidden lg:flex sticky top-0 h-screen flex-col"
          style={{
            width: "220px",
            background: "var(--bg-sidebar)",
            borderRight: "1px solid var(--border-sidebar)",
          }}
        >
          {/* Admin header */}
          <div className="px-5 py-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif font-bold text-sm"
                style={{
                  background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))",
                  color: "var(--gold-primary)",
                  border: "1px solid var(--border-gold)",
                }}
              >
                P
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-foreground">
                  PGL
                </span>
                <span
                  className="text-[11px] uppercase tracking-wider"
                  style={{ color: "var(--gold-text)" }}
                >
                  Admin Console
                </span>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-2 px-3">
            <AdminNavLinks />
          </nav>

          {/* Footer user card */}
          <div className="mt-auto px-4 py-4">
            <div
              className="rounded-lg p-3 flex items-center gap-3"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                className="size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: "var(--gold-bg-strong)",
                  color: "var(--gold-primary)",
                  border: "1px solid var(--border-gold)",
                }}
              >
                {userInitials}
              </div>
              <div className="overflow-hidden min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--text-primary-ds)" }}
                >
                  Super Admin
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--text-ghost)" }}
                >
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile admin sidebar */}
        <AdminMobileSidebar userEmail={user.email} userName={userName} userInitials={userInitials} />

        {/* Main content */}
        <div className="flex flex-1 flex-col min-w-0">
          <TopBar userName={userName} userInitials={userInitials} />

          {/* Page content with fade-in animation */}
          <main className="flex-1 overflow-y-auto">
            <div className="page-enter p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
