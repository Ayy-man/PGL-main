"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

interface TenantUser {
  id: string;
  fullName: string;
  searches7d: number;
  enrichments7d: number;
  exports7d: number;
}

interface Tenant {
  id: string;
  name: string;
  userCount: number;
  searches7d: number;
  enrichments7d: number;
  exports7d: number;
  lastActive: string | null;
  users: TenantUser[];
}

interface TenantHeatmapProps {
  data: {
    tenants: Tenant[];
  } | null;
}

function getHeatmapClass(value: number, allValues: number[]): string {
  const nonZeroValues = allValues.filter((v) => v > 0).sort((a, b) => a - b);

  if (nonZeroValues.length === 0) {
    // All values are zero — new state across the board
    return "text-muted-foreground";
  }

  if (value === 0) {
    // Zero when others have data
    return "text-destructive";
  }

  const rank = nonZeroValues.findIndex((v) => v >= value);
  const pct = rank / nonZeroValues.length;

  if (pct >= 0.75) return "text-[var(--success)]";
  if (pct >= 0.25) return "text-[var(--warning)]";
  return "text-destructive";
}

function isNewTenant(tenant: Tenant): boolean {
  return (
    tenant.searches7d === 0 &&
    tenant.enrichments7d === 0 &&
    tenant.exports7d === 0
  );
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";

  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border animate-pulse">
      <td className="py-3 px-4">
        <div className="h-4 w-32 bg-muted rounded" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 w-8 bg-muted rounded" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 w-12 bg-muted rounded" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 w-12 bg-muted rounded" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 w-12 bg-muted rounded" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 w-20 bg-muted rounded" />
      </td>
    </tr>
  );
}

export function TenantHeatmap({ data }: TenantHeatmapProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (data === null) {
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="py-3 px-4 text-left text-muted-foreground font-medium">Tenant</th>
              <th className="py-3 px-4 text-left text-muted-foreground font-medium">Users</th>
              <th className="py-3 px-4 text-left text-muted-foreground font-medium">Searches (7d)</th>
              <th className="py-3 px-4 text-left text-muted-foreground font-medium">Enrichments (7d)</th>
              <th className="py-3 px-4 text-left text-muted-foreground font-medium">Exports (7d)</th>
              <th className="py-3 px-4 text-left text-muted-foreground font-medium">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const tenants = data.tenants;
  const allSearches = tenants.map((t) => t.searches7d);
  const allEnrichments = tenants.map((t) => t.enrichments7d);
  const allExports = tenants.map((t) => t.exports7d);

  const handleRowClick = (tenantId: string) => {
    setExpandedId((prev) => (prev === tenantId ? null : tenantId));
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="py-3 px-4 text-left text-muted-foreground font-medium">Tenant</th>
            <th className="py-3 px-4 text-left text-muted-foreground font-medium">Users</th>
            <th className="py-3 px-4 text-left text-muted-foreground font-medium">Searches (7d)</th>
            <th className="py-3 px-4 text-left text-muted-foreground font-medium">Enrichments (7d)</th>
            <th className="py-3 px-4 text-left text-muted-foreground font-medium">Exports (7d)</th>
            <th className="py-3 px-4 text-left text-muted-foreground font-medium">Last Active</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => {
            const isNew = isNewTenant(tenant);
            const isExpanded = expandedId === tenant.id;

            return (
              <>
                <tr
                  key={tenant.id}
                  className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(tenant.id)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-medium">{tenant.name}</span>
                      {isNew && (
                        <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          New
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{tenant.userCount}</td>
                  <td className={`py-3 px-4 font-medium ${isNew ? "text-muted-foreground" : getHeatmapClass(tenant.searches7d, allSearches)}`}>
                    {tenant.searches7d.toLocaleString()}
                  </td>
                  <td className={`py-3 px-4 font-medium ${isNew ? "text-muted-foreground" : getHeatmapClass(tenant.enrichments7d, allEnrichments)}`}>
                    {tenant.enrichments7d.toLocaleString()}
                  </td>
                  <td className={`py-3 px-4 font-medium ${isNew ? "text-muted-foreground" : getHeatmapClass(tenant.exports7d, allExports)}`}>
                    {tenant.exports7d.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">
                    {formatRelativeTime(tenant.lastActive)}
                  </td>
                </tr>

                {isExpanded && (
                  <tr key={`${tenant.id}-expanded`} className="border-b border-border">
                    <td colSpan={6} className="bg-muted/30 pl-10 pr-4 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          Per-User Breakdown
                        </p>
                        <Link
                          href="/admin/tenants"
                          className="text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View tenant admin page
                        </Link>
                      </div>

                      {tenant.users.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No users yet.</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border/50">
                              <th className="py-1.5 pr-4 text-left text-muted-foreground font-medium">User</th>
                              <th className="py-1.5 pr-4 text-left text-muted-foreground font-medium">Searches</th>
                              <th className="py-1.5 pr-4 text-left text-muted-foreground font-medium">Enrichments</th>
                              <th className="py-1.5 text-left text-muted-foreground font-medium">Exports</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tenant.users.map((user) => (
                              <tr key={user.id} className="border-b border-border/30 last:border-0">
                                <td className="py-1.5 pr-4 font-medium">{user.fullName}</td>
                                <td className="py-1.5 pr-4 text-muted-foreground">{user.searches7d.toLocaleString()}</td>
                                <td className="py-1.5 pr-4 text-muted-foreground">{user.enrichments7d.toLocaleString()}</td>
                                <td className="py-1.5 text-muted-foreground">{user.exports7d.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </>
            );
          })}

          {tenants.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-muted-foreground">
                No tenant data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
