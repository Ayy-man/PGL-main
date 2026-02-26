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
    <div className="flex min-h-screen">
      {/* Admin sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-5 py-5">
          <span className="font-serif text-lg font-bold text-gold">
            PGL
          </span>
          <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground mt-1">
            Admin Console
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-5 px-3">
          <AdminNavLinks />
        </nav>

        <div className="border-t border-border p-4">
          <p className="text-xs text-muted-foreground truncate">
            {user.email}
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
