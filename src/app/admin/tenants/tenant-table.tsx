"use client";

import { useState, useMemo } from "react";
import { TenantStatusToggle } from "./tenant-status-toggle";
import { TenantDetailDrawer } from "@/components/admin/tenant-detail-drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";

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
  const [filterQuery, setFilterQuery] = useState("");

  const filteredTenants = useMemo(() => {
    if (!filterQuery.trim()) return tenants;
    const q = filterQuery.toLowerCase();
    return tenants.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    );
  }, [tenants, filterQuery]);

  return (
    <>
      {/* Filter input */}
      <div className="relative max-w-xs">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
          style={{ color: "var(--text-ghost)" }}
        />
        <input
          type="text"
          placeholder="Filter by name or slug…"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="h-9 w-full rounded-[8px] border pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--gold-primary)]/40"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary-ds)",
          }}
        />
      </div>

      <div className="surface-admin-card rounded-[14px] overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10" style={{ background: "var(--bg-elevated)" }}>
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
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={Building2}
                      title="No tenants yet"
                      description="Create your first real-estate team to start onboarding users."
                    >
                      <Button asChild variant="gold">
                        <Link href="/admin/tenants/new">
                          <Plus className="h-4 w-4" /> Create Tenant
                        </Link>
                      </Button>
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="admin-row-hover cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold-primary)]/40"
                    tabIndex={0}
                    onClick={() => setSelectedTenantId(tenant.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedTenantId(tenant.id);
                      }
                    }}
                    title="View tenant details"
                  >
                    <td className="px-3 py-3 md:px-6 md:py-4 text-sm font-medium">
                      {tenant.name}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4 text-sm text-muted-foreground">
                      /{tenant.slug}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={
                          tenant.is_active
                            ? {
                                background: "var(--success-muted)",
                                color: "var(--success)",
                              }
                            : {
                                background: "color-mix(in oklch, oklch(0.62 0.19 22) 10%, transparent)",
                                color: "oklch(0.62 0.19 22)",
                              }
                        }
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
                        tenantName={tenant.name}
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
          {filteredTenants.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No tenants yet"
              description="Create your first real-estate team to start onboarding users."
            >
              <Button asChild variant="gold">
                <Link href="/admin/tenants/new">
                  <Plus className="h-4 w-4" /> Create Tenant
                </Link>
              </Button>
            </EmptyState>
          ) : (
            filteredTenants.map((tenant) => (
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
                      tenantName={tenant.name}
                      isActive={tenant.is_active}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={
                      tenant.is_active
                        ? {
                            background: "var(--success-muted)",
                            color: "var(--success)",
                          }
                        : {
                            background: "color-mix(in oklch, oklch(0.62 0.19 22) 10%, transparent)",
                            color: "oklch(0.62 0.19 22)",
                          }
                    }
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
