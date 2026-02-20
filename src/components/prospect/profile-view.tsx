"use client";

import { useState } from "react";
import { EnrichmentStatus } from "./enrichment-status";
import { WealthSignals } from "./wealth-signals";
import { LookalikeDiscovery } from "./lookalike-discovery";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { addToListAction } from "@/app/[orgId]/lists/actions";
import { useRouter } from "next/navigation";
import {
  Plus,
  Download,
  UserSearch,
  MapPin,
  Mail,
  Phone,
  Linkedin,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

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
}

/**
 * ProfileView Component
 *
 * Main profile view with sections:
 * 1. Header: Name, title, company, location, quick actions
 * 2. Enrichment Status Bar: Per-source status indicators
 * 3. Contact Section: Work and personal contact info
 * 4. AI Summary Section: "Why Recommended" with Claude-generated summary
 * 5. Wealth Signals Section: Web mentions and SEC transactions
 * 6. Lists Section: List memberships table
 *
 * Uses design system tokens (gold, foreground, card, muted-foreground).
 * font-serif (Playfair Display) for headings, font-sans (Inter) for body.
 */
export function ProfileView({
  prospect,
  enrichmentSourceStatus,
  listMemberships,
  isStale,
}: ProfileViewProps) {
  const router = useRouter();
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [showLookalikeDiscovery, setShowLookalikeDiscovery] = useState(false);

  // Mock lists for "Add to List" dropdown - in production, fetch from API
  const availableLists = [
    { id: "1", name: "High Priority" },
    { id: "2", name: "Follow Up" },
    { id: "3", name: "Qualified Leads" },
  ];

  const handleAddToList = async (listId: string) => {
    setIsAddingToList(true);
    try {
      const result = await addToListAction(listId, prospect.id);
      if (result.success) {
        router.refresh();
      } else {
        console.error("Failed to add to list:", result.error);
      }
    } catch (error) {
      console.error("Error adding to list:", error);
    } finally {
      setIsAddingToList(false);
    }
  };

  const handleExport = () => {
    // Placeholder for profile export
    console.log("Export Profile - to be implemented");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header Section */}
        <div className="rounded-lg border bg-card p-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="mb-2 font-serif text-4xl font-bold text-foreground">
                {prospect.full_name}
              </h1>
              {prospect.title && prospect.company && (
                <p className="mb-3 text-xl text-foreground">
                  {prospect.title} @ {prospect.company}
                </p>
              )}
              {prospect.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{prospect.location}</span>
                </div>
              )}
              {isStale && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-warning/30 bg-warning-muted px-3 py-1.5 text-sm text-warning">
                  <AlertCircle className="h-4 w-4" />
                  Data may be outdated - refreshing...
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isAddingToList}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add to List
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {availableLists.map((list) => (
                    <DropdownMenuItem
                      key={list.id}
                      onClick={() => handleAddToList(list.id)}
                      className="cursor-pointer"
                    >
                      {list.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                onClick={() => setShowLookalikeDiscovery(!showLookalikeDiscovery)}
                className="cursor-pointer"
              >
                <UserSearch className="mr-2 h-4 w-4" />
                {showLookalikeDiscovery ? "Hide" : "Show"} Similar People
              </Button>

              <Button
                variant="outline"
                onClick={handleExport}
                className="cursor-pointer"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Profile
              </Button>
            </div>
          </div>
        </div>

        {/* Enrichment Status Bar */}
        <EnrichmentStatus
          sourceStatus={enrichmentSourceStatus}
          prospectId={prospect.id}
        />

        {/* Contact Section */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-6 font-serif text-xl font-semibold text-foreground">
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
                      className="text-sm text-foreground hover:text-gold transition-colors"
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
                      className="text-sm text-foreground hover:text-gold transition-colors"
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
                      className="text-sm text-foreground hover:text-gold transition-colors"
                    >
                      LinkedIn Profile
                    </a>
                  </div>
                )}
                {!prospect.work_email &&
                  !prospect.work_phone &&
                  !prospect.linkedin_url && (
                    <p className="text-sm text-muted-foreground">No work contact info</p>
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
                      className="text-sm text-foreground hover:text-gold transition-colors"
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
                      className="text-sm text-foreground hover:text-gold transition-colors"
                    >
                      {prospect.contact_data.phone}
                    </a>
                  </div>
                )}
                {!prospect.contact_data && (
                  <p className="text-sm text-muted-foreground">
                    Not enriched - personal contact will be added after enrichment
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Summary Section */}
        <div className="rounded-lg border border-gold bg-card p-6">
          <h3 className="mb-4 font-serif text-xl font-semibold text-foreground">
            Why Recommended
          </h3>
          {prospect.ai_summary ? (
            <p className="text-foreground leading-relaxed">{prospect.ai_summary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              AI summary will be generated after enrichment completes
            </p>
          )}
        </div>

        {/* Lookalike Discovery Section - Plan 03-08 */}
        {showLookalikeDiscovery && (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-6 font-serif text-xl font-semibold text-foreground">
              Find Similar People
            </h3>
            <LookalikeDiscovery
              prospectId={prospect.id}
              prospectName={prospect.full_name}
            />
          </div>
        )}

        {/* Wealth Signals Section */}
        <WealthSignals
          webData={prospect.web_data}
          insiderData={prospect.insider_data}
        />

        {/* Lists Section */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-6 font-serif text-xl font-semibold text-foreground">
            List Memberships
          </h3>

          {listMemberships.length > 0 ? (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      List Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Added Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {listMemberships.map((membership) => (
                    <tr
                      key={membership.listId}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/lists/${membership.listId}`}
                          className="text-sm font-medium text-gold hover:text-gold-muted transition-colors"
                        >
                          {membership.listName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize bg-muted text-muted-foreground">
                          {membership.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(membership.addedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not yet added to any lists. Use &quot;Add to List&quot; above to organize this prospect.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
