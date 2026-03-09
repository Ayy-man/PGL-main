import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus } from "lucide-react";
import { UserStatusToggle } from "./user-status-toggle";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const supabase = createAdminClient();

  const { data: users, error } = await supabase
    .from("users")
    .select(`
      *,
      tenants:tenant_id (
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Users
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users across all tenants
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[var(--border-gold)] bg-[var(--gold-bg-strong)] px-4 text-sm font-semibold text-[var(--gold-primary)] hover:bg-[var(--gold-bg)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create User
        </Link>
      </div>

      <div className="surface-admin-card overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="admin-thead">
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Name
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Email
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Role
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Tenant
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Status
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--admin-row-border)" }}>
              {users?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No users found. Create your first user to get started.
                  </td>
                </tr>
              ) : (
                users?.map((user) => {
                  const tenant = user.tenants as { name: string } | null;
                  return (
                    <tr key={user.id} className="admin-row-hover">
                      <td className="px-3 py-3 md:px-6 md:py-4 text-sm font-medium">
                        {user.full_name}
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4 text-sm text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4">
                        <span className="inline-flex items-center rounded-full bg-[var(--gold-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--gold-primary)]">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4 text-sm text-muted-foreground">
                        {tenant?.name || "—"}
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            user.is_active
                              ? "bg-[var(--success-muted)] text-[var(--success)]"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4">
                        <UserStatusToggle
                          userId={user.id}
                          isActive={user.is_active}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {users?.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No users found. Create your first user to get started.
            </div>
          ) : (
            users?.map((user) => {
              const tenant = user.tenants as { name: string } | null;
              return (
                <div key={user.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary-ds)" }}>
                        {user.full_name || "Unnamed"}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                        {user.email}
                      </p>
                    </div>
                    <UserStatusToggle
                      userId={user.id}
                      isActive={user.is_active}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                      style={{ background: "var(--gold-bg)", color: "var(--gold-primary)" }}
                    >
                      {user.role}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        user.is_active
                          ? "bg-[var(--success-muted)] text-[var(--success)]"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                    <span style={{ color: "var(--text-tertiary)" }}>{tenant?.name || "—"}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
