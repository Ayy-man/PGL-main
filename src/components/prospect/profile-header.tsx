"use client";

import { Mail, Phone, MoreHorizontal, Plus, UserSearch, MapPin, AlertCircle } from "lucide-react";

type SourceStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "failed"
  | "skipped"
  | "circuit_open";

interface Prospect {
  id: string;
  tenant_id: string;
  apollo_id: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  work_email: string | null;
  work_phone: string | null;
  personal_email: string | null;
  personal_phone: string | null;
  linkedin_url: string | null;
  enrichment_status: "none" | "pending" | "in_progress" | "complete" | "failed";
  last_enriched_at: string | null;
  contact_data: {
    personal_email?: string;
    phone?: string;
    source?: string;
    enriched_at?: string;
  } | null;
  web_data: {
    mentions: Array<{
      title: string;
      snippet: string;
      url: string;
      publishedDate?: string;
    }>;
    wealth_signals?: string[];
    source?: string;
    enriched_at?: string;
  } | null;
  insider_data: {
    transactions: Array<{
      date: string;
      transactionType: string;
      shares: number;
      pricePerShare: number;
      totalValue: number;
    }>;
    total_value?: number;
    source?: string;
    enriched_at?: string;
  } | null;
  ai_summary: string | null;
  enrichment_source_status: Record<string, SourceStatus> | null;
  created_at: string;
  updated_at: string;
}

interface ProfileHeaderProps {
  prospect: Prospect;
  isStale: boolean;
  onFindLookalikes: () => void;
  onAddToList: () => void;
  orgId: string;
}

function getInitials(first: string, last: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function getAvatarGradient(name: string): string {
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 30%, 25%), hsl(${hue}, 20%, 15%))`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProfileHeader({
  prospect,
  isStale,
  onFindLookalikes,
  onAddToList,
}: ProfileHeaderProps) {
  const initials = getInitials(prospect.first_name, prospect.last_name);
  const titleCompany = [prospect.title, prospect.company].filter(Boolean).join(" \u00B7 ");

  return (
    <div
      className="py-5 px-4 lg:py-7 lg:px-14 border-b border-border bg-gradient-to-b from-card to-background"
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 lg:gap-6">
        {/* Left: Avatar + Info (always horizontal row) */}
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-border font-serif text-[22px] font-semibold"
            style={{
              background: getAvatarGradient(prospect.full_name),
              color: "var(--text-primary-ds)",
            }}
          >
            {initials}
          </div>

          {/* Name + metadata */}
          <div className="min-w-0">
            {/* Name */}
            <h1
              className="font-serif text-[24px] lg:text-[28px] font-bold leading-tight text-foreground"
            >
              {prospect.full_name}
            </h1>

            {/* Title + Company */}
            {titleCompany && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {titleCompany}
              </p>
            )}

            {/* Location */}
            {prospect.location && (
              <div className="mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{prospect.location}</span>
              </div>
            )}

            {/* Created date */}
            <p className="mt-1 text-xs text-muted-foreground">
              Added {formatDate(prospect.created_at)}
            </p>

            {/* Stale data warning */}
            {isStale && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-warning/30 bg-warning-muted px-3 py-1.5 text-xs text-warning">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Data may be outdated — refreshing enrichment...
              </div>
            )}
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick contact actions */}
          <button
            className="flex h-9 items-center gap-2 rounded-[8px] border border-border px-3 text-sm text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-foreground"
            aria-label="Send email"
            onClick={() => {
              if (prospect.work_email) {
                window.location.href = `mailto:${prospect.work_email}`;
              }
            }}
          >
            <Mail className="h-4 w-4 shrink-0" />
          </button>

          <button
            className="flex h-9 items-center gap-2 rounded-[8px] border border-border px-3 text-sm text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-foreground"
            aria-label="Call phone"
            onClick={() => {
              if (prospect.work_phone) {
                window.location.href = `tel:${prospect.work_phone}`;
              }
            }}
          >
            <Phone className="h-4 w-4 shrink-0" />
          </button>

          <button
            className="flex h-9 items-center gap-2 rounded-[8px] border border-border px-3 text-sm text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-foreground"
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4 shrink-0" />
          </button>

          <button
            className="flex h-9 items-center gap-2 rounded-[8px] border border-border px-3 text-sm text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-foreground"
            onClick={onAddToList}
          >
            <Plus className="h-4 w-4 shrink-0" />
            Add to List
          </button>

          <button
            className="flex h-9 items-center gap-2 rounded-[8px] border border-border px-3 text-sm text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-foreground"
            onClick={onFindLookalikes}
          >
            <UserSearch className="h-4 w-4 shrink-0" />
            Find Lookalikes
          </button>

          {/* Draft Outreach — disabled, coming soon; hidden on mobile */}
          <button
            className="hidden lg:flex h-9 items-center gap-2 rounded-[8px] px-4 text-sm font-medium opacity-50 cursor-not-allowed"
            style={{
              background: "var(--gold-bg-strong)",
              border: "1px solid var(--border-gold)",
              color: "var(--gold-primary)",
            }}
            disabled
            title="Coming Soon"
            aria-label="Draft Outreach — Coming Soon"
          >
            Draft Outreach
          </button>
        </div>
      </div>
    </div>
  );
}
