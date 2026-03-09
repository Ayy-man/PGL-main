"use client";

import { useState } from "react";
import { TenantStatusToggle } from "./tenant-status-toggle";
import { TenantDetailDrawer } from "@/components/admin/tenant-detail-drawer";

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

interface TenantTableProps {
  tenants: TenantRow[];
}

export function TenantTable({ tenants }: TenantTableProps) {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  return (
    <>
      <div className="surface-admin-card rounded-[14px] overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="admin-thead">
                <th
                  className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--admin-text-secondary)" }}
                >
                  Name
                </th>
                <th
                  className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--admin-text-secondary)" }}
                >
                  Slug
                </th>
                <th
                  className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--admin-text-secondary)" }}
                >
                  Status
                </th>
                <th
                  className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--admin-text-secondary)" }}
                >
                  Created
                </th>
                <th
                  className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--admin-text-secondary)" }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ borderColor: "var(--admin-row-border)" }}
            >
              {tenants?.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-muted-foreground"
                  >
                    No tenants found. Create your first tenant to get started.
                  </td>
                </tr>
              ) : (
                tenants?.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="admin-row-hover cursor-pointer"
                    onClick={() => setSelectedTenantId(tenant.id)}
                  >
                    <td className="px-3 py-3 md:px-6 md:py-4 text-sm font-medium">
                      {tenant.name}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4 text-sm text-muted-foreground">
                      /{tenant.slug}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4">
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
                    <td className="px-3 py-3 md:px-6 md:py-4 text-sm text-muted-foreground">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                    <td
                      className="px-3 py-3 md:px-6 md:py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
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

        {/* Mobile card list */}
        <div className="md:hidden divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {tenants?.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No tenants found. Create your first tenant to get started.
            </div>
          ) : (
            tenants?.map((tenant) => (
              <div
                key={tenant.id}
                className="p-4 space-y-2 admin-row-hover cursor-pointer"
                onClick={() => setSelectedTenantId(tenant.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary-ds)" }}>
                      {tenant.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                      /{tenant.slug}
                    </p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <TenantStatusToggle
                      tenantId={tenant.id}
                      isActive={tenant.is_active}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      tenant.is_active
                        ? "bg-[var(--success-muted)] text-[var(--success)]"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {tenant.is_active ? "Active" : "Inactive"}
                  </span>
                  <span>{new Date(tenant.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TenantDetailDrawer
        tenantId={selectedTenantId}
        open={selectedTenantId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTenantId(null);
        }}
      />
    </>
  );
}
