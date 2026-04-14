"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { RefreshCw, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  resolved_at?: string | null;
  tenants: { id: string; name: string; slug: string } | null;
  users: { id: string; email: string; full_name: string | null } | null;
}

export interface OverdueClosedRow extends ReportRow {
  resolved_at: string;
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
    open: {
      bg: "color-mix(in oklch, oklch(0.62 0.19 22) 10%, transparent)",
      text: "oklch(0.62 0.19 22)",
    },
    investigating: {
      bg: "color-mix(in oklch, oklch(0.6 0.15 240) 10%, transparent)",
      text: "oklch(0.6 0.15 240)",
    },
    resolved: { bg: "var(--success-muted)", text: "var(--success)" },
    wontfix: { bg: "var(--bg-elevated)", text: "var(--text-secondary-ds)" },
    duplicate: { bg: "var(--bg-elevated)", text: "var(--text-secondary-ds)" },
  };
  const c = colorMap[status] ?? { bg: "var(--bg-elevated)", text: "var(--text-secondary-ds)" };
  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: c.bg, color: c.text }}
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

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full rounded" />
        </td>
      ))}
    </tr>
  );
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRows = useCallback(async (overrideTenant?: string) => {
    setLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams();
      if (status) searchParams.set("status", status);
      if (category) searchParams.set("category", category);
      const tq = overrideTenant !== undefined ? overrideTenant : tenantQuery;
      if (tq) searchParams.set("tenant", tq);
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
  }, [status, category]); // tenant filter applied via debounce

  // Debounced tenant input
  const handleTenantInputChange = (value: string) => {
    setTenantInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setTenantQuery(value);
      void fetchRows(value);
    }, 300);
  };

  const hasFilters = !!status || !!category || !!tenantQuery;

  const clearAll = () => {
    setStatus("");
    setCategory("");
    setTenantQuery("");
    setTenantInput("");
  };

  const thStyle = {
    color: "var(--admin-text-secondary)",
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={status || "__all__"} onValueChange={(v) => setStatus(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category || "__all__"} onValueChange={(v) => setCategory(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All categories</SelectItem>
            {CATEGORY_OPTIONS.filter((o) => o.value).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          type="text"
          placeholder="Filter by tenant…"
          value={tenantInput}
          onChange={(e) => handleTenantInputChange(e.target.value)}
          className="h-9 rounded-[8px] border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--gold-primary)]/40 w-48"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary-ds)",
          }}
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear filters
          </Button>
        )}

        <button
          onClick={() => fetchRows()}
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
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-muted-foreground"
                  >
                    No reports match these filters.
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
                        className="inline-flex items-center gap-1 text-xs font-medium rounded-[6px] px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-primary)]/40"
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
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-[8px]" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No reports match these filters.
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

/**
 * Lightweight list surface for closed-but-stale tickets (status ∈ closed AND resolved_at > 30d).
 */
export function OverdueClosedList({ reports }: { reports: OverdueClosedRow[] }) {
  if (reports.length === 0) return null;

  const thStyle = { color: "var(--admin-text-secondary)" };

  return (
    <div className="surface-admin-card rounded-[14px] overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="admin-thead">
              {["Tenant", "Category", "Closed", "Status", ""].map((col) => (
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
            {reports.map((row) => (
              <tr key={row.id} className="admin-row-hover">
                <td
                  className="px-4 py-3 text-sm font-medium"
                  style={{ color: "var(--text-secondary-ds)" }}
                >
                  {row.tenants?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <CategoryBadge category={row.category} />
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                  {row.resolved_at ? formatRelativeTime(row.resolved_at) : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/reports/${row.id}`}
                    aria-label="View report"
                    className="inline-flex items-center gap-1 text-xs font-medium rounded-[6px] px-2.5 py-1 transition-colors"
                    style={{
                      color: "var(--text-secondary-ds)",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-elevated)",
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                    View report
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden divide-y" style={{ borderColor: "var(--border-subtle)" }}>
        {reports.map((row) => (
          <Link
            key={row.id}
            href={`/admin/reports/${row.id}`}
            className="block p-4 space-y-1.5 admin-row-hover"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <CategoryBadge category={row.category} />
              <StatusBadge status={row.status} />
            </div>
            <p
              className="text-sm font-medium truncate"
              style={{ color: "var(--text-secondary-ds)" }}
            >
              {row.tenants?.name ?? "Unknown tenant"}
            </p>
            <p className="text-xs text-muted-foreground">
              Closed {row.resolved_at ? formatRelativeTime(row.resolved_at) : "—"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
