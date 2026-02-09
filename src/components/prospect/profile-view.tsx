"use client";

import { useState } from "react";
import { EnrichmentStatus } from "./enrichment-status";
import { WealthSignals } from "./wealth-signals";
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
 * Dark theme with gold accents (#f4d47f, #d4af37).
 * Playfair Display for headings, Inter for body.
 */
export function ProfileView({
  prospect,
  enrichmentSourceStatus,
  listMemberships,
  isStale,
}: ProfileViewProps) {
  const router = useRouter();
  const [isAddingToList, setIsAddingToList] = useState(false);

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

  const handleFindSimilar = () => {
    // Placeholder for lookalike search (Plan 08)
    console.log("Find Similar People - to be implemented in Plan 08");
  };

  const handleExport = () => {
    // Placeholder for profile export
    console.log("Export Profile - to be implemented");
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header Section */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="mb-2 font-playfair text-4xl font-bold text-zinc-100">
                {prospect.full_name}
              </h1>
              {prospect.title && prospect.company && (
                <p className="mb-3 text-xl text-zinc-300">
                  {prospect.title} @ {prospect.company}
                </p>
              )}
              {prospect.location && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{prospect.location}</span>
                </div>
              )}
              {isStale && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-orange-800 bg-orange-950/50 px-3 py-1.5 text-sm text-orange-400">
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
                    className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add to List
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
                  {availableLists.map((list) => (
                    <DropdownMenuItem
                      key={list.id}
                      onClick={() => handleAddToList(list.id)}
                      className="hover:bg-zinc-800"
                    >
                      {list.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                onClick={handleFindSimilar}
                className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
              >
                <UserSearch className="mr-2 h-4 w-4" />
                Find Similar People
              </Button>

              <Button
                variant="outline"
                onClick={handleExport}
                className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
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
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="mb-6 font-playfair text-xl font-semibold text-zinc-100">
            Contact Information
          </h3>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Work Contact */}
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Work
              </h4>
              <div className="space-y-3">
                {prospect.work_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-zinc-500" />
                    <a
                      href={`mailto:${prospect.work_email}`}
                      className="text-sm text-zinc-300 hover:text-[#f4d47f]"
                    >
                      {prospect.work_email}
                    </a>
                  </div>
                )}
                {prospect.work_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-zinc-500" />
                    <a
                      href={`tel:${prospect.work_phone}`}
                      className="text-sm text-zinc-300 hover:text-[#f4d47f]"
                    >
                      {prospect.work_phone}
                    </a>
                  </div>
                )}
                {prospect.linkedin_url && (
                  <div className="flex items-center gap-3">
                    <Linkedin className="h-4 w-4 text-zinc-500" />
                    <a
                      href={prospect.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-zinc-300 hover:text-[#f4d47f]"
                    >
                      LinkedIn Profile
                    </a>
                  </div>
                )}
                {!prospect.work_email &&
                  !prospect.work_phone &&
                  !prospect.linkedin_url && (
                    <p className="text-sm text-zinc-500">No work contact info</p>
                  )}
              </div>
            </div>

            {/* Personal Contact */}
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Personal (ContactOut)
              </h4>
              <div className="space-y-3">
                {prospect.contact_data?.personal_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-zinc-500" />
                    <a
                      href={`mailto:${prospect.contact_data.personal_email}`}
                      className="text-sm text-zinc-300 hover:text-[#f4d47f]"
                    >
                      {prospect.contact_data.personal_email}
                    </a>
                  </div>
                )}
                {prospect.contact_data?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-zinc-500" />
                    <a
                      href={`tel:${prospect.contact_data.phone}`}
                      className="text-sm text-zinc-300 hover:text-[#f4d47f]"
                    >
                      {prospect.contact_data.phone}
                    </a>
                  </div>
                )}
                {!prospect.contact_data && (
                  <p className="text-sm text-zinc-500">
                    Not enriched - personal contact will be added after enrichment
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Summary Section */}
        <div className="rounded-lg border border-[#d4af37] bg-zinc-900 p-6">
          <h3 className="mb-4 font-playfair text-xl font-semibold text-zinc-100">
            Why Recommended
          </h3>
          {prospect.ai_summary ? (
            <p className="text-zinc-300 leading-relaxed">{prospect.ai_summary}</p>
          ) : (
            <p className="text-sm text-zinc-500">
              AI summary will be generated after enrichment completes
            </p>
          )}
        </div>

        {/* Wealth Signals Section */}
        <WealthSignals
          webData={prospect.web_data}
          insiderData={prospect.insider_data}
        />

        {/* Lists Section */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="mb-6 font-playfair text-xl font-semibold text-zinc-100">
            List Memberships
          </h3>

          {listMemberships.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-zinc-800">
              <table className="w-full">
                <thead className="bg-zinc-950">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      List Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Added Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-900">
                  {listMemberships.map((membership) => (
                    <tr
                      key={membership.listId}
                      className="hover:bg-zinc-850"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/lists/${membership.listId}`}
                          className="text-sm font-medium text-[#f4d47f] hover:text-[#d4af37]"
                        >
                          {membership.listName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize bg-zinc-800 text-zinc-300">
                          {membership.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {new Date(membership.addedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Not yet added to any lists. Use &quot;Add to List&quot; above to organize this prospect.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
