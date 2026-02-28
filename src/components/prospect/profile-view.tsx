"use client";

import { useState } from "react";
import { Mail, Phone, Linkedin } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ProfileHeader } from "./profile-header";
import { ProfileTabs, type ProfileTabName } from "./profile-tabs";
import { ActivityTimeline } from "./activity-timeline";
import { SECFilingsTable } from "./sec-filings-table";
import { EnrichmentTab } from "./enrichment-tab";
import { NotesTab } from "./notes-tab";
import { ListsTab } from "./lists-tab";
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
 * ProfileView Component
 *
 * Two-column layout:
 * - Breadcrumbs > ProfileHeader > sticky ProfileTabs
 * - Left (340px): ActivityTimeline
 * - Right (flex-1): Tab content (Overview / Activity / SEC Filings / Enrichment / Notes / Lists)
 *
 * LookalikeDiscovery toggled via "Find Lookalikes" button in ProfileHeader.
 * All card containers use surface-card utility. No bg-card + inline gradient style.
 *
 * Covers: PROF-01 through PROF-10
 */
export function ProfileView({
  prospect,
  enrichmentSourceStatus,
  listMemberships,
  isStale,
  orgId,
  activityEntries,
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabName>("overview");
  const [showLookalikes, setShowLookalikes] = useState(false);

  const transactions = prospect.insider_data?.transactions ?? [];
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="flex flex-col min-h-0">
      {/* Breadcrumbs */}
      <div className="px-14 pt-6">
        <Breadcrumbs
          items={[
            { label: "Search Results", href: `/${orgId}/search` },
            { label: prospect.full_name },
          ]}
        />
      </div>

      {/* Profile Header */}
      <ProfileHeader
        prospect={prospect}
        isStale={isStale}
        orgId={orgId}
        onFindLookalikes={() => setShowLookalikes((prev) => !prev)}
        onAddToList={() => setActiveTab("lists")}
      />

      {/* Sticky Tab Bar */}
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Lookalike Discovery (toggled by Find Lookalikes button) */}
      {showLookalikes && (
        <div className="px-14 pt-6">
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

      {/* Two-column layout */}
      <div className="flex gap-8 p-14">
        {/* Left column: Activity Timeline */}
        <aside className="w-[340px] shrink-0">
          <div className="surface-card rounded-[14px] p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Activity
            </h3>
            <ActivityTimeline events={activityEntries} />
          </div>
        </aside>

        {/* Right column: Tab content */}
        <div className="flex-1 min-w-0">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Info grid — 2x3 */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div className="surface-card rounded-[14px] p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Title
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {prospect.title || "—"}
                  </p>
                </div>

                <div className="surface-card rounded-[14px] p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Company
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {prospect.company || "—"}
                  </p>
                </div>

                <div className="surface-card rounded-[14px] p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Location
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {prospect.location || "—"}
                  </p>
                </div>

                <div className="surface-card rounded-[14px] p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Work Email
                  </p>
                  {prospect.work_email ? (
                    <a
                      href={`mailto:${prospect.work_email}`}
                      className="text-sm font-medium text-foreground transition-colors hover:text-[var(--gold-primary)]"
                    >
                      {prospect.work_email}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">—</p>
                  )}
                </div>

                <div className="surface-card rounded-[14px] p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Work Phone
                  </p>
                  {prospect.work_phone ? (
                    <a
                      href={`tel:${prospect.work_phone}`}
                      className="text-sm font-medium text-foreground transition-colors hover:text-[var(--gold-primary)]"
                    >
                      {prospect.work_phone}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">—</p>
                  )}
                </div>

                <div className="surface-card rounded-[14px] p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    LinkedIn
                  </p>
                  {prospect.linkedin_url ? (
                    <a
                      href={prospect.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-[var(--gold-primary)]"
                    >
                      <Linkedin className="h-3.5 w-3.5 shrink-0" />
                      Profile
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">—</p>
                  )}
                </div>
              </div>

              {/* AI Insight block */}
              <div
                className="rounded-[14px] border border-l-2 pl-6 pr-6 py-5"
                style={{
                  background: "var(--bg-card-gradient)",
                  borderColor: "rgba(255,255,255,0.06)",
                  borderLeftColor: "var(--border-gold)",
                }}
              >
                <h3
                  className="mb-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--gold-primary)" }}
                >
                  AI Insight
                </h3>
                {prospect.ai_summary ? (
                  <p className="text-sm text-foreground leading-relaxed">
                    {prospect.ai_summary}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    AI summary will be generated after enrichment completes.
                  </p>
                )}
              </div>

              {/* Recent SEC Transactions (top 5) */}
              {recentTransactions.length > 0 && (
                <div className="surface-card rounded-[14px] p-6">
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent SEC Transactions
                  </h3>
                  <SECFilingsTable
                    transactions={recentTransactions}
                    totalValue={prospect.insider_data?.total_value}
                  />
                </div>
              )}

              {/* Contact Section */}
              <div className="surface-card rounded-[14px] p-6">
                <h3 className="mb-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact Information
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Work Contact */}
                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Work
                    </h4>
                    <div className="space-y-3">
                      {prospect.work_email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`mailto:${prospect.work_email}`}
                            className="text-sm text-foreground transition-colors hover:text-[var(--gold-primary)]"
                          >
                            {prospect.work_email}
                          </a>
                        </div>
                      )}
                      {prospect.work_phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`tel:${prospect.work_phone}`}
                            className="text-sm text-foreground transition-colors hover:text-[var(--gold-primary)]"
                          >
                            {prospect.work_phone}
                          </a>
                        </div>
                      )}
                      {prospect.linkedin_url && (
                        <div className="flex items-center gap-3">
                          <Linkedin className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={prospect.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-foreground transition-colors hover:text-[var(--gold-primary)]"
                          >
                            LinkedIn Profile
                          </a>
                        </div>
                      )}
                      {!prospect.work_email &&
                        !prospect.work_phone &&
                        !prospect.linkedin_url && (
                          <p className="text-sm text-muted-foreground">
                            No work contact info
                          </p>
                        )}
                    </div>
                  </div>

                  {/* Personal Contact */}
                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Personal (ContactOut)
                    </h4>
                    <div className="space-y-3">
                      {prospect.contact_data?.personal_email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`mailto:${prospect.contact_data.personal_email}`}
                            className="text-sm text-foreground transition-colors hover:text-[var(--gold-primary)]"
                          >
                            {prospect.contact_data.personal_email}
                          </a>
                        </div>
                      )}
                      {prospect.contact_data?.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`tel:${prospect.contact_data.phone}`}
                            className="text-sm text-foreground transition-colors hover:text-[var(--gold-primary)]"
                          >
                            {prospect.contact_data.phone}
                          </a>
                        </div>
                      )}
                      {!prospect.contact_data && (
                        <p className="text-sm text-muted-foreground">
                          Not enriched — personal contact will be added after enrichment.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div className="surface-card rounded-[14px] p-6">
              <h3 className="mb-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Activity Log
              </h3>
              {activityEntries.length > 0 ? (
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-background">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Action
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {activityEntries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {entry.user_id.slice(0, 8)}&hellip;
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize bg-muted text-muted-foreground">
                              {entry.action_type.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {entry.metadata
                              ? JSON.stringify(entry.metadata).slice(0, 60)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No activity recorded yet.
                </p>
              )}
            </div>
          )}

          {/* SEC Filings Tab */}
          {activeTab === "sec-filings" && (
            <div className="surface-card rounded-[14px] p-6">
              <h3 className="mb-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                SEC Filings
              </h3>
              <SECFilingsTable
                transactions={transactions}
                totalValue={prospect.insider_data?.total_value}
              />
            </div>
          )}

          {/* Enrichment Tab */}
          {activeTab === "enrichment" && (
            <EnrichmentTab
              sourceStatus={enrichmentSourceStatus}
              prospectId={prospect.id}
            />
          )}

          {/* Notes Tab */}
          {activeTab === "notes" && (
            <NotesTab notes={[]} prospectId={prospect.id} />
          )}

          {/* Lists Tab */}
          {activeTab === "lists" && (
            <ListsTab
              memberships={listMemberships}
              orgId={orgId}
              onAddToList={() => {
                // Stub: feature phase will open AddToListDialog
                console.log("Add to list triggered from Lists tab");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
