"use client";

import { Mail, Phone, Linkedin, UserPlus, MapPin } from "lucide-react";
import { WealthTierBadge } from "@/components/ui/wealth-tier-badge";
import { EnrichmentStatusDots } from "@/components/ui/enrichment-status-dots";

type SourceStatus = "pending" | "in_progress" | "complete" | "failed" | "skipped" | "circuit_open";

interface ProspectCardProps {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  title: string | null;
  company: string | null;
  location: string | null;
  wealthTier: string | null;
  workEmail: string | null;
  personalEmail?: string | null;
  phone?: string | null;
  linkedinUrl: string | null;
  aiSummary: string | null;
  enrichmentSourceStatus: Record<string, SourceStatus> | null;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onClick?: (id: string) => void;
  onAddToList?: (id: string) => void;
}

function getInitials(first: string, last: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function getAvatarGradient(name: string): string {
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 30%, 25%), hsl(${hue}, 20%, 15%))`;
}

export function ProspectCard({
  id,
  fullName,
  firstName,
  lastName,
  title,
  company,
  location,
  wealthTier,
  workEmail,
  personalEmail,
  phone,
  linkedinUrl,
  aiSummary,
  enrichmentSourceStatus,
  selected = false,
  onSelect,
  onClick,
  onAddToList,
}: ProspectCardProps) {
  const initials = getInitials(firstName, lastName);
  const hasEmail = !!(workEmail || personalEmail);
  const hasPhone = !!phone;
  const hasLinkedin = !!linkedinUrl;

  return (
    <div
      className="flex items-start gap-[18px] rounded-[12px] px-7 py-6 transition-all duration-200 cursor-pointer"
      style={{
        background: selected ? "var(--gold-bg)" : "var(--bg-card-gradient)",
        border: `1px solid ${selected ? "var(--border-gold)" : "var(--border-subtle)"}`,
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)";
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLElement).style.background = "var(--bg-card-gradient)";
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
        }
      }}
      onClick={() => onClick?.(id)}
    >
      {/* Checkbox */}
      {onSelect && (
        <div className="flex items-center pt-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-border accent-[var(--gold-primary)] cursor-pointer"
            aria-label={`Select ${fullName}`}
          />
        </div>
      )}

      {/* Avatar */}
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-serif text-[18px] font-semibold"
        style={{
          background: getAvatarGradient(fullName),
          color: "var(--text-primary-ds)",
        }}
      >
        {initials}
      </div>

      {/* Info block */}
      <div className="min-w-0 flex-1">
        {/* Name + Wealth Tier */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-serif text-[20px] font-semibold leading-tight"
            style={{ color: "var(--text-primary-ds)" }}
          >
            {fullName}
          </span>
          <WealthTierBadge tier={wealthTier} />
        </div>

        {/* Title + Company */}
        {(title || company) && (
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary-ds)" }}>
            {[title, company].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Location */}
        {location && (
          <p className="mt-0.5 flex items-center gap-1 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            <MapPin className="h-3 w-3 shrink-0" />
            {location}
          </p>
        )}

        {/* AI Insight */}
        {aiSummary && (
          <div
            className="mt-3 rounded-md px-3 py-2"
            style={{
              borderLeft: "2px solid var(--border-gold)",
              background: "var(--gold-bg)",
            }}
          >
            <p
              className="mb-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--gold-primary)" }}
            >
              AI Insight
            </p>
            <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary-ds)" }}>
              {aiSummary}
            </p>
          </div>
        )}

        {/* Enrichment dots */}
        <EnrichmentStatusDots sourceStatus={enrichmentSourceStatus} className="mt-2" />
      </div>

      {/* Right section: Contact icons + Add to List */}
      <div className="flex flex-col items-end gap-3 shrink-0">
        {/* Contact availability icons */}
        <div className="flex items-center gap-2">
          <ContactCircle available={hasEmail} icon={Mail} label="Email" />
          <ContactCircle available={hasPhone} icon={Phone} label="Phone" />
          <ContactCircle available={hasLinkedin} icon={Linkedin} label="LinkedIn" />
        </div>

        {/* Add to List */}
        {onAddToList && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToList(id);
            }}
            className="flex items-center gap-1 rounded-[8px] px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 cursor-pointer"
            style={{
              background: "rgba(212,175,55,0.1)",
              border: "1px solid rgba(212,175,55,0.25)",
              color: "var(--gold-primary)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.18)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.1)";
            }}
          >
            <UserPlus className="h-3.5 w-3.5 shrink-0" />
            Add to List
          </button>
        )}
      </div>
    </div>
  );
}

function ContactCircle({
  available,
  icon: Icon,
  label,
}: {
  available: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div
      className="flex h-7 w-7 items-center justify-center rounded-full shrink-0"
      title={`${label}: ${available ? "Available" : "Not available"}`}
      style={{
        background: available ? "var(--gold-bg)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${available ? "var(--border-gold)" : "var(--border-subtle)"}`,
        color: available ? "var(--gold-primary)" : "var(--text-ghost)",
      }}
    >
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}
