"use client";

import {
  Building2,
  Sparkles,
  Plus,
} from "lucide-react";
import { ProspectAvatar } from "./prospect-avatar";

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
  contact_data?: {
    photo_url?: string;
    personal_email?: string;
    phone?: string;
  } | null;
}

interface ProfileHeaderProps {
  prospect: Prospect;
  enrichmentSourceStatus?: Record<string, SourceStatus>;
  isStale: boolean;
  orgId: string;
  onFindLookalikes: () => void;
  onAddToList: () => void;
}

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
  enrichmentSourceStatus: _enrichmentSourceStatus,
  onAddToList,
}: ProfileHeaderProps) {
  return (
    <div className="surface-card surface-card-featured rounded-[14px] p-6 flex flex-col items-center text-center relative overflow-hidden">

      {/* Avatar */}
      <div className="relative z-10 mb-4">
        <ProspectAvatar
          name={prospect.full_name}
          photoUrl={prospect.contact_data?.photo_url}
          email={prospect.work_email || prospect.contact_data?.personal_email}
          size="lg"
        />
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

      {/* Location / Enrichment grid */}
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

    </div>
  );
}
