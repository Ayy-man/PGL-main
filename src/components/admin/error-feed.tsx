"use client";

import { XCircle, AlertTriangle } from "lucide-react";

interface SourceDetail {
  status: string;
  error?: string;
  at?: string;
}

interface ErrorRecord {
  id: string;
  type?: "enrichment" | "api";
  fullName: string;
  tenantName: string;
  tenantId: string;
  enrichmentStatus?: string;
  sourceDetails?: Record<string, SourceDetail>;
  route?: string;
  method?: string;
  statusCode?: number;
  errorMessage?: string;
  errorCode?: string | null;
  updatedAt: string;
}

interface ErrorFeedProps {
  data: {
    data: ErrorRecord[];
    total: number;
    page: number;
    limit: number;
  } | null;
  onPageChange: (page: number) => void;
}

function formatRelativeTime(dateStr: string): string {
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
    year: "numeric",
  });
}

function EnrichmentErrorEntry({ record }: { record: ErrorRecord }) {
  const failedSources = Object.entries(record.sourceDetails ?? {})
    .filter(([, d]) => d.status === "failed")
    .map(([k]) => k);

  return (
    <div
      className="entry-hover flex gap-4 p-4 cursor-pointer"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="mt-0.5 shrink-0">
        <div
          className="p-1.5 rounded"
          style={{ color: "oklch(0.62 0.19 22)", background: "rgba(239,68,68,0.1)" }}
        >
          <XCircle className="h-4 w-4" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary-ds)" }}>
            {record.fullName} — Enrichment Failed
          </p>
          <span
            className="text-[10px] whitespace-nowrap ml-2"
            style={{ color: "var(--text-ghost)" }}
          >
            {formatRelativeTime(record.updatedAt)}
          </span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: "var(--admin-text-secondary)" }}>
          Tenant: {record.tenantName}
          {failedSources.length > 0 && ` · Failed: ${failedSources.join(", ")}`}
        </p>
      </div>
    </div>
  );
}

function ApiErrorEntry({ record }: { record: ErrorRecord }) {
  // Truncate long error messages for the feed
  const shortMsg =
    record.errorMessage && record.errorMessage.length > 120
      ? record.errorMessage.slice(0, 120) + "..."
      : record.errorMessage;

  return (
    <div
      className="entry-hover flex gap-4 p-4 cursor-pointer"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="mt-0.5 shrink-0">
        <div
          className="p-1.5 rounded"
          style={{ color: "oklch(0.75 0.15 55)", background: "rgba(245,158,11,0.1)" }}
        >
          <AlertTriangle className="h-4 w-4" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary-ds)" }}>
            <span
              className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded mr-2"
              style={{ background: "rgba(239,68,68,0.15)", color: "oklch(0.62 0.19 22)" }}
            >
              {record.statusCode}
            </span>
            {record.method} {record.route}
          </p>
          <span
            className="text-[10px] whitespace-nowrap ml-2"
            style={{ color: "var(--text-ghost)" }}
          >
            {formatRelativeTime(record.updatedAt)}
          </span>
        </div>
        <p
          className="text-xs mt-0.5 truncate"
          style={{ color: "var(--admin-text-secondary)" }}
        >
          {record.tenantName !== "System" ? `Tenant: ${record.tenantName} · ` : ""}
          {shortMsg}
        </p>
      </div>
    </div>
  );
}

function ErrorEntry({ record }: { record: ErrorRecord }) {
  if (record.type === "api") {
    return <ApiErrorEntry record={record} />;
  }
  return <EnrichmentErrorEntry record={record} />;
}

function SkeletonEntry() {
  return (
    <div
      className="flex gap-4 p-4 animate-pulse"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="mt-0.5 shrink-0">
        <div className="h-7 w-7 rounded bg-white/[0.06]" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 w-3/4 bg-white/[0.06] rounded" />
        <div className="h-3 w-1/2 bg-white/[0.06] rounded" />
      </div>
    </div>
  );
}

export function ErrorFeed({ data, onPageChange }: ErrorFeedProps) {
  if (data === null) {
    return (
      <div className="surface-admin-card rounded-[14px] overflow-hidden flex flex-col h-full">
        <div
          className="p-5 flex justify-between items-center"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <h3
            className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2"
            style={{ color: "var(--text-primary-ds)" }}
          >
            <XCircle
              className="h-[18px] w-[18px]"
              style={{ color: "oklch(0.62 0.19 22)" }}
            />
            Live Error Feed
          </h3>
          <div className="flex items-center gap-2">
            <span
              className="size-2 rounded-full animate-pulse"
              style={{ background: "oklch(0.62 0.19 22)" }}
            />
            <span
              className="text-[10px] uppercase"
              style={{ color: "var(--admin-text-secondary)" }}
            >
              Live
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[300px]">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonEntry key={i} />
          ))}
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / data.limit);

  return (
    <div className="surface-admin-card rounded-[14px] overflow-hidden flex flex-col h-full">
      <div
        className="p-5 flex justify-between items-center"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <h3
          className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2"
          style={{ color: "var(--text-primary-ds)" }}
        >
          <XCircle
            className="h-[18px] w-[18px]"
            style={{ color: "oklch(0.62 0.19 22)" }}
          />
          Live Error Feed
        </h3>
        <div className="flex items-center gap-2">
          <span
            className="size-2 rounded-full animate-pulse"
            style={{ background: "oklch(0.62 0.19 22)" }}
          />
          <span
            className="text-[10px] uppercase"
            style={{ color: "var(--admin-text-secondary)" }}
          >
            Live
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[300px]">
        {data.data.length === 0 ? (
          <div className="flex items-center justify-center h-full py-12">
            <p className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
              No errors in the last 7 days.
            </p>
          </div>
        ) : (
          data.data.map((record) => (
            <ErrorEntry key={record.id} record={record} />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div
          className="p-4 flex items-center justify-between text-xs"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            color: "var(--admin-text-secondary)",
          }}
        >
          <span>
            Page {data.page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(data.page - 1)}
              disabled={data.page <= 1}
              className="px-3 py-1 rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "var(--text-primary-ds)",
              }}
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(data.page + 1)}
              disabled={data.page >= totalPages}
              className="px-3 py-1 rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "var(--text-primary-ds)",
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
