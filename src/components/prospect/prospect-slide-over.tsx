"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  MessageSquare,
  Mail,
  Phone,
  MoreHorizontal,
  X,
  Sparkles,
  Circle,
  CheckCircle2,
  XCircle,
  Loader2,
  Minus,
} from "lucide-react";
import Link from "next/link";

type SourceStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "failed"
  | "skipped"
  | "circuit_open";

interface Transaction {
  date: string;
  transactionType: string;
  shares: number;
  pricePerShare: number;
  totalValue: number;
}

interface Note {
  id: string;
  body: string;
  author: string;
  createdAt: string;
}

interface Prospect {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  work_email: string | null;
  wealth_tier?: string | null;
  ai_summary: string | null;
  enrichment_source_status: Record<string, SourceStatus> | null;
  insider_data: {
    transactions: Transaction[];
    total_value?: number;
    source?: string;
    enriched_at?: string;
  } | null;
}

interface ListMembership {
  listId: string;
  listName: string;
}

interface ProspectSlideOverProps {
  open: boolean;
  onClose: () => void;
  prospectId: string | null;
  prospect?: Prospect | null;
  listMemberships?: ListMembership[];
  notes?: Note[];
  orgId?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  contactout: "ContactOut",
  exa: "Exa",
  sec: "SEC EDGAR",
  claude: "Claude AI",
};

function getEnrichmentPercentage(
  sourceStatus: Record<string, SourceStatus> | null
): number {
  if (!sourceStatus) return 0;
  const entries = Object.values(sourceStatus);
  if (entries.length === 0) return 0;
  const complete = entries.filter((s) => s === "complete").length;
  return Math.round((complete / entries.length) * 100);
}

