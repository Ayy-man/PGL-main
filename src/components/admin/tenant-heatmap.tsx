"use client";

import { Building2, LogIn, History, Ban, Filter, Plus } from "lucide-react";

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
    <tr
      className="animate-pulse"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="size-10 rounded-lg bg-white/[0.06]" />
          <div>
            <div className="h-3 w-28 bg-white/[0.06] rounded mb-1" />
            <div className="h-2 w-20 bg-white/[0.06] rounded" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-20 bg-white/[0.06] rounded" />
      </td>
      <td className="px-6 py-4 text-center">
        <div className="h-3 w-12 bg-white/[0.06] rounded mx-auto" />
      </td>
      <td className="px-6 py-4">
        <div className="h-3 w-16 bg-white/[0.06] rounded" />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1">
          <div className="h-8 w-8 rounded-lg bg-white/[0.06]" />
          <div className="h-8 w-8 rounded-lg bg-white/[0.06]" />
          <div className="h-8 w-8 rounded-lg bg-white/[0.06]" />
        </div>
      </td>
    </tr>
  );
}

function TenantRow({ tenant }: { tenant: Tenant }) {
  const isActive =
    tenant.searches7d > 0 ||
    tenant.enrichments7d > 0 ||
    tenant.exports7d > 0 ||
    tenant.lastActive !== null;

  return (
    <tr
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "";
      }}
    >
      {/* Column 1: Client / Tenant */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div
            className="size-10 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <Building2
              className="h-5 w-5"
              style={{ color: "var(--admin-text-secondary)" }}
            />
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary-ds)" }}
            >
              {tenant.name}
            </p>
            <p
              className="text-xs font-mono"
              style={{ color: "var(--admin-text-secondary)" }}
            >
              ID: {tenant.id.substring(0, 12)}
            </p>
          </div>
        </div>
      </td>

      {/* Column 2: Plan & Rev */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: "var(--gold-bg)",
              border: "1px solid var(--border-gold)",
              color: "var(--gold-primary)",
            }}
          >
            Enterprise
          </span>
          <span
            className="text-xs font-mono"
            style={{ color: "var(--text-primary-ds)" }}
          >
            &mdash;
          </span>
        </div>
      </td>

      {/* Column 3: Seats */}
      <td className="px-6 py-4 text-center">
        <span
          className="font-mono text-sm"
          style={{ color: "var(--text-primary-ds)" }}
        >
          {tenant.userCount}
        </span>
        <span
          className="text-xs ml-0.5"
          style={{ color: "var(--admin-text-secondary)" }}
        >
          {" "}
          / &mdash;
        </span>
      </td>

      {/* Column 4: Status */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div
            className="size-2 rounded-full"
            style={{
              background: isActive ? "var(--success)" : "oklch(0.62 0.19 22)",
              boxShadow: isActive
                ? "0 0 8px rgba(34,197,94,0.6)"
                : "0 0 8px rgba(239,68,68,0.6)",
            }}
          />
          <span
            className="text-xs"
            style={{ color: "var(--admin-text-secondary)" }}
            title={
              tenant.lastActive
                ? `Last active: ${formatRelativeTime(tenant.lastActive)}`
                : undefined
            }
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </td>

      {/* Column 5: Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1">
          <button
            title="Impersonate"
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--admin-text-secondary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary-ds)";
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--admin-text-secondary)";
              e.currentTarget.style.background = "";
            }}
          >
            <LogIn className="h-4 w-4" />
          </button>
          <button
            title="View Logs"
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--admin-text-secondary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary-ds)";
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--admin-text-secondary)";
              e.currentTarget.style.background = "";
            }}
          >
            <History className="h-4 w-4" />
          </button>
          <button
            title="Suspend Tenant"
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--admin-text-secondary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "oklch(0.62 0.19 22)";
              e.currentTarget.style.background = "rgba(239,68,68,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--admin-text-secondary)";
              e.currentTarget.style.background = "";
            }}
          >
            <Ban className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function TenantHeatmap({ data }: TenantHeatmapProps) {
  // Skeleton state
  if (data === null) {
    return (
      <div className="surface-admin-card rounded-[14px] overflow-hidden relative">
        {/* Decorative blur */}
        <div
          className="absolute -top-20 -left-20 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: "rgba(212,175,55,0.05)" }}
        />

        {/* Header skeleton */}
        <div
          className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div>
            <div className="h-5 w-48 bg-white/[0.06] rounded mb-2" />
            <div className="h-3 w-72 bg-white/[0.06] rounded" />
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-28 bg-white/[0.06] rounded-lg" />
            <div className="h-9 w-44 bg-white/[0.06] rounded-lg" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="overflow-x-auto relative z-10 animate-pulse">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                {["Client / Tenant", "Plan & Rev", "Seats", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--admin-text-secondary)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const tenants = data.tenants;

  return (
    <div className="surface-admin-card rounded-[14px] overflow-hidden relative">
      {/* Decorative blur */}
      <div
        className="absolute -top-20 -left-20 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{ background: "rgba(212,175,55,0.05)" }}
      />

      {/* Header */}
      <div
        className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10"
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div>
          <h3
            className="text-xl font-serif font-medium flex items-center gap-2"
            style={{ color: "var(--text-primary-ds)" }}
          >
            Tenant Management
          </h3>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--admin-text-secondary)" }}
          >
            Manage client instances, quotas, revenue tracking, and access
            controls.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--admin-text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.10)";
              e.currentTarget.style.color = "var(--text-primary-ds)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.color = "var(--admin-text-secondary)";
            }}
          >
            <Filter className="h-4 w-4" /> Filter View
          </button>
          <button
            className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
            style={{
              background: "var(--gold-primary)",
              color: "var(--bg-root)",
              boxShadow: "0 0 15px rgba(212,175,55,0.3)",
            }}
          >
            <Plus className="h-4 w-4" /> Provision New Tenant
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto relative z-10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr
              style={{
                background: "rgba(255,255,255,0.02)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <th
                className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider w-1/4"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Client / Tenant
              </th>
              <th
                className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Plan &amp; Rev
              </th>
              <th
                className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-center"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Seats
              </th>
              <th
                className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Status
              </th>
              <th
                className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-right"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-sm"
                  style={{ color: "var(--admin-text-secondary)" }}
                >
                  No tenant data available.
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <TenantRow key={tenant.id} tenant={tenant} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        className="p-4 flex justify-between items-center text-xs"
        style={{
          borderTop: "1px solid var(--border-subtle)",
          background: "rgba(255,255,255,0.02)",
          color: "var(--admin-text-secondary)",
        }}
      >
        <span>
          Showing {tenants.length} tenant{tenants.length !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded text-xs disabled:opacity-50 transition-colors"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "var(--text-primary-ds)",
            }}
            disabled
          >
            Previous
          </button>
          <button
            className="px-3 py-1 rounded text-xs transition-colors"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "var(--text-primary-ds)",
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
