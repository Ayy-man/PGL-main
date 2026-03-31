import { requireSuperAdmin } from "@/lib/auth/rbac";
import { AdminSidebar } from "./admin-sidebar";
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
        <AdminSidebar userInitials={userInitials} userEmail={user.email} />

        {/* Mobile admin sidebar */}
        <AdminMobileSidebar userEmail={user.email} userName={userName} userInitials={userInitials} />

        {/* Main content */}
        <div className="flex flex-1 flex-col min-w-0">
          <TopBar userName={userName} userInitials={userInitials} />

          {/* Page content with fade-in animation */}
          <main className="flex-1 overflow-y-auto">
            <div className="page-enter p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
