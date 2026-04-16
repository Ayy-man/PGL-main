"use client";

import {
  Building2,
  Plus,
  Sparkles,
} from "lucide-react";
import { ProspectAvatar } from "./prospect-avatar";
import { InlineEditField } from "./inline-edit-field";
import { AvatarUpload } from "./avatar-upload";
import { LeadOwnerSelect } from "./lead-owner-select";
import { TagInput } from "@/components/ui/tag-input";
import { resolveField, isOverridden } from "@/lib/prospects/resolve-fields";

type SourceStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "failed"
  | "skipped"
  | "circuit_open"
  | "no_data";

interface Prospect {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  work_email: string | null;
  work_phone: string | null;
  linkedin_url: string | null;
  enrichment_status: string;
  contact_data?: {
    photo_url?: string;
    personal_email?: string;
    phone?: string;
  } | null;
  // Manual override fields
  manual_display_name?: string | null;
  manual_title?: string | null;
  manual_company?: string | null;
  manual_email?: string | null;
  manual_phone?: string | null;
  manual_linkedin_url?: string | null;
  manual_city?: string | null;
  manual_state?: string | null;
  manual_country?: string | null;
  manual_photo_url?: string | null;
  manual_wealth_tier?: string | null;
  // Auto-estimated wealth tier (Phase 43)
  auto_wealth_tier?: string | null;
  auto_wealth_tier_confidence?: string | null;
  auto_wealth_tier_reasoning?: string | null;
  auto_wealth_tier_estimated_at?: string | null;
  pinned_note?: string | null;
  lead_owner_id?: string | null;
}

