"use client";

import { useState } from "react";
import {
  UserSearch,
  Mail,
  Phone,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ProfileHeader } from "./profile-header";
import { ActivityTimeline } from "./activity-timeline";
import { WealthSignals } from "./wealth-signals";
import { LookalikeDiscovery } from "./lookalike-discovery";

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
  publicly_traded_symbol: string | null;
  company_cik: string | null;
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
  activityEntries: Array<{
    id: string;
    action_type: string;
    user_id: string;
    created_at: string;
    metadata?: Record<string, unknown>;
  }>;
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
}: ProfileViewProps) {
  const [showLookalikes, setShowLookalikes] = useState(false);
  const [noteText, setNoteText] = useState("");

  const hasContact =
    prospect.contact_data?.personal_email || prospect.contact_data?.phone;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6 page-enter">
      {/* Breadcrumbs + Find Lookalikes */}
      <div className="flex flex-wrap gap-2 mb-6 items-center justify-between">
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
        <div className="mb-6">
          <div className="surface-card rounded-[14px] p-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ─── LEFT COLUMN ─── */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Profile Card */}
          <ProfileHeader
            prospect={prospect}
            enrichmentSourceStatus={enrichmentSourceStatus}
            isStale={isStale}
            orgId={orgId}
            onFindLookalikes={() => setShowLookalikes((prev) => !prev)}
            onAddToList={() => {
              console.log("Add to list triggered");
            }}
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
                className="text-xs font-medium cursor-pointer transition-colors"
                style={{ color: "var(--gold-primary)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--gold-muted)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--gold-primary)";
                }}
                onClick={() => {
                  if (noteText.trim()) {
                    console.log("Save note (stub):", noteText.trim());
                    setNoteText("");
                  }
                }}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>

        {/* ─── CENTER COLUMN ─── */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* Wealth Signals & Intelligence */}
          <WealthSignals
            webData={prospect.web_data}
            insiderData={prospect.insider_data}
          />

          {/* Company Context */}
          {prospect.company && (
            <div className="surface-card rounded-[14px] p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-foreground text-lg font-bold font-serif">
                  Company Context
                </h3>
                <span
                  className="text-xs font-bold px-2 py-1 rounded"
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
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  {prospect.publicly_traded_symbol && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Ticker
                      </p>
                      <p className="text-sm font-semibold text-foreground font-mono">
                        {prospect.publicly_traded_symbol}
                      </p>
                    </div>
                  )}
                  {prospect.location && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Headquarters
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {prospect.location}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                    Details
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {prospect.title && (
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
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
                        className="px-2 py-1 rounded text-xs font-medium"
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
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT COLUMN ─── */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Enrichment Status Card */}
          <div
            className="rounded-[14px] p-[1px] relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(212,175,55,0.2), transparent, rgba(212,175,55,0.08))",
            }}
          >
            <div
              className="rounded-[13px] p-5 relative z-10 h-full flex flex-col justify-between"
              style={{
                background: "var(--bg-card, rgba(255,255,255,0.03))",
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
              <div className="grid grid-cols-2 gap-2 mt-3">
                {(["contactout", "exa", "sec", "claude"] as const).map(
                  (src) => {
                    const status = enrichmentSourceStatus[src] ?? "pending";
                    const isComplete = status === "complete";
                    return (
                      <div
                        key={src}
                        className="flex items-center justify-center p-2 rounded-[8px] text-xs gap-1 transition-all"
                        style={{
                          border: `1px solid ${isComplete ? "rgba(212,175,55,0.15)" : "var(--border-default, rgba(255,255,255,0.06))"}`,
                          background: isComplete
                            ? "rgba(212,175,55,0.04)"
                            : "transparent",
                          color: isComplete
                            ? "var(--gold-primary)"
                            : "var(--text-secondary, rgba(232,228,220,0.5))",
                        }}
                      >
                        {isComplete && (
                          <span
                            className="h-1.5 w-1.5 rounded-full inline-block"
                            style={{
                              background: "var(--success, #22c55e)",
                            }}
                          />
                        )}
                        {src.charAt(0).toUpperCase() + src.slice(1)}
                      </div>
                    );
                  }
                )}
              </div>

              {/* Last enriched timestamp */}
              {prospect.last_enriched_at && (
                <p className="text-[10px] text-muted-foreground mt-3 text-center">
                  Last enriched{" "}
                  {formatRelative(prospect.last_enriched_at)}
                </p>
              )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="surface-card rounded-[14px] flex flex-col flex-1 overflow-hidden">
            <div
              className="p-5"
              style={{
                borderBottom:
                  "1px solid var(--border-default, rgba(255,255,255,0.06))",
              }}
            >
              <h3 className="text-foreground text-lg font-bold font-serif">
                Activity Log
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Recent team touchpoints
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <ActivityTimeline events={activityEntries} />
            </div>
          </div>
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
