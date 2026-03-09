"use client";

import {
  Mail,
  Phone,
  Linkedin,
  Globe,
  Building2,
  Sparkles,
  Plus,
  Brain,
  Search,
  Landmark,
  UserCheck,
} from "lucide-react";

type SourceStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "failed"
  | "skipped"
  | "circuit_open";

interface Prospect {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  work_email: string | null;
  work_phone: string | null;
  linkedin_url: string | null;
  enrichment_status: string;
}

interface ProfileHeaderProps {
  prospect: Prospect;
  enrichmentSourceStatus: Record<string, SourceStatus>;
  isStale: boolean;
  orgId: string;
  onFindLookalikes: () => void;
  onAddToList: () => void;
}

function getInitials(first: string, last: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function getAvatarGradient(name: string): string {
  const hue =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 30%, 25%), hsl(${hue}, 20%, 15%))`;
}

const ENRICHMENT_SOURCES = [
  { key: "contactout", Icon: UserCheck, label: "ContactOut" },
  { key: "exa", Icon: Search, label: "Exa" },
  { key: "sec", Icon: Landmark, label: "SEC" },
  { key: "claude", Icon: Brain, label: "Claude" },
] as const;

/**
 * ProfileHeader — Left-column profile card for the prospect dossier.
 *
 * Vertical card layout matching the stitch mockup:
 * - Circular avatar with gold gradient header
 * - Name (Cormorant), title (gold), company
 * - Enrichment source status icons (4 circles)
 * - Location / Wealth Tier grid
 * - Draft Outreach + Add to List CTAs
 * - Social link icons row
 */
export function ProfileHeader({
  prospect,
  enrichmentSourceStatus,
  onAddToList,
}: ProfileHeaderProps) {
  const initials = getInitials(prospect.first_name, prospect.last_name);
  const avatarGradient = getAvatarGradient(prospect.full_name);

  return (
    <div className="surface-card rounded-[14px] p-6 flex flex-col items-center text-center relative overflow-hidden">
      {/* Gold gradient header wash */}
      <div
        className="absolute top-0 left-0 w-full h-24 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(212,175,55,0.08) 0%, transparent 100%)",
        }}
      />

      {/* Avatar */}
      <div className="relative z-10 mb-4">
        <div
          className="h-28 w-28 rounded-full flex items-center justify-center mx-auto font-serif text-3xl font-semibold"
          style={{
            border: "3px solid var(--border-default)",
            background: avatarGradient,
            color: "var(--text-primary-ds, var(--text-primary, #e8e4dc))",
          }}
        >
          {initials}
        </div>
      </div>

      {/* Name */}
      <h1 className="font-serif text-2xl font-bold text-foreground mb-1">
        {prospect.full_name}
      </h1>

      {/* Title in gold */}
      {prospect.title && (
        <p
          className="text-sm font-medium mb-3"
          style={{ color: "var(--gold-primary)" }}
        >
          {prospect.title}
        </p>
      )}

      {/* Company */}
      {prospect.company && (
        <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5 justify-center">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          {prospect.company}
        </p>
      )}

      {/* Enrichment Source Icons */}
      <div className="flex items-center justify-center gap-2 mb-5 w-full">
        {ENRICHMENT_SOURCES.map(({ key, Icon, label }) => {
          const status = enrichmentSourceStatus[key] ?? "pending";
          const isComplete = status === "complete";
          return (
            <div
              key={key}
              className="relative flex items-center justify-center h-8 w-8 rounded-full transition-colors cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${isComplete ? "var(--border-gold)" : "var(--border-default, rgba(255,255,255,0.06))"}`,
              }}
              title={`${label}: ${status}`}
            >
              <Icon
                className="h-4 w-4 shrink-0"
                style={{
                  color: isComplete
                    ? "var(--gold-primary)"
                    : "var(--text-muted, rgba(255,255,255,0.25))",
                }}
              />
              {isComplete && (
                <div
                  className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full"
                  style={{
                    background: "var(--success, #22c55e)",
                    border: "2px solid var(--bg-root, #08080a)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Location / Wealth Tier grid */}
      <div className="w-full grid grid-cols-2 gap-3 mb-5">
        <div
          className="rounded-[8px] p-3"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border-default, rgba(255,255,255,0.06))",
          }}
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Location
          </p>
          <p className="text-sm font-semibold text-foreground truncate">
            {prospect.location || "\u2014"}
          </p>
        </div>
        <div
          className="rounded-[8px] p-3"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border-default, rgba(255,255,255,0.06))",
          }}
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Enrichment
          </p>
          <p className="text-sm font-semibold text-foreground capitalize">
            {prospect.enrichment_status === "complete"
              ? "Complete"
              : prospect.enrichment_status === "in_progress"
                ? "Running"
                : "Pending"}
          </p>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="w-full flex flex-col gap-2">
        <button
          className="w-full h-10 rounded-[8px] text-sm font-semibold flex items-center justify-center gap-2 transition-all opacity-50 cursor-not-allowed"
          style={{
            background: "var(--gold-bg-strong)",
            border: "1px solid var(--border-gold)",
            color: "var(--gold-primary)",
          }}
          disabled
          title="Coming Soon"
          aria-label="Draft Outreach — Coming Soon"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          Draft Outreach
        </button>
        <button
          className="w-full h-10 rounded-[8px] text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border-default, rgba(255,255,255,0.06))",
            color: "var(--text-primary-ds, var(--text-primary, #e8e4dc))",
          }}
          onClick={onAddToList}
        >
          <Plus className="h-4 w-4 shrink-0" />
          Add to List
        </button>
      </div>

      {/* Social Links */}
      <div
        className="mt-5 w-full pt-4 flex justify-center gap-6"
        style={{
          borderTop:
            "1px solid var(--border-default, rgba(255,255,255,0.06))",
        }}
      >
        {prospect.work_email && (
          <a
            href={`mailto:${prospect.work_email}`}
            className="text-muted-foreground transition-colors cursor-pointer"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--gold-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--text-tertiary)";
            }}
            aria-label="Send email"
          >
            <Mail className="h-5 w-5" />
          </a>
        )}
        {prospect.work_phone && (
          <a
            href={`tel:${prospect.work_phone}`}
            className="transition-colors cursor-pointer"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--gold-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--text-tertiary)";
            }}
            aria-label="Call phone"
          >
            <Phone className="h-5 w-5" />
          </a>
        )}
        {prospect.linkedin_url && (
          <a
            href={prospect.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors cursor-pointer"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--gold-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--text-tertiary)";
            }}
            aria-label="LinkedIn profile"
          >
            <Linkedin className="h-5 w-5" />
          </a>
        )}
        <button
          className="transition-colors cursor-pointer"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--gold-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--text-tertiary)";
          }}
          aria-label="Website"
        >
          <Globe className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