interface ProfileHeaderProps {
  prospect: Prospect;
  enrichmentSourceStatus?: Record<string, SourceStatus>;
  isStale: boolean;
  orgId: string;
  onFindLookalikes: () => void;
  onAddToList: () => void;
  canEdit?: boolean;
  onFieldSave?: (field: string, value: string | null) => Promise<void>;
  currentPhotoUrl?: string | null;
  onPhotoUpdated?: (url: string | null) => void;
  teamMembers?: Array<{ id: string; full_name: string; email: string }>;
  onOwnerChange?: (ownerId: string | null) => Promise<void>;
  currentTags?: string[];
  tagSuggestions?: string[];
  onTagsChange?: (tags: string[]) => void;
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
  canEdit,
  onFieldSave,
  currentPhotoUrl,
  onPhotoUpdated,
  teamMembers,
  onOwnerChange,
  currentTags,
  tagSuggestions,
  onTagsChange,
}: ProfileHeaderProps) {
  return (
    <div className="surface-card surface-card-featured rounded-[14px] p-5 flex flex-col items-center text-center relative overflow-hidden">

      {/* Avatar */}
      <div className="relative z-10 mb-3">
        {canEdit ? (
          <AvatarUpload
            currentPhotoUrl={currentPhotoUrl ?? null}
            prospectName={prospect.full_name}
            prospectId={prospect.id}
            isEditable={canEdit}
            onPhotoUpdated={onPhotoUpdated ?? (() => {})}
          />
        ) : (
          <ProspectAvatar
            name={prospect.full_name}
            photoUrl={currentPhotoUrl ?? prospect.contact_data?.photo_url}
            email={prospect.work_email || prospect.contact_data?.personal_email}
            size="lg"
          />
        )}
      </div>

      {/* Name */}
      <h1 className="font-serif text-2xl font-bold text-foreground mb-1">
        <InlineEditField
          value={resolveField(prospect.manual_display_name, prospect.full_name)}
          originalValue={prospect.full_name}
          onSave={async (v) => { await onFieldSave?.("manual_display_name", v); }}
          isEditable={canEdit}
          isOverridden={isOverridden(prospect.manual_display_name)}
          label="Display name"
          displayClassName="text-xl font-semibold text-[var(--text-primary)]"
        />
      </h1>

      {/* Title */}
      <div
        className="text-sm font-medium mb-3"
        style={{ color: "var(--gold-primary)" }}
      >
        <InlineEditField
          value={resolveField(prospect.manual_title, prospect.title)}
          originalValue={prospect.title}
          onSave={async (v) => { await onFieldSave?.("manual_title", v); }}
          isEditable={canEdit}
          isOverridden={isOverridden(prospect.manual_title)}
          label="Title"
          placeholder="Add title..."
          displayClassName="text-sm text-muted-foreground"
        />
      </div>

      {/* Company */}
      <div className="text-sm text-muted-foreground mb-3 flex items-center gap-1.5 justify-center">
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <InlineEditField
          value={resolveField(prospect.manual_company, prospect.company)}
          originalValue={prospect.company}
          onSave={async (v) => { await onFieldSave?.("manual_company", v); }}
          isEditable={canEdit}
          isOverridden={isOverridden(prospect.manual_company)}
          label="Company"
          placeholder="Add company..."
          displayClassName="text-sm text-muted-foreground"
        />
      </div>

      {/* Enrichment status grid */}
      <div className="w-full grid grid-cols-1 gap-3 mb-3">
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

      {/* Contact info inline edits */}
      <div className="w-full text-left space-y-1.5 mb-3">
        <div className="flex flex-col gap-1">
          <InlineEditField
            value={resolveField(prospect.manual_email, prospect.work_email)}
            originalValue={prospect.work_email}
            onSave={async (v) => { await onFieldSave?.("manual_email", v); }}
            isEditable={canEdit}
            isOverridden={isOverridden(prospect.manual_email)}
            label="Email"
            type="email"
            placeholder="Add email..."
            displayClassName="text-sm text-muted-foreground"
          />
        </div>
        <div className="flex flex-col gap-1">
          <InlineEditField
            value={resolveField(prospect.manual_phone, prospect.work_phone)}
            originalValue={prospect.work_phone}
            onSave={async (v) => { await onFieldSave?.("manual_phone", v); }}
            isEditable={canEdit}
            isOverridden={isOverridden(prospect.manual_phone)}
            label="Phone"
            type="tel"
            placeholder="Add phone..."
            displayClassName="text-sm text-muted-foreground"
          />
        </div>
      </div>

      {/* LinkedIn URL */}
      <div className="w-full text-left mb-2">
        <InlineEditField
          value={resolveField(prospect.manual_linkedin_url, prospect.linkedin_url)}
          originalValue={prospect.linkedin_url}
          onSave={async (v) => { await onFieldSave?.("manual_linkedin_url", v); }}
          isEditable={canEdit}
          isOverridden={isOverridden(prospect.manual_linkedin_url)}
          label="LinkedIn"
          type="url"
          placeholder="Add LinkedIn URL..."
          displayClassName="text-sm text-muted-foreground"
        />
      </div>

      {/* Wealth Tier — manual override wins; else fall back to auto_wealth_tier with Sparkles + reasoning tooltip (Phase 43 D-07) */}
      {(() => {
        const manualTier = prospect.manual_wealth_tier ?? null;
        const autoTier = prospect.auto_wealth_tier ?? null;
        const isAutoDisplayed = !manualTier && !!autoTier;
        const reasoning = prospect.auto_wealth_tier_reasoning ?? undefined;
        return (
          <div
            className="w-full text-left mb-2"
            title={isAutoDisplayed ? reasoning : undefined}
          >
            <div className="flex items-center gap-1">
              {isAutoDisplayed && (
                <Sparkles
                  className="h-3 w-3 shrink-0"
                  style={{ color: "var(--gold-primary)" }}
                  aria-label="Auto-estimated wealth tier"
                />
              )}
              <div className="flex-1 min-w-0">
                <InlineEditField
                  value={resolveField(manualTier, autoTier)}
                  originalValue={autoTier}
                  onSave={async (v) => { await onFieldSave?.("manual_wealth_tier", v); }}
                  isEditable={canEdit}
                  isOverridden={isOverridden(manualTier)}
                  label="Wealth Tier"
                  type="select"
                  options={[
                    { label: "Ultra-High ($50M+)", value: "ultra_high" },
                    { label: "Very High ($10-50M)", value: "very_high" },
                    { label: "High ($5-10M)", value: "high" },
                    { label: "Emerging ($1-5M)", value: "emerging" },
                    { label: "Unknown", value: "unknown" },
                  ]}
                  placeholder="Set wealth tier..."
                  displayClassName="text-sm text-muted-foreground"
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Location inline edits */}
      <div className="w-full mt-2 pt-2 border-t border-[var(--border-default)] text-left">
        <p className="text-xs text-muted-foreground mb-1">Location</p>
        <div className="space-y-0.5">
          <InlineEditField
            value={resolveField(prospect.manual_city, prospect.city)}
            originalValue={prospect.city}
            onSave={async (v) => { await onFieldSave?.("manual_city", v); }}
            isEditable={canEdit}
            isOverridden={isOverridden(prospect.manual_city)}
            label="City"
            placeholder="Add city..."
            displayClassName="text-sm text-muted-foreground"
          />
          <InlineEditField
            value={resolveField(prospect.manual_state, prospect.state)}
            originalValue={prospect.state}
            onSave={async (v) => { await onFieldSave?.("manual_state", v); }}
            isEditable={canEdit}
            isOverridden={isOverridden(prospect.manual_state)}
            label="State"
            placeholder="Add state..."
            displayClassName="text-sm text-muted-foreground"
          />
          <InlineEditField
            value={resolveField(prospect.manual_country, prospect.country)}
            originalValue={prospect.country}
            onSave={async (v) => { await onFieldSave?.("manual_country", v); }}
            isEditable={canEdit}
            isOverridden={isOverridden(prospect.manual_country)}
            label="Country"
            placeholder="Add country..."
            displayClassName="text-sm text-muted-foreground"
          />
        </div>
      </div>

      {/* Pinned note */}
      {(prospect.pinned_note || canEdit) && (
        <div className="w-full mt-2 pt-2 border-t border-[var(--border-default)] text-left">
          <InlineEditField
            value={prospect.pinned_note ?? null}
            onSave={async (v) => { await onFieldSave?.("pinned_note", v); }}
            isEditable={canEdit}
            label="Pinned note"
            placeholder="Add a pinned note..."
            displayClassName="text-xs text-muted-foreground italic"
          />
        </div>
      )}

      {/* Lead owner */}
      {teamMembers && teamMembers.length > 0 && (
        <div className="w-full mt-2 pt-2 border-t border-[var(--border-default)] text-left">
          <p className="text-xs text-muted-foreground mb-1">Assigned to</p>
          <LeadOwnerSelect
            currentOwnerId={prospect.lead_owner_id ?? null}
            teamMembers={teamMembers}
            isEditable={canEdit}
            onOwnerChange={onOwnerChange ?? (async () => {})}
          />
        </div>
      )}

      {/* Tags */}
      <div className="w-full mt-2 pt-2 border-t border-[var(--border-default)] text-left">
        <p className="text-xs text-muted-foreground mb-1">Tags</p>
        {canEdit ? (
          <TagInput
            value={currentTags ?? []}
            onChange={onTagsChange ?? (() => {})}
            suggestions={tagSuggestions}
            placeholder="Add tags..."
          />
        ) : (
          <div className="flex flex-wrap gap-1">
            {(currentTags ?? []).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs bg-[var(--gold-bg)] text-[var(--gold-text)]"
              >
                {tag}
              </span>
            ))}
            {(!currentTags || currentTags.length === 0) && (
              <span className="text-xs text-muted-foreground">No tags</span>
            )}
          </div>
        )}
      </div>

      {/* CTA Buttons */}
      <div className="w-full flex flex-col gap-2 mt-3">
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
