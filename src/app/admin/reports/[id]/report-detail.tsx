"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import type { IssueStatus } from "@/types/database";

interface ResolverUser {
  id: string;
  email: string;
  full_name: string | null;
}

interface ReportDetailData {
  id: string;
  category: string;
  description: string;
  page_url: string;
  page_path: string;
  user_agent: string | null;
  viewport: { w: number; h: number } | null;
  target_type: string | null;
  target_id: string | null;
  target_snapshot: Record<string, unknown> | null;
  screenshot_path: string | null;
  status: IssueStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  tenants: { id: string; name: string; slug: string } | null;
  users: { id: string; email: string; full_name: string | null } | null;
  resolver: ResolverUser | null;
}

interface ReportDetailProps {
  report: ReportDetailData;
  screenshotUrl: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  incorrect_data: "Incorrect data",
  missing_data: "Missing data",
  bad_source: "Bad source",
  bug: "Bug",
  other: "Other",
};

const STATUS_OPTIONS: { value: IssueStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "wontfix", label: "Won't Fix" },
  { value: "duplicate", label: "Duplicate" },
];

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
    open: { bg: "bg-amber-500/10", text: "text-amber-400" },
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="surface-admin-card rounded-[14px] p-5 space-y-3"
    >
      <h2
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--admin-text-secondary)" }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

export function ReportDetail({ report: initialReport, screenshotUrl }: ReportDetailProps) {
  const [report, setReport] = useState<ReportDetailData>(initialReport);
  const [status, setStatus] = useState<IssueStatus>(initialReport.status);
  const [notes, setNotes] = useState(initialReport.admin_notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/reports/${report.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, admin_notes: notes }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          setError(body.error ?? "Failed to save changes");
          return;
        }
        const data = await res.json() as { report: Partial<ReportDetailData> };
        setReport((r) => ({ ...r, ...data.report }));
        setSuccess("Changes saved successfully");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unexpected error occurred");
      }
    });
  };

  const inputStyle = {
    background: "var(--bg-elevated)",
    borderColor: "var(--border-subtle)",
    color: "var(--text-primary-ds)",
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back navigation */}
      <div>
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: "var(--text-secondary-ds)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Issue Reports
        </Link>
      </div>

      {/* 1. Header: category + status + created */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1
            className="font-serif text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-primary-ds)" }}
          >
            {CATEGORY_LABELS[report.category] ?? report.category}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={report.status} />
            <span className="text-sm text-muted-foreground">
              Reported {formatRelativeTime(report.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Submitter */}
      <SectionCard title="Submitter">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Tenant</p>
            <p style={{ color: "var(--text-primary-ds)" }} className="font-medium">
              {report.tenants?.name ?? "Unknown"}
            </p>
            {report.tenants?.slug && (
              <p className="text-xs text-muted-foreground">/{report.tenants.slug}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">User</p>
            <p style={{ color: "var(--text-primary-ds)" }} className="font-medium">
              {report.users?.full_name ?? "Unknown"}
            </p>
            {report.users?.email && (
              <p className="text-xs text-muted-foreground">{report.users.email}</p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* 3. Description */}
      <SectionCard title="Description">
        <p
          className="text-sm whitespace-pre-wrap leading-relaxed"
          style={{ color: "var(--text-primary-ds)" }}
        >
          {report.description}
        </p>
      </SectionCard>

      {/* 4. Target snapshot (hidden if null) */}
      {report.target_snapshot && (
        <SectionCard title={`Target: ${report.target_type ?? "unknown"}`}>
          <pre
            className="text-xs overflow-auto rounded-[8px] p-3 max-h-64"
            style={{
              background: "var(--bg-root)",
              color: "var(--text-secondary-ds)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {JSON.stringify(report.target_snapshot, null, 2)}
          </pre>
        </SectionCard>
      )}

      {/* 5. Screenshot (hidden if no URL) */}
      {screenshotUrl && (
        <SectionCard title="Screenshot">
          <div
            className="rounded-[8px] overflow-hidden border"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshotUrl}
              alt="Issue screenshot"
              className="w-full h-auto max-h-[600px] object-contain"
              style={{ background: "var(--bg-root)" }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Screenshot captured at report submission time. Signed URL expires in 60 minutes.
          </p>
        </SectionCard>
      )}

      {/* 6. Original URL (informational) */}
      <SectionCard title="Tenant URL (informational)">
        <a
          href={report.page_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm break-all transition-colors"
          style={{ color: "var(--gold-primary)" }}
        >
          {report.page_url}
        </a>
        <p className="text-xs text-muted-foreground">
          Live tenant URL at time of report. Cross-tenant access is not available — use snapshot for context.
        </p>
      </SectionCard>

      {/* 7. Context (collapsible) */}
      <div
        className="surface-admin-card rounded-[14px] overflow-hidden"
      >
        <button
          onClick={() => setContextExpanded((v) => !v)}
          className="w-full flex items-center justify-between p-5 text-left transition-colors admin-row-hover"
        >
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--admin-text-secondary)" }}
          >
            Context
          </span>
          {contextExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {contextExpanded && (
          <div
            className="px-5 pb-5 space-y-2 text-sm border-t"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Page path</p>
                <p className="font-mono text-xs" style={{ color: "var(--text-primary-ds)" }}>
                  {report.page_path}
                </p>
              </div>
              {report.viewport && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Viewport</p>
                  <p className="font-mono text-xs" style={{ color: "var(--text-primary-ds)" }}>
                    {report.viewport.w} × {report.viewport.h}
                  </p>
                </div>
              )}
              {report.user_agent && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground mb-0.5">User agent</p>
                  <p
                    className="font-mono text-xs break-all"
                    style={{ color: "var(--text-secondary-ds)" }}
                  >
                    {report.user_agent}
                  </p>
                </div>
              )}
              {report.resolved_at && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Resolved at</p>
                  <p className="text-xs" style={{ color: "var(--text-primary-ds)" }}>
                    {new Date(report.resolved_at).toLocaleString()}
                  </p>
                </div>
              )}
              {report.resolver && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Resolved by</p>
                  <p className="text-xs" style={{ color: "var(--text-primary-ds)" }}>
                    {report.resolver.full_name ?? report.resolver.email}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 8. Admin actions */}
      <SectionCard title="Admin Actions">
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
        {success && (
          <div
            className="rounded-[8px] border px-4 py-3 text-sm"
            style={{
              background: "var(--success-muted)",
              borderColor: "var(--success)",
              color: "var(--success)",
            }}
          >
            {success}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="status-select"
            >
              Status
            </label>
            <select
              id="status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as IssueStatus)}
              className="w-full h-9 rounded-[8px] border px-3 text-sm focus:outline-none"
              style={inputStyle}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {status === "resolved" && report.status !== "resolved" && (
              <p className="text-xs text-muted-foreground">
                Saving as resolved will automatically record your user ID and the timestamp.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="admin-notes"
            >
              Admin notes
            </label>
            <textarea
              id="admin-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes visible only to super admins…"
              rows={4}
              className="w-full rounded-[8px] border px-3 py-2 text-sm resize-none focus:outline-none"
              style={inputStyle}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isPending}
            className="h-9 rounded-[8px] px-4 text-sm font-semibold transition-colors disabled:opacity-60"
            style={{
              background: "var(--gold-bg-strong)",
              border: "1px solid var(--border-gold)",
              color: "var(--gold-primary)",
            }}
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
