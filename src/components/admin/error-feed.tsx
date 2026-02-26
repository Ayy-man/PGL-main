"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SourceDetail {
  status: string;
  error?: string;
  at?: string;
}

interface ErrorRecord {
  id: string;
  fullName: string;
  userName: string;
  tenantName: string;
  tenantId: string;
  enrichmentStatus: string;
  sourceDetails: Record<string, SourceDetail>;
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

function getSourceBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case "success":
    case "complete":
      return "border-[var(--success)] text-[var(--success)] bg-[var(--success-muted)]";
    case "failed":
    case "error":
      return "border-destructive/50 text-destructive bg-destructive/10";
    default:
      return "border-border text-muted-foreground bg-white/[0.03]";
  }
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[var(--border-subtle)] animate-pulse">
      <td className="py-3 px-4">
        <div className="h-4 w-20 bg-white/[0.06] rounded" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 w-24 bg-white/[0.06] rounded" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 w-24 bg-white/[0.06] rounded" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 w-28 bg-white/[0.06] rounded" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 w-16 bg-white/[0.06] rounded" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 w-12 bg-white/[0.06] rounded" />
      </td>
    </tr>
  );
}

export function ErrorFeed({ data, onPageChange }: ErrorFeedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (data === null) {
    return (
      <div className="rounded-[14px] overflow-hidden" style={{ background: "var(--bg-card-gradient)", border: "1px solid var(--border-subtle)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.02]">
              <th className="py-3 px-4 text-left text-muted-foreground font-medium">Time</th>
              <th className="py-3 px-4 text-left text-muted-foreground font-medium">Tenant</th>
              <th className="py-3 px-4 text-left text-muted-foreground font-medium">User</th>
              <th className="py-3 px-4 text-left text-muted-foreground font-medium">Prospect</th>
              <th className="py-3 px-4 text-left text-muted-foreground font-medium">Status</th>
              <th className="py-3 px-4 text-left text-muted-foreground font-medium">Details</th>
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

  const totalPages = Math.ceil(data.total / data.limit);

  const handleRowClick = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="rounded-[14px] overflow-hidden" style={{ background: "var(--bg-card-gradient)", border: "1px solid var(--border-subtle)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/[0.02]">
            <th className="py-3 px-4 text-left text-muted-foreground font-medium">Time</th>
            <th className="py-3 px-4 text-left text-muted-foreground font-medium">Tenant</th>
            <th className="py-3 px-4 text-left text-muted-foreground font-medium">User</th>
            <th className="py-3 px-4 text-left text-muted-foreground font-medium">Prospect</th>
            <th className="py-3 px-4 text-left text-muted-foreground font-medium">Status</th>
            <th className="py-3 px-4 text-left text-muted-foreground font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((record) => {
            const isExpanded = expandedId === record.id;
            const sourceEntries = Object.entries(record.sourceDetails);

            return (
              <>
                <tr
                  key={record.id}
                  className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => handleRowClick(record.id)}
                >
                  <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(record.updatedAt)}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{record.tenantName}</td>
                  <td className="py-3 px-4 text-muted-foreground">{record.userName}</td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/${record.tenantId}/prospects/${record.id}`}
                      className="text-primary hover:underline font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {record.fullName}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center rounded-full border border-destructive/50 bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                      {record.enrichmentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </td>
                </tr>

                {isExpanded && (
                  <tr key={`${record.id}-expanded`} className="border-b border-[var(--border-subtle)]">
                    <td
                      colSpan={6}
                      className="bg-white/[0.02] border-l-2 border-primary/50 px-6 py-3"
                    >
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                        Per-Source Details
                      </p>
                      {sourceEntries.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No source details available.</p>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {sourceEntries.map(([source, detail]) => (
                            <div key={source} className="flex flex-col gap-0.5">
                              <span
                                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getSourceBadgeClass(detail.status)}`}
                              >
                                {source}: {detail.status}
                              </span>
                              {detail.error && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  {detail.error}
                                </span>
                              )}
                              {detail.at && (
                                <span className="text-xs text-muted-foreground/60 ml-1">
                                  {formatRelativeTime(detail.at)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            );
          })}

          {data.data.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-muted-foreground">
                No failed enrichments found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Page {data.page} of {totalPages} ({data.total.toLocaleString()} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(data.page - 1)}
              disabled={data.page <= 1}
              className="inline-flex items-center rounded-md border border-[var(--border-subtle)] px-3 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(data.page + 1)}
              disabled={data.page >= totalPages}
              className="inline-flex items-center rounded-md border border-[var(--border-subtle)] px-3 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
