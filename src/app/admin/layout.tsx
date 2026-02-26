import { requireSuperAdmin } from "@/lib/auth/rbac";
import { AdminNavLinks } from "./admin-nav-links";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard: Only super_admin can access /admin routes
  const user = await requireSuperAdmin();

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
        {/* Admin sidebar */}
        <aside
          className="sticky top-0 flex h-screen flex-col"
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

          {/* Footer with user email */}
          <div className="mt-auto px-5 py-4">
            <p
              className="text-[11px] truncate"
              style={{ color: "var(--text-ghost)" }}
            >
              {user.email}
            </p>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top bar — 56px, sticky, backdrop blur */}
          <header
            className="sticky top-0 z-30 flex h-14 items-center px-6"
            style={{
              background: "rgba(8,8,10,0.8)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-secondary-ds)" }}
            >
              Admin Dashboard
            </span>
          </header>

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
