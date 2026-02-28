import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus } from "lucide-react";
import { TenantStatusToggle } from "./tenant-status-toggle";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const supabase = createAdminClient();

  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Tenants
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage real estate teams on the platform
          </p>
        </div>
        <Link
          href="/admin/tenants/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[var(--border-gold)] bg-[var(--gold-bg-strong)] px-4 text-sm font-semibold text-[var(--gold-primary)] hover:bg-[var(--gold-bg)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Tenant
        </Link>
      </div>

      <div className="surface-admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="admin-thead">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Name
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Status
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Created
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--admin-row-border)" }}>
              {tenants?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No tenants found. Create your first tenant to get started.
                  </td>
                </tr>
              ) : (
                tenants?.map((tenant) => (
                  <tr key={tenant.id} className="admin-row-hover">
                    <td className="px-6 py-4 text-sm font-medium">
                      {tenant.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      /{tenant.slug}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          tenant.is_active
                            ? "bg-[var(--success-muted)] text-[var(--success)]"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {tenant.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <TenantStatusToggle
                        tenantId={tenant.id}
                        isActive={tenant.is_active}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
