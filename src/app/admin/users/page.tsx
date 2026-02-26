import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus } from "lucide-react";
import { UserStatusToggle } from "./user-status-toggle";

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

      <div className="rounded-[14px] overflow-hidden" style={{ background: "var(--bg-card-gradient)", border: "1px solid var(--border-subtle)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
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
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium">
                        {user.full_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-[var(--gold-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--gold-primary)]">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {tenant?.name || "—"}
                      </td>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
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
      </div>
    </div>
  );
}
