"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  UserSearch,
  Mail,
  Phone,
  CheckCircle2,
  Eye,
  Loader2,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ProfileHeader } from "./profile-header";
import { QuickActionBar } from "./quick-action-bar";
import { ActivityFilter } from "./activity-filter";
import { TimelineFeed } from "./timeline-feed";
import { IntelligenceDossier } from "./intelligence-dossier";
import { SignalTimeline } from "./signal-timeline";
import { DossierResearchToggle } from "./dossier-research-toggle";
import { ResearchPanel } from "./research-panel";
import { MarketIntelligenceCard } from "./market-intelligence-card";
import { LookalikeDiscovery } from "./lookalike-discovery";
import { useToast } from "@/hooks/use-toast";
import { AddToListDialogProfile } from "./add-to-list-dialog-profile";
import type { ProspectActivity, ActivityCategory } from "@/types/activity";

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
  city?: string | null;
  state?: string | null;
  country?: string | null;
  work_email: string | null;
  work_phone: string | null;
  personal_email: string | null;
  personal_phone: string | null;
  linkedin_url: string | null;
  publicly_traded_symbol?: string | null;
  company_cik?: string | null;
  stock_snapshot?: import("@/types/database").StockSnapshot | null;
  stock_snapshot_at?: string | null;
  enrichment_status?: "none" | "pending" | "in_progress" | "complete" | "failed";
  last_enriched_at?: string | null;
  contact_data?: {
    personal_email?: string;
    phone?: string;
    source?: string;
    enriched_at?: string;
    photo_url?: string;
  } | null;
  web_data?: {
    signals: Array<{
      relevant: boolean;
      category: "career_move" | "funding" | "media" | "wealth_signal" | "company_intel" | "recognition";
      headline: string;
      summary: string;
      source_url: string;
      raw_text: string;
    }>;
    source?: string;
    enriched_at?: string;
  } | null;
  insider_data?: {
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
  ai_summary?: string | null;
  enrichment_source_status?: Record<string, SourceStatus> | null;
  notes?: string | null;
  // Manual override fields (Plan 01)
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
  pinned_note?: string | null;
  lead_owner_id?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  intelligence_dossier?: import("@/types/database").IntelligenceDossierData | null;
  dossier_generated_at?: string | null;
  dossier_model?: string | null;
}

interface ListMembership {
  listId: string;
  listName: string;
  status: string;
  addedAt: string;
}

interface ProfileViewProps {
  prospect: Prospect;
  enrichmentSourceStatus: Record<string, SourceStatus>;
  listMemberships: ListMembership[];
  isStale: boolean;
  orgId: string;
  activityEntries: ProspectActivity[];
  activityUsers: Record<string, { full_name: string }>;
  allLists: Array<{
    id: string;
    name: string;
    description: string | null;
    member_count: number;
  }>;
  canEdit?: boolean;
  teamMembers?: Array<{ id: string; full_name: string; email: string }>;
  tags?: string[];
  tagSuggestions?: string[];
  initialSignals?: Array<import("@/types/database").ProspectSignal & { is_seen: boolean }>;
  signalCount?: number;
}

/**
 * ProfileView — Three-column intelligence dossier layout.
 *
 * Matches the stitch mockup (prospect_intelligence_dossier):
 * - Left column (3/12): Profile card, verified contact, notes
 * - Center column (6/12): Wealth signals & intelligence, company context
 * - Right column (3/12): Enrichment status, activity log
 *
 * No tabs — continuous scroll dossier. All information visible at once.
 */