function getSourceTagStyle(status: SourceStatus): string {
  switch (status) {
    case "complete":
      return "bg-success-muted text-success border border-success/30";
    case "failed":
      return "bg-destructive/15 text-destructive border border-destructive/30";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

function EnrichmentIcon({
  status,
}: {
  status: SourceStatus;
}): React.ReactElement {
  switch (status) {
    case "pending":
      return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
    case "in_progress":
      return (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-info" />
      );
    case "complete":
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />;
    case "failed":
      return <XCircle className="h-4 w-4 shrink-0 text-destructive" />;
    case "skipped":
      return <Minus className="h-4 w-4 shrink-0 text-muted-foreground" />;
    case "circuit_open":
      return <Circle className="h-4 w-4 shrink-0 text-warning" />;
    default:
      return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function ProspectSlideOver({
  open,
  onClose,
  prospectId,
  prospect,
  listMemberships = [],
  notes = [],
  orgId,
}: ProspectSlideOverProps) {
  const enrichmentPct = getEnrichmentPercentage(
    prospect?.enrichment_source_status ?? null
  );
  const sourceStatus = prospect?.enrichment_source_status ?? {};
  const transactions = prospect?.insider_data?.transactions?.slice(0, 5) ?? [];

  const initials = prospect
    ? `${prospect.first_name?.[0] ?? ""}${prospect.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        style={{
          width: "min(480px, 90vw)",
          background: "#0d0d10",
          borderLeft: "1px solid rgba(212,175,55,0.1)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
        }}
        className="p-0 overflow-y-auto"
      >
        {/* Panel Header (sticky) */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-7 py-5"
          style={{ background: "#0d0d10" }}
        >
          <button
            onClick={onClose}
            aria-label="Close prospect panel"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted transition-colors hover:bg-accent cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {prospect && orgId && prospectId ? (
            <Link
              href={`/${orgId}/prospects/${prospectId}`}
              className="cursor-pointer text-sm transition-colors hover:text-[var(--gold-muted)]"
              style={{ color: "var(--gold-primary)" }}
            >
              View Full Profile
            </Link>
          ) : (
            <span
              className="cursor-pointer text-sm transition-colors hover:text-[var(--gold-muted)]"
              style={{ color: "var(--gold-primary)" }}
            >
              View Full Profile
            </span>
          )}
        </div>

        {/* Panel Body */}
        {prospect ? (
          <div className="px-7 space-y-6 pb-10">
            {/* 1. Identity Block */}
            <div className="flex flex-col gap-4">
              {/* Avatar + Name + Email */}
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-border text-sm font-semibold text-foreground"
                  style={{ background: "var(--bg-card)" }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 className="font-serif text-[24px] font-semibold text-foreground leading-tight">
                    {prospect.full_name}
                  </h2>
                  {prospect.work_email && (
                    <p className="truncate text-sm text-muted-foreground">
                      {prospect.work_email}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Circles */}
              <div className="flex items-center gap-3">
                <button
                  aria-label="Send message"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
                <button
                  aria-label="Send email"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                >
                  <Mail className="h-4 w-4" />
                </button>
                <button
                  aria-label="Call prospect"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                >
                  <Phone className="h-4 w-4" />
                </button>
                <button
                  aria-label="More actions"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 2. Quick Info Grid */}
            <div
              className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-border"
              style={{ background: "var(--bg-card-gradient)" }}
            >
              {/* Title */}
              <div className="border-b border-r border-border p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Title
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {prospect.title ?? "—"}
                </p>
              </div>
              {/* Company */}
              <div className="border-b border-border p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Company
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {prospect.company ?? "—"}
                </p>
              </div>
              {/* Location */}
              <div className="border-r border-border p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Location
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {prospect.location ?? "—"}
                </p>
              </div>
              {/* Wealth Tier */}
              <div className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Wealth Tier
                </p>
                <p
                  className="mt-1 text-sm font-medium"
                  style={{
                    color: prospect.wealth_tier
                      ? "var(--gold-primary)"
                      : "var(--text-secondary)",
                  }}
                >
                  {prospect.wealth_tier ?? "—"}
                </p>
              </div>
            </div>

            {/* 3. Enrichment Progress */}
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2">
                <Sparkles
                  className="h-4 w-4 shrink-0"
                  style={{ color: "var(--gold-primary)" }}
                />
                <span className="text-sm font-medium text-foreground">
                  Enrichment
                </span>
                <span className="ml-auto text-sm text-muted-foreground">
                  {enrichmentPct}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-[var(--gold-muted)] to-[var(--gold-primary)] transition-all duration-500"
                  style={{ width: `${enrichmentPct}%` }}
                />
              </div>

              {/* Source Tags */}
              {Object.keys(sourceStatus).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(sourceStatus).map(([key, status]) => (
                    <span
                      key={key}
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${getSourceTagStyle(status)}`}
                    >
                      <EnrichmentIcon status={status} />
                      {SOURCE_LABELS[key] ?? key}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 4. AI Summary */}
            <div
              className="border-l-2 pl-4 py-3"
              style={{ borderColor: "var(--border-gold)" }}
            >
              <p
                className="mb-2 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--gold-primary)" }}
              >
                AI Insight
              </p>
              {prospect.ai_summary ? (
                <p className="text-sm leading-relaxed text-foreground">
                  {prospect.ai_summary}
                </p>
              ) : (
                <button
                  className="mt-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                  style={{
                    borderColor: "rgba(212,175,55,0.3)",
                    color: "var(--gold-primary)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "var(--gold-bg)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                >
                  Generate Summary
                </button>
              )}
            </div>

            {/* 5. SEC Insider Transactions */}
            {transactions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    SEC Insider Transactions
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {transactions.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {transactions.map((tx, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                      style={{ background: "var(--bg-card-gradient)" }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">
                          {tx.transactionType}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeDate(tx.date)} &middot;{" "}
                          {tx.shares.toLocaleString()} shares
                        </p>
                      </div>
                      <span
                        className="ml-4 shrink-0 font-mono text-sm font-semibold"
                        style={{ color: "var(--gold-primary)" }}
                      >
                        {formatCurrency(tx.totalValue)}
                      </span>
                    </div>
                  ))}
                </div>

                {(prospect.insider_data?.transactions?.length ?? 0) > 5 && (
                  <button
                    className="text-xs transition-colors cursor-pointer"
                    style={{ color: "var(--gold-primary)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "var(--gold-muted)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "var(--gold-primary)";
                    }}
                  >
                    View All Transactions
                  </button>
                )}
              </div>
            )}

            {/* 6. Notes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Notes
                </span>
                <button
                  className="text-xs transition-colors cursor-pointer"
                  style={{ color: "var(--gold-primary)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "var(--gold-muted)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "var(--gold-primary)";
                  }}
                >
                  + Add Note
                </button>
              </div>

              {notes.length > 0 ? (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="space-y-1 rounded-md bg-muted p-3"
                    >
                      <p className="text-sm text-foreground">{note.body}</p>
                      <p className="text-xs text-muted-foreground">
                        {note.author} &middot;{" "}
                        {formatRelativeDate(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No notes yet. Add a note to track interactions.
                </p>
              )}
            </div>

            {/* 7. Lists Membership */}
            <div className="space-y-3">
              <span className="text-sm font-semibold text-foreground">
                Lists
              </span>
              <div className="flex flex-wrap gap-2">
                {listMemberships.map((membership) => (
                  <span
                    key={membership.listId}
                    className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground"
                  >
                    {membership.listName}
                  </span>
                ))}
                <button
                  className="rounded-full border border-dashed px-3 py-1 text-xs transition-colors cursor-pointer"
                  style={{
                    borderColor: "rgba(212,175,55,0.3)",
                    color: "var(--gold-primary)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "var(--gold-bg)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                >
                  + Add to List
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Loading / empty state */
          <div className="flex flex-col items-center justify-center px-7 py-20 text-center">
            <Loader2
              className="mb-4 h-8 w-8 animate-spin"
              style={{ color: "var(--gold-muted)" }}
            />
            <p className="text-sm text-muted-foreground">
              Loading prospect details...
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
