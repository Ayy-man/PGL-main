"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import type { IssueStatus, IssueReportEventWithActor } from "@/types/database";
import { TimelineCard } from "./timeline-card";

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
  events: IssueReportEventWithActor[];
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

const STATUS_LABEL: Record<IssueStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  resolved: "Resolved",
  wontfix: "Won't Fix",
  duplicate: "Duplicate",
};

const CLOSED_STATUSES: IssueStatus[] = ["resolved", "wontfix", "duplicate"];

const CLOSE_STATUS_OPTIONS: { value: IssueStatus; label: string }[] = STATUS_OPTIONS.filter((o) =>
  CLOSED_STATUSES.includes(o.value)
);

const EVENT_CATEGORY_LABELS: Record<string, string> = {
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

export function ReportDetail({ report: initialReport, screenshotUrl, events: initialEvents }: ReportDetailProps) {
  const [report, setReport] = useState<ReportDetailData>(initialReport);
  const [status, setStatus] = useState<IssueStatus>(initialReport.status);
  const [notes, setNotes] = useState(initialReport.admin_notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [events, setEvents] = useState<IssueReportEventWithActor[]>(initialEvents);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeStatus, setCloseStatus] = useState<IssueStatus>("resolved");
  const [closeNote, setCloseNote] = useState("");

  const isClosing = CLOSED_STATUSES.includes(status);
  const notesEmpty = notes.trim().length === 0;
  const blockCloseForEmptyNote = isClosing && notesEmpty;
  const reportIsClosed = CLOSED_STATUSES.includes(report.status);
  const closeNoteEmpty = closeNote.trim().length === 0;

  const buildDebugPrompt = useCallback(() => {
    const snap = report.target_snapshot as Record<string, unknown> | null;
    const cat = report.category;
    const targetType = report.target_type;
    const lines: string[] = [
      "",
      "## Debugging Guide for Claude Code",
      "",
      "You are debugging a tenant-reported issue in the PGL (Phronesis) platform.",
      "Use the context above to diagnose the root cause.",
      "",
      "### Logging & Telemetry",
      "- **Error log table:** Query `error_log` in Supabase for recent errors matching this tenant/prospect",
      "- **Activity log:** Query `activity_log` table filtered by `tenant_id` and `target_id` for recent actions",
      "- **Vercel runtime logs:** Check Vercel dashboard → Functions tab for the relevant API route",
      "- **Inngest dashboard:** Check `https://app.inngest.com` for `enrich-prospect` function runs if enrichment-related",
      "- **Admin errors page:** `/admin` dashboard has an error feed aggregating recent failures",
      "",
    ];

    // Category-specific guidance
    if (cat === "incorrect_data") {
      lines.push(
        "### Incorrect Data Investigation",
        "The tenant says data is wrong. Check the enrichment pipeline in this order:",
        "",
        "1. **Apollo source data:** `src/lib/apollo/types.ts`, `src/lib/circuit-breaker/apollo-breaker.ts`",
        "   - Check if Apollo returned bad data: query `prospects` table for `apollo_id` and compare `name`, `title`, `company` against Apollo's API response",
        "2. **ContactOut enrichment:** `src/lib/enrichment/contactout.ts`",
        "   - Check `enrichment_source_status.contactout` in the snapshot — if `failed` or `skipped`, ContactOut may have returned garbage",
        "   - ContactOut sandbox API returns fake \"Example Person\" data — check if `CONTACTOUT_API_KEY` is still sandbox-only",
        "3. **AI dossier generation:** `src/lib/enrichment/generate-dossier.ts`",
        "   - If the dossier text is wrong, check the prompt and the Claude model output",
        "   - Check `dossier_model` and `dossier_generated_at` in snapshot for staleness",
        "4. **Manual overrides:** If `has_manual_overrides` is true in the snapshot, a user previously corrected this data — check `manual_*` columns on the `prospects` table",
        "",
      );
    } else if (cat === "missing_data") {
      lines.push(
        "### Missing Data Investigation",
        "The tenant says data is incomplete. Check what enrichment sources ran:",
        "",
        "1. **Check `enrichment_source_status` in snapshot** — which sources are `pending`, `failed`, `skipped`, or `no_data`?",
        "2. **Inngest job status:** `src/inngest/functions/enrich-prospect.ts`",
        "   - If `enrichment_status` is not `complete`, check Inngest for the `enrich-prospect` function run",
        "   - The function has a step-0 duplicate guard — if this prospect was already enriched, re-enrichment requires `force=true` via `POST /api/prospects/{id}/enrich?force=true`",
        "3. **SEC EDGAR:** `src/lib/enrichment/sec-edgar.ts`, `src/lib/sec/efts-search.ts`",
        "   - Check if `company_cik` and `publicly_traded_symbol` are null — if so, SEC lookup was skipped (private company)",
        "   - EFTS uses `entityName=` not `q=` for insider name searches",
        "4. **Exa web research:** `src/lib/enrichment/exa-enrichment.ts`",
        "   - Check if `enrichment_source_status.exa` is `no_data` — Exa may have found no relevant web presence",
        "5. **Signal count:** If `signal_count` is 0, check `prospect_signals` table — signals may exist but with wrong `tenant_id`",
        "",
      );
    } else if (cat === "bad_source") {
      lines.push(
        "### Bad Source Investigation",
        "The tenant says a source link is broken or cites the wrong content:",
        "",
        "1. **Check `prospect_signals` table** for this prospect — look at `source_url` values",
        "   - SEC filing URLs: should point to `sec.gov/cgi-bin/browse-edgar` or `sec.gov/Archives/edgar`",
        "   - Exa URLs: web sources from Exa search — verify they're still live",
        "2. **SEC Form 4 parser:** `src/lib/sec/form4-parser.ts`",
        "   - Check if `source_url` is populated — the unique index on `(prospect_id, source_url)` requires non-null URLs",
        "   - If source_url was null, duplicate signals may have been created on re-enrichment",
        "3. **Dossier citations:** The `intelligence_dossier` may reference source URLs — check if they're still valid",
        "4. **Research pins:** Check `research_pins` table for any Exa research results pinned to this prospect",
        "",
      );
    } else if (cat === "bug") {
      lines.push(
        "### Bug Investigation",
        "The tenant reports broken functionality. Start with the page they were on:",
        "",
        `1. **Page route:** \`${report.page_path}\``,
        `   - Map to source: \`src/app/${report.page_path.replace(/^\/[^/]+\//, "[orgId]/").replace(/\/[0-9a-f-]{36}/g, "/[id]")}\``,
        "2. **Check Vercel runtime logs** for 500s on this route around `" + report.created_at + "`",
        "3. **Check `error_log` table** in Supabase: `SELECT * FROM error_log WHERE created_at > '${report.created_at}'::timestamptz - interval '5 minutes' ORDER BY created_at DESC LIMIT 20`",
        "4. **Check browser errors:** The screenshot may show a broken UI state — compare against the expected layout",
        "5. **Common causes:**",
        "   - RLS policy blocking a query (user gets empty data instead of an error)",
        "   - Supabase column added in migration but not in TypeScript types (`src/types/database.ts`)",
        "   - Null prospect join in `list_members` — always null-guard `list_members.prospects`",
        "   - `APOLLO_MOCK_ENRICHMENT=true` on Vercel returns fake data — check env var",
        "",
      );
    }

    // Target-type-specific file references
    if (targetType === "prospect") {
      lines.push(
        "### Key Files (Prospect)",
        "- Page: `src/app/[orgId]/prospects/[prospectId]/page.tsx`",
        "- Profile view: `src/components/prospect/profile-view.tsx`",
        "- Enrichment pipeline: `src/inngest/functions/enrich-prospect.ts`",
        "- Dossier generator: `src/lib/enrichment/generate-dossier.ts`",
        "- ContactOut: `src/lib/enrichment/contactout.ts`",
        "- Exa: `src/lib/enrichment/exa-enrichment.ts`",
        "- SEC: `src/lib/enrichment/sec-edgar.ts`, `src/lib/sec/form4-parser.ts`",
        "- Types: `src/types/database.ts` (Prospect interface)",
        "- Activity: `src/lib/activity.ts`, `prospect_activity` table",
        "",
      );
    } else if (targetType === "list") {
      lines.push(
        "### Key Files (List)",
        "- Page: `src/app/[orgId]/lists/[listId]/page.tsx`",
        "- Queries: `src/lib/lists/queries.ts`",
        "- Types: `src/lib/lists/types.ts`",
        "- Member table: `src/app/[orgId]/lists/components/list-member-table.tsx`",
        "- Bulk enrich: `src/app/api/apollo/bulk-enrich/route.ts`",
        "",
      );
    } else if (targetType === "search") {
      lines.push(
        "### Key Files (Search)",
        "- Page: `src/app/[orgId]/search/components/search-content.tsx`",
        "- Search hook: `src/app/[orgId]/search/hooks/use-search.ts`",
        "- Apollo API: `src/app/api/search/apollo/route.ts`",
        "- Apollo client: `src/lib/apollo/client.ts`",
        "- NL parser: `src/lib/search/nl-parser.ts`",
        "- Cache: `src/lib/apollo/cache.ts` (Upstash Redis, key version `apollo:search:v3`)",
        "",
      );
    } else if (targetType === "persona") {
      lines.push(
        "### Key Files (Personas)",
        "- Page: `src/app/[orgId]/personas/page.tsx`",
        "- Queries: `src/lib/personas/queries.ts`",
        "- Types: `src/lib/personas/types.ts`",
        "- Saved search refresh: `src/app/api/personas/[id]/refresh/route.ts`",
        "",
      );
    }

    // Enrichment status hints from snapshot
    if (snap) {
      const enrichStatus = snap.enrichment_status as string | null;
      const sourceStatus = snap.enrichment_source_status as Record<string, string> | null;
      if (enrichStatus && enrichStatus !== "complete") {
        lines.push(`**Warning:** Enrichment status is \`${enrichStatus}\` (not complete). Check Inngest for stuck/failed jobs.`);
      }
      if (sourceStatus) {
        const failed = Object.entries(sourceStatus).filter(([, v]) => v === "failed");
        if (failed.length > 0) {
          lines.push(`**Failed enrichment sources:** ${failed.map(([k]) => k).join(", ")} — check individual source handlers.`);
        }
      }
      if (snap.signal_count === 0 && targetType === "prospect") {
        lines.push("**Warning:** Zero signals. Check `prospect_signals` table and enrichment pipeline signal insertion.");
      }
      if (snap.dossier === null && targetType === "prospect") {
        lines.push("**Warning:** No intelligence dossier generated. Check `generate-dossier.ts` and whether Claude enrichment ran.");
      }
    }

    return lines.join("\n");
  }, [report]);

  const buildTimelineSection = useCallback(() => {
    if (events.length === 0) {
      return ["", "## Timeline", "_No events recorded._", ""];
    }
    const actorFor = (ev: IssueReportEventWithActor): string => {
      if (ev.actor) return ev.actor.full_name ?? ev.actor.email;
      if (ev.actor_role === "system") return "System";
      if (ev.actor_role === "tenant") return "Tenant";
      return "Unknown";
    };
    const labelFor = (ev: IssueReportEventWithActor): string => {
      switch (ev.event_type) {
        case "reported": {
          const cat = EVENT_CATEGORY_LABELS[report.category] ?? report.category;
          return `reported (${cat})`;
        }
        case "status_changed": {
          const from = ev.from_status ?? "—";
          const to = ev.to_status ?? "—";
          const isClose = !!ev.to_status && CLOSED_STATUSES.includes(ev.to_status);
          const isReopen =
            !!ev.from_status &&
            CLOSED_STATUSES.includes(ev.from_status) &&
            !!ev.to_status &&
            !CLOSED_STATUSES.includes(ev.to_status);
          if (isClose && ev.to_status) {
            return `closed as ${STATUS_LABEL[ev.to_status]} (${from}→${to})`;
          }
          if (isReopen) {
            return `reopened (${from}→${to})`;
          }
          return `changed status (${from}→${to})`;
        }
        case "note_added":
          return "added note";
        case "viewed_by_admin":
          return "viewed";
        case "screenshot_expired":
          return "screenshot expired";
        default:
          return String(ev.event_type);
      }
    };
    // Events arrive ASC from the API — no reversal needed for chronological export.
    const body = events.map((ev) => {
      const actor = actorFor(ev);
      const label = labelFor(ev);
      const note = ev.note && ev.note.trim().length > 0 ? ` — "${ev.note.trim()}"` : "";
      return `- [${ev.created_at}] ${actor} ${label}${note}`;
    });
    return ["", "## Timeline", ...body, ""];
  }, [events, report.category]);

  const buildFullLog = useCallback(() => {
    const lines: string[] = [
      `# Issue Report: ${CATEGORY_LABELS[report.category] ?? report.category}`,
      `**ID:** ${report.id}`,
      `**Status:** ${report.status}`,
      `**Created:** ${report.created_at}`,
      `**Updated:** ${report.updated_at}`,
      "",
      "## Submitter",
      `- **Tenant:** ${report.tenants?.name ?? "Unknown"} (/${report.tenants?.slug ?? "?"})`,
      `- **User:** ${report.users?.full_name ?? "Unknown"} (${report.users?.email ?? "?"})`,
      "",
      "## Description",
      report.description,
      "",
      "## Target",
      `- **Type:** ${report.target_type ?? "none"}`,
      `- **ID:** ${report.target_id ?? "N/A"}`,
      "",
      "### Target Snapshot",
      "```json",
      JSON.stringify(report.target_snapshot, null, 2),
      "```",
      "",
      "## Page Context",
      `- **URL:** ${report.page_url}`,
      `- **Path:** ${report.page_path}`,
      `- **Viewport:** ${report.viewport ? `${report.viewport.w}x${report.viewport.h}` : "N/A"}`,
      `- **User Agent:** ${report.user_agent ?? "N/A"}`,
      "",
      "## Screenshot",
      screenshotUrl ? `[Signed URL (60min)](${screenshotUrl})` : "No screenshot captured",
      "",
      "## Admin",
      `- **Status:** ${report.status}`,
      `- **Notes:** ${report.admin_notes || "(none)"}`,
      report.resolved_at ? `- **Resolved at:** ${report.resolved_at}` : "",
      report.resolver ? `- **Resolved by:** ${report.resolver.full_name ?? report.resolver.email}` : "",
    ];
    // ## Timeline — chronological audit log of all events (reporter, views, status changes, notes).
    lines.push(...buildTimelineSection());
    lines.push(buildDebugPrompt());
    return lines.filter(Boolean).join("\n");
  }, [report, screenshotUrl, buildDebugPrompt, buildTimelineSection]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(buildFullLog());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [buildFullLog]);

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
        const data = await res.json() as {
          report: Partial<ReportDetailData>;
          event: IssueReportEventWithActor | null;
        };
        setReport((r) => ({ ...r, ...data.report }));
        if (data.event) {
          setEvents((prev) => [...prev, data.event as IssueReportEventWithActor]);
        }
        setSuccess("Changes saved successfully");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unexpected error occurred");
      }
    });
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    const noteTrimmed = closeNote.trim();
    if (noteTrimmed.length === 0) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/reports/${report.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: closeStatus, admin_notes: noteTrimmed }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          setError(body.error ?? "Failed to close ticket");
          return;
        }
        const data = await res.json() as {
          report: Partial<ReportDetailData>;
          event: IssueReportEventWithActor | null;
        };
        // Merge server response (status, admin_notes, resolved_at, resolved_by).
        setReport((r) => ({ ...r, ...data.report }));
        // Sync local status + notes controls so the Save-changes form reflects post-close state.
        setStatus(closeStatus);
        setNotes(noteTrimmed);
        if (data.event) {
          setEvents((prev) => [...prev, data.event as IssueReportEventWithActor]);
        }
        setCloseDialogOpen(false);
        setCloseNote("");
        setSuccess(`Ticket closed as ${STATUS_LABEL[closeStatus]}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unexpected error occurred");
      }
    });
  };

  const handleReopen = () => {
    setError(null);
    setSuccess(null);
    // window.prompt returns null on Cancel → abort. Empty string → reopen without reason.
    const reason = typeof window !== "undefined"
      ? window.prompt("Reason for reopening (optional)")
      : "";
    if (reason === null) return;
    const reasonTrimmed = reason.trim();
    startTransition(async () => {
      try {
        const payload: { status: IssueStatus; admin_notes?: string } = { status: "open" };
        if (reasonTrimmed.length > 0) {
          payload.admin_notes = `Reopened: ${reasonTrimmed}`;
        }
        const res = await fetch(`/api/admin/reports/${report.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          setError(body.error ?? "Failed to reopen ticket");
          return;
        }
        const data = await res.json() as {
          report: Partial<ReportDetailData>;
          event: IssueReportEventWithActor | null;
        };
        // Server clears resolved_at/resolved_by — merge null values into state so Context panel reflects reopen.
        setReport((r) => ({ ...r, ...data.report, resolver: null }));
        setStatus("open");
        if (payload.admin_notes !== undefined) {
          setNotes(payload.admin_notes);
        }
        if (data.event) {
          setEvents((prev) => [...prev, data.event as IssueReportEventWithActor]);
        }
        setSuccess("Ticket reopened");
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
    <div className="space-y-6 max-w-7xl">
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

      {/* 1. Header: category + status + created + copy (full width above split) */}
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
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 h-8 rounded-[8px] px-3 text-xs font-medium transition-colors"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: copied ? "var(--success)" : "var(--text-secondary-ds)",
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Copy full report"}
        </button>
      </div>

      {/* 2-column split: report content on the left, admin actions + timeline sticky on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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

        </div>
        {/* Right column: admin actions + timeline, sticky above the fold on lg: */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6 lg:self-start">
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
                {blockCloseForEmptyNote && (
                  <p className="text-xs" style={{ color: "var(--destructive, #ef4444)" }}>
                    A note is required when closing an issue.
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

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={isPending || blockCloseForEmptyNote}
                  className="h-9 rounded-[8px] px-4 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    background: "var(--gold-bg-strong)",
                    border: "1px solid var(--border-gold)",
                    color: "var(--gold-primary)",
                  }}
                >
                  {isPending ? "Saving…" : "Save changes"}
                </button>

                {!reportIsClosed && (
                  <button
                    onClick={() => {
                      setCloseDialogOpen((v) => !v);
                      setError(null);
                      setSuccess(null);
                    }}
                    disabled={isPending}
                    className="h-9 rounded-[8px] px-4 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-gold)",
                      color: "var(--gold-primary)",
                    }}
                  >
                    {closeDialogOpen ? "Cancel close" : "Close ticket"}
                  </button>
                )}

                {reportIsClosed && (
                  <button
                    onClick={handleReopen}
                    disabled={isPending}
                    className="h-9 rounded-[8px] px-4 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--destructive)",
                      color: "var(--destructive, #ef4444)",
                    }}
                  >
                    {isPending ? "Reopening…" : "Reopen ticket"}
                  </button>
                )}
              </div>

              {closeDialogOpen && !reportIsClosed && (
                <div
                  className="space-y-3 rounded-[8px] border p-3"
                  style={{
                    background: "var(--bg-root)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--admin-text-secondary)" }}
                  >
                    Close ticket
                  </p>
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-medium text-muted-foreground"
                      htmlFor="close-status-select"
                    >
                      Resolution
                    </label>
                    <select
                      id="close-status-select"
                      value={closeStatus}
                      onChange={(e) => setCloseStatus(e.target.value as IssueStatus)}
                      className="w-full h-9 rounded-[8px] border px-3 text-sm focus:outline-none"
                      style={inputStyle}
                    >
                      {CLOSE_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-medium text-muted-foreground"
                      htmlFor="close-note"
                    >
                      Resolution note <span style={{ color: "var(--destructive)" }}>*</span>
                    </label>
                    <textarea
                      id="close-note"
                      value={closeNote}
                      onChange={(e) => setCloseNote(e.target.value)}
                      placeholder="What was done to resolve this? (required)"
                      rows={3}
                      className="w-full rounded-[8px] border px-3 py-2 text-sm resize-none focus:outline-none"
                      style={inputStyle}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleClose}
                      disabled={isPending || closeNoteEmpty}
                      className="h-9 rounded-[8px] px-4 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      style={{
                        background: "var(--gold-bg-strong)",
                        border: "1px solid var(--border-gold)",
                        color: "var(--gold-primary)",
                      }}
                    >
                      {isPending ? "Closing…" : "Confirm close"}
                    </button>
                    <button
                      onClick={() => {
                        setCloseDialogOpen(false);
                        setCloseNote("");
                      }}
                      disabled={isPending}
                      className="h-9 rounded-[8px] px-4 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      style={{
                        background: "transparent",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary-ds)",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
          <TimelineCard
            events={events}
            reporterName={report.users?.full_name ?? report.users?.email ?? null}
            category={report.category}
            description={report.description}
          />
        </div>
      </div>
    </div>
  );
}
