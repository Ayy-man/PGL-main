"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, ExternalLink } from "lucide-react";

interface ReportRow {
  id: string;
  category: string;
  description: string;
  status: string;
  target_type: string | null;
  target_id: string | null;
  target_snapshot: Record<string, unknown> | null;
  screenshot_path: string | null;
  page_path: string;
  created_at: string;
  tenants: { id: string; name: string; slug: string } | null;
  users: { id: string; email: string; full_name: string | null } | null;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "wontfix", label: "Won't Fix" },
  { value: "duplicate", label: "Duplicate" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "incorrect_data", label: "Incorrect data" },
  { value: "missing_data", label: "Missing data" },
  { value: "bad_source", label: "Bad source" },
  { value: "bug", label: "Bug" },
  { value: "other", label: "Other" },
];

const CATEGORY_LABELS: Record<string, string> = {
  incorrect_data: "Incorrect data",
  missing_data: "Missing data",
  bad_source: "Bad source",
  bug: "Bug",
  other: "Other",
};

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
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
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    open: { bg: "bg-red-500/10", text: "text-red-400" },
    investigating: { bg: "bg-blue-500/10", text: "text-blue-400" },
    resolved: { bg: "bg-[var(--success-muted)]", text: "text-[var(--success)]" },
    wontfix: { bg: "bg-[var(--bg-elevated)]", text: "text-muted-foreground" },
    duplicate: { bg: "bg-[var(--bg-elevated)]", text: "text-muted-foreground" },
  };
  const colors = colorMap[status] ?? { bg: "bg-[var(--bg-elevated)]", text: "text-muted-foreground" };
  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      {label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        background: "var(--bg-elevated)",
        color: "var(--text-secondary-ds)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

function getTargetLabel(row: ReportRow): string {
  if (!row.target_type || row.target_type === "none") return "—";
  const snapshot = row.target_snapshot;
  const name =
    snapshot?.name ??
    snapshot?.full_name ??
    snapshot?.title ??
    row.target_id ??
    "";
  return `${row.target_type}${name ? `: ${String(name).slice(0, 30)}` : ""}`;
}

export function ReportsTable({
  initialReports,
  initialStatus,
}: {
  initialReports: ReportRow[];
  initialStatus: string;
}) {
  const [rows, setRows] = useState<ReportRow[]>(initialReports);
  const [status, setStatus] = useState(initialStatus);
  const [category, setCategory] = useState<string>("");
  const [tenantQuery, setTenantQuery] = useState("");
  const [tenantInput, setTenantInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams();
      if (status) searchParams.set("status", status);
      if (category) searchParams.set("category", category);
      if (tenantQuery) searchParams.set("tenant", tenantQuery);
      const res = await fetch(`/api/admin/reports?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      setRows(data.reports ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [status, category, tenantQuery]);

  useEffect(() => {
    fetchRows();
  }, [status, category]); // tenant filter applied on button click only

  const handleTenantSearch = () => {
    setTenantQuery(tenantInput);
  };

  const thStyle = {
    color: "var(--admin-text-secondary)",
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-[8px] border px-3 text-sm focus:outline-none"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary-ds)",
          }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-[8px] border px-3 text-sm focus:outline-none"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary-ds)",
          }}
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter by tenant…"
            value={tenantInput}
            onChange={(e) => setTenantInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTenantSearch()}
            className="h-9 rounded-[8px] border px-3 text-sm focus:outline-none w-48"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-primary-ds)",
            }}
          />
          <button
            onClick={handleTenantSearch}
            className="h-9 rounded-[8px] border px-3 text-sm font-medium transition-colors"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-secondary-ds)",
            }}
          >
            Search
          </button>
        </div>

        <button
          onClick={fetchRows}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 h-9 rounded-[8px] border px-3 text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary-ds)",
          }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          className="rounded-[8px] border px-4 py-3 text-sm"
          style={{
            background: "var(--destructive-bg, #3f0000)",
            borderColor: "var(--destructive)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      <div className="surface-admin-card rounded-[14px] overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="admin-thead">
                {["Created", "Tenant", "User", "Category", "Target", "Status", ""].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={thStyle}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--admin-row-border)" }}>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-muted-foreground"
                  >
                    {loading ? "Loading…" : "No reports match these filters."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="admin-row-hover">
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(row.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--text-primary-ds)" }}>
                      {row.tenants?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {row.users?.full_name ?? row.users?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={row.category} />
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate"
                      title={getTargetLabel(row)}
                    >
                      {getTargetLabel(row)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/reports/${row.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium rounded-[6px] px-2.5 py-1 transition-colors"
                        style={{
                          color: "var(--gold-primary)",
                          border: "1px solid var(--border-gold)",
                          background: "var(--gold-bg-strong)",
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {rows.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              {loading ? "Loading…" : "No reports match these filters."}
            </div>
          ) : (
            rows.map((row) => (
              <Link
                key={row.id}
                href={`/admin/reports/${row.id}`}
                className="block p-4 space-y-2 admin-row-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CategoryBadge category={row.category} />
                      <StatusBadge status={row.status} />
                    </div>
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--text-primary-ds)" }}
                    >
                      {row.tenants?.name ?? "Unknown tenant"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {row.users?.full_name ?? row.users?.email ?? "Unknown user"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatRelativeTime(row.created_at)}
                  </p>
                </div>
                {row.target_type && row.target_type !== "none" && (
                  <p className="text-xs text-muted-foreground truncate">
                    {getTargetLabel(row)}
                  </p>
                )}
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {row.page_path}
                </p>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
