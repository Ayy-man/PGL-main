import { requireSuperAdmin } from "@/lib/auth/rbac";
import Link from "next/link";
import { Building2, Users, LayoutDashboard } from "lucide-react";

const ADMIN_NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Tenants", href: "/admin/tenants", icon: Building2 },
  { label: "Users", href: "/admin/users", icon: Users },
];

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
      <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-4 py-4">
          <span className="font-serif text-lg font-bold text-primary">
            PGL Admin
          </span>
          <p className="text-xs text-muted-foreground mt-1">
            Super Admin Panel
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="flex flex-col gap-1">
            {ADMIN_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
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