export function ProfileView({
  prospect,
  enrichmentSourceStatus,
  listMemberships,
  isStale,
  orgId,
  activityEntries,
  activityUsers,
  allLists,
  canEdit,
  teamMembers,
  tags,
  tagSuggestions,
  initialSignals,
  signalCount,
}: ProfileViewProps) {
  const [showLookalikes, setShowLookalikes] = useState(false);
  const [noteText, setNoteText] = useState(prospect.notes ?? "");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [lastSavedNote, setLastSavedNote] = useState(prospect.notes ?? "");
  const [addToListOpen, setAddToListOpen] = useState(false);
  const { toast } = useToast();

  // Dossier/Research tab toggle
  const [activePanel, setActivePanel] = useState<"dossier" | "research">("dossier");
  const lastResearchLogRef = useRef<number>(0);

  const handlePanelChange = useCallback((tab: "dossier" | "research") => {
    setActivePanel(tab);
    if (tab === "research") {
      const now = Date.now();
      // Deduplicate: only log once per hour
      if (now - lastResearchLogRef.current > 3600000) {
        lastResearchLogRef.current = now;
        fetch(`/api/prospects/${prospect.id}/activity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: "team",
            eventType: "profile_viewed",
            title: "Viewed research tab",
            metadata: { section: "research" },
          }),
        }).catch(() => {}); // fire-and-forget
      }
    }
  }, [prospect.id]);

  // Activity Log state
  const [activeCategories, setActiveCategories] = useState<ActivityCategory[]>(['outreach', 'data', 'team', 'custom']);
  const [showSystemEvents, setShowSystemEvents] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleActivityCreated = useCallback(async (_event: ProspectActivity) => {
    setRefreshTrigger(prev => prev + 1);
    // Auto-status upgrade is handled server-side in the POST activity route
  }, []);

  // Photo URL state (controlled so AvatarUpload updates propagate)
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(
    prospect.manual_photo_url ?? prospect.contact_data?.photo_url ?? null
  );

  const handlePhotoUpdated = useCallback((url: string | null) => {
    setCurrentPhotoUrl(url);
  }, []);

  // Tags state (optimistic)
  const [currentTags, setCurrentTags] = useState<string[]>(tags ?? []);

  // Realtime: refresh page when enrichment data updates
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`prospect-${prospect.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "prospects",
          filter: `id=eq.${prospect.id}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [prospect.id, router]);

  // Field save handler — PATCH /api/prospects/[id]/profile
  const handleFieldSave = useCallback(async (field: string, value: string | null) => {
    const res = await fetch(`/api/prospects/${prospect.id}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || "Failed to save");
    }
  }, [prospect.id]);

  // Lead owner handler
  const handleOwnerChange = useCallback(async (ownerId: string | null) => {
    await handleFieldSave("lead_owner_id", ownerId);
  }, [handleFieldSave]);

  // Tags change handler — POST/DELETE per tag
  const handleTagsChange = useCallback(async (newTags: string[]) => {
    const added = newTags.filter((t) => !currentTags.includes(t));
    const removed = currentTags.filter((t) => !newTags.includes(t));

    setCurrentTags(newTags); // optimistic

    for (const tag of added) {
      const res = await fetch(`/api/prospects/${prospect.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
      if (!res.ok) {
        setCurrentTags((prev) => prev.filter((t) => t !== tag)); // revert
      }
    }
    for (const tag of removed) {
      const res = await fetch(`/api/prospects/${prospect.id}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
      if (!res.ok) {
        setCurrentTags((prev) => [...prev, tag]); // revert
      }
    }
  }, [currentTags, prospect.id]);

  const noteHasChanged = noteText !== lastSavedNote;

  const handleSaveNote = useCallback(async () => {
    if (isSavingNote) return;
    setIsSavingNote(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: noteText.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      const saved = noteText.trim();
      setNoteText(saved);
      setLastSavedNote(saved);
      toast({ title: "Note saved" });
    } catch (err) {
      toast({
        title: "Failed to save note",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSavingNote(false);
    }
  }, [noteText, prospect.id, isSavingNote, toast]);

  const hasContact =
    prospect.contact_data?.personal_email || prospect.contact_data?.phone;

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-6 py-4 page-enter">
      {/* Breadcrumbs + Find Lookalikes */}
      <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
        <Breadcrumbs
          items={[
            { label: "Search Results", href: `/${orgId}/search` },
            { label: prospect.full_name },
          ]}
        />
        <button
          className="flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-medium transition-all cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.03)",
            border:
              "1px solid var(--border-default, rgba(255,255,255,0.06))",
            color: "var(--text-primary-ds, var(--text-primary, #e8e4dc))",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(212,175,55,0.15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--border-default, rgba(255,255,255,0.06))";
          }}
          onClick={() => setShowLookalikes((prev) => !prev)}
        >
          <UserSearch className="h-4 w-4 shrink-0" />
          Find Lookalikes
        </button>
      </div>

      {/* Lookalike Discovery (toggled) */}
      {showLookalikes && (
        <div className="mb-4">
          <div className="surface-card rounded-[14px] p-4 md:p-6">
            <h3 className="mb-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Similar People
            </h3>
            <LookalikeDiscovery
              prospectId={prospect.id}
              prospectName={prospect.full_name}
            />
          </div>
        </div>
      )}

      {/* === THREE-COLUMN DOSSIER === */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ─── LEFT COLUMN ─── */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Profile Card */}
          <ProfileHeader
            prospect={{ ...prospect, enrichment_status: prospect.enrichment_status ?? "none" }}
            enrichmentSourceStatus={enrichmentSourceStatus}
            isStale={isStale}
            orgId={orgId}
            onFindLookalikes={() => setShowLookalikes((prev) => !prev)}
            onAddToList={() => setAddToListOpen(true)}
            canEdit={canEdit}
            onFieldSave={handleFieldSave}
            currentPhotoUrl={currentPhotoUrl}
            onPhotoUpdated={handlePhotoUpdated}
            teamMembers={teamMembers}
            onOwnerChange={handleOwnerChange}
            currentTags={currentTags}
            tagSuggestions={tagSuggestions}
            onTagsChange={handleTagsChange}
          />
          <AddToListDialogProfile
            prospectId={prospect.id}
            prospectName={prospect.full_name}
            lists={allLists}
            orgId={orgId}
            open={addToListOpen}
            onOpenChange={setAddToListOpen}
          />

          {/* Verified Contact */}
          <div className="surface-card rounded-[14px] p-5">
            <h3 className="text-foreground font-serif font-bold text-lg mb-4 flex items-center gap-2">
              <CheckCircle2
                className="h-4 w-4 shrink-0"
                style={{ color: "var(--gold-primary)" }}
              />
              Verified Contact
            </h3>
            <div className="space-y-4">
              {/* Email */}
              {(prospect.work_email ||
                prospect.contact_data?.personal_email) && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Mail
                      className="h-4 w-4"
                      style={{
                        color:
                          "var(--text-tertiary, rgba(232,228,220,0.4))",
                      }}
                    />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium text-foreground truncate">
                      {prospect.contact_data?.personal_email ||
                        prospect.work_email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {prospect.contact_data?.personal_email && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{
                            background: "rgba(34,197,94,0.1)",
                            color: "var(--success, #22c55e)",
                            border: "1px solid rgba(34,197,94,0.2)",
                          }}
                        >
                          Verified
                        </span>
                      )}
                      {prospect.contact_data?.enriched_at && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatRelative(prospect.contact_data.enriched_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Phone */}
              {(prospect.work_phone || prospect.contact_data?.phone) && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Phone
                      className="h-4 w-4"
                      style={{
                        color:
                          "var(--text-tertiary, rgba(232,228,220,0.4))",
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {prospect.contact_data?.phone || prospect.work_phone}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {prospect.location
                        ? `Mobile \u00B7 ${prospect.location}`
                        : "Mobile"}
                    </p>
                  </div>
                </div>
              )}

              {/* No contact data */}
              {!prospect.work_email &&
                !prospect.work_phone &&
                !hasContact && (
                  <p className="text-sm text-muted-foreground">
                    No contact info yet. Will appear after enrichment.
                  </p>
                )}
            </div>
          </div>

          {/* List Memberships */}
          {listMemberships.length > 0 && (
            <div className="surface-card rounded-[14px] p-4">
              <div
                className="flex items-center justify-between mb-2 pb-2"
                style={{
                  borderBottom:
                    "1px solid var(--border-default, rgba(255,255,255,0.06))",
                }}
              >
                <p className="text-sm font-serif font-bold text-foreground">
                  Lists
                </p>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {listMemberships.map((m) => (
                  <a
                    key={m.listId}
                    href={`/${orgId}/lists/${m.listId}`}
                    className="text-xs rounded-[20px] px-3 py-1 transition-colors cursor-pointer"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border:
                        "1px solid var(--border-default, rgba(255,255,255,0.06))",
                      color:
                        "var(--text-primary-ds, var(--text-primary, #e8e4dc))",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.borderColor =
                        "rgba(212,175,55,0.15)";
                      (e.currentTarget as HTMLAnchorElement).style.color =
                        "var(--gold-primary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.borderColor =
                        "var(--border-default, rgba(255,255,255,0.06))";
                      (e.currentTarget as HTMLAnchorElement).style.color =
                        "var(--text-primary-ds, var(--text-primary, #e8e4dc))";
                    }}
                  >
                    {m.listName}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Internal Notes */}
          <div className="surface-card rounded-[14px] p-4 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-serif font-bold text-foreground">
                Internal Notes
              </h3>
              <span className="text-[10px] text-muted-foreground">
                PGL Team
              </span>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full rounded-[8px] p-3 text-sm text-foreground placeholder:text-muted-foreground min-h-[120px] resize-none focus:outline-none focus:ring-1"
              style={{
                background: "rgba(255,255,255,0.02)",
                border:
                  "1px solid var(--border-default, rgba(255,255,255,0.06))",
              }}
              placeholder="Add tenant-specific notes regarding this UHNW prospect..."
            />
            <div className="flex justify-end mt-2">
              <button
                className="text-xs font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                style={{ color: "var(--gold-primary)" }}
                disabled={!noteHasChanged || isSavingNote}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "var(--gold-muted)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--gold-primary)";
                }}
                onClick={handleSaveNote}
              >
                {isSavingNote && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                {isSavingNote ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        </div>

        {/* ─── CENTER COLUMN ─── */}
        <div className={`lg:col-span-6 flex flex-col gap-4${activePanel === "research" ? " min-h-[calc(100vh-120px)]" : ""}`}>
          {/* Dossier/Research Toggle */}
          <DossierResearchToggle
            active={activePanel}
            onChange={handlePanelChange}
          />

          {/* Crossfade: Dossier vs Research */}
          <div className={`relative${activePanel === "research" ? " flex-1 flex flex-col" : ""}`}>
            {activePanel === "dossier" ? (
              <div
                key="dossier"
                className="animate-in fade-in slide-in-from-bottom-1 duration-250"
              >
                <IntelligenceDossier
                  dossier={prospect.intelligence_dossier ?? null}
                  generatedAt={prospect.dossier_generated_at ?? null}
                />
              </div>
            ) : (
              <div
                key="research"
                className="animate-in fade-in slide-in-from-bottom-1 duration-250 flex-1 flex flex-col"
              >
                <ResearchPanel
                  prospectId={prospect.id}
                  prospect={{
                    id: prospect.id,
                    first_name: prospect.first_name,
                    last_name: prospect.last_name,
                    full_name: prospect.full_name,
                    title: prospect.title ?? null,
                    company: prospect.company ?? null,
                    location: prospect.location ?? null,
                    manual_photo_url: prospect.manual_photo_url ?? null,
                    contact_data: prospect.contact_data ?? null,
                    intelligence_dossier: prospect.intelligence_dossier ?? null,
                  }}
                  orgId={orgId}
                />
              </div>
            )}
          </div>

          {/* Dossier-only cards — hidden when Research is active so chatbot gets full height */}
          {activePanel === "dossier" && (
            <>
              {/* Wealth Signal Timeline */}
              <SignalTimeline
                prospectId={prospect.id}
                orgId={orgId}
                initialSignals={initialSignals ?? []}
                totalCount={signalCount ?? 0}
              />

              {/* Market Intelligence */}
              <MarketIntelligenceCard
                prospectId={prospect.id}
                orgId={orgId}
                ticker={prospect.publicly_traded_symbol ?? null}
                initialSnapshot={prospect.stock_snapshot ?? null}
                snapshotAt={prospect.stock_snapshot_at ?? null}
              />
            </>
          )}

        </div>

        {/* ─── RIGHT COLUMN ─── */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Enrichment Status Card */}
          <div
            className="rounded-[14px] p-5"
            style={{
              background: "var(--bg-card-gradient, rgba(255,255,255,0.03))",
              border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
            }}
          >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Enrichment Status
                </p>
                <div
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                  style={{
                    background:
                      prospect.enrichment_status === "complete"
                        ? "rgba(34,197,94,0.15)"
                        : prospect.enrichment_status === "in_progress"
                          ? "rgba(212,175,55,0.15)"
                          : "rgba(255,255,255,0.05)",
                    color:
                      prospect.enrichment_status === "complete"
                        ? "var(--success, #22c55e)"
                        : prospect.enrichment_status === "in_progress"
                          ? "var(--gold-primary)"
                          : "var(--text-muted)",
                    border: `1px solid ${
                      prospect.enrichment_status === "complete"
                        ? "rgba(34,197,94,0.25)"
                        : prospect.enrichment_status === "in_progress"
                          ? "rgba(212,175,55,0.25)"
                          : "rgba(255,255,255,0.08)"
                    }`,
                  }}
                >
                  {prospect.enrichment_status === "complete"
                    ? "Complete"
                    : prospect.enrichment_status === "in_progress"
                      ? "Running"
                      : "Pending"}
                </div>
              </div>

              {/* Source status breakdown */}
              {(() => {
                const enrichmentSources = [
                  "contactout",
                  "exa",
                  "sec",
                  ...(prospect.publicly_traded_symbol ? ["market"] : []),
                  "claude",
                ] as string[];
                const shortLabels: Record<string, string> = {
                  contactout: "Contact",
                  exa: "Web",
                  sec: "Filings",
                  market: "Market",
                  claude: "AI",
                };
                return (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {enrichmentSources.map((src) => {
                      const status = enrichmentSourceStatus[src] ?? "pending";
                      const isComplete = status === "complete";
                      const isFailed = status === "failed";
                      const isInProgress = status === "in_progress";
                      const dotColor = isComplete
                        ? "var(--success, #22c55e)"
                        : isFailed
                          ? "var(--destructive, #ef4444)"
                          : isInProgress
                            ? "var(--gold-primary)"
                            : "rgba(255,255,255,0.2)";
                      const textColor = isComplete
                        ? "var(--gold-primary)"
                        : isInProgress
                          ? "var(--gold-primary)"
                          : "var(--text-secondary, rgba(232,228,220,0.5))";
                      return (
                        <div
                          key={src}
                          className="flex items-center px-2 py-1 rounded-[8px] text-[11px] gap-1.5 transition-all flex-1 min-w-[calc(50%-3px)]"
                          style={{
                            border: `1px solid ${isComplete ? "rgba(212,175,55,0.15)" : "var(--border-default, rgba(255,255,255,0.06))"}`,
                            background: isComplete
                              ? "rgba(212,175,55,0.04)"
                              : "transparent",
                            color: textColor,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full inline-block shrink-0"
                            style={{ background: dotColor }}
                          />
                          {shortLabels[src] ?? src}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Last enriched timestamp */}
              {prospect.last_enriched_at && (
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  Last enriched{" "}
                  {formatRelative(prospect.last_enriched_at)}
                </p>
              )}
          </div>

          {/* Activity Log */}
          <div className="surface-card rounded-[14px] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-foreground text-sm font-bold font-serif">Activity</h3>
                {activityEntries.length > 0 && (
                  <span className="text-[10px]" style={{ color: "var(--text-secondary, rgba(232,228,220,0.4))" }}>
                    {activityEntries.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {activityEntries.length > 0 && (
                  <ActivityFilter
                    activeCategories={activeCategories}
                    showSystemEvents={showSystemEvents}
                    onCategoriesChange={setActiveCategories}
                    onShowSystemEventsChange={setShowSystemEvents}
                  />
                )}
                <QuickActionBar
                  prospectId={prospect.id}
                  onActivityCreated={handleActivityCreated}
                />
              </div>
            </div>
            <div
              className="overflow-y-auto px-4 pb-4"
              style={{ maxHeight: activityEntries.length > 0 ? "400px" : "auto" }}
            >
              <TimelineFeed
                prospectId={prospect.id}
                initialEvents={activityEntries}
                initialUsers={activityUsers}
                activeCategories={activeCategories}
                showSystemEvents={showSystemEvents}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>

          {/* Company Context */}
          {(() => {
            const hasCompanyContext = !!(
              prospect.company ||
              prospect.publicly_traded_symbol ||
              prospect.company_cik ||
              prospect.location ||
              prospect.title
            );
            if (!hasCompanyContext) return null;
            return (
              <div className="surface-card rounded-[14px] p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-foreground text-sm font-bold font-serif">
                    Company Context
                  </h3>
                  {prospect.company && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ml-2"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border:
                          "1px solid var(--border-default, rgba(255,255,255,0.06))",
                        color:
                          "var(--text-secondary, rgba(232,228,220,0.5))",
                      }}
                    >
                      {prospect.company.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {prospect.publicly_traded_symbol && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                        Ticker
                      </p>
                      <p className="text-sm font-semibold text-foreground font-mono">
                        {prospect.publicly_traded_symbol}
                      </p>
                    </div>
                  )}
                  {prospect.location && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                        Headquarters
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {prospect.location}
                      </p>
                    </div>
                  )}
                  {(prospect.title || prospect.company_cik) && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Details
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {prospect.title && (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border:
                                "1px solid var(--border-default, rgba(255,255,255,0.06))",
                              color:
                                "var(--text-primary-ds, var(--text-primary, #e8e4dc))",
                            }}
                          >
                            {prospect.title}
                          </span>
                        )}
                        {prospect.company_cik && (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border:
                                "1px solid var(--border-default, rgba(255,255,255,0.06))",
                              color:
                                "var(--text-primary-ds, var(--text-primary, #e8e4dc))",
                            }}
                          >
                            CIK: {prospect.company_cik}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHr = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffHr / 24);
  if (diffHr < 1) return "just now";
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
