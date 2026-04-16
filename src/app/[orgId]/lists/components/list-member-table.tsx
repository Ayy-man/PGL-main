"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Trash2,
  Loader2,
  CheckCircle2,
  Mail,
  Phone,
  RefreshCw,
} from "lucide-react";
import { MemberStatusSelect } from "./member-status-select";
import { MemberNotesCell } from "./member-notes-cell";
import { removeFromListAction } from "../actions";
import type { ListMember } from "@/lib/lists/types";
import { EnrichmentStatusDots } from "@/components/ui/enrichment-status-dots";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ROW_SKELETON_SHAPE,
  CARD_SKELETON_SHAPE,
  addEnrichingIds,
  removeEnrichingIds,
  reconcileEnrichedPayload,
} from "@/components/ui/lib/skeleton-shapes";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { ProspectAvatar } from "@/components/prospect/prospect-avatar";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { LeadHoverPreview } from "@/components/prospect/lead-hover-preview";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Confirmation,
  ConfirmationIcon,
  ConfirmationTitle,
  ConfirmationDescription,
} from "@/components/ui/confirmation";

interface ListMemberTableProps {
  members: ListMember[];
  listId?: string;
  listName?: string;
}

/** Shorten location: "Boston, MA, United States" → "Boston, MA" */
function shortLocation(loc: string): string {
  const parts = loc.split(",").map((s) => s.trim());
  // If 3+ parts and last is a country name, drop it
  if (parts.length >= 3) {
    const last = parts[parts.length - 1].toLowerCase();
    if (last === "united states" || last === "usa" || last === "us" || last === "uk" || last === "united kingdom") {
      return parts.slice(0, -1).join(", ");
    }
  }
  return loc;
}

/** Relative time: "2h ago", "Mar 27" */
function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}


function CopyButton({ text, icon: Icon }: { text: string; icon: typeof Mail }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Email copied", description: text });
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center justify-center h-7 w-7 rounded-md transition-all cursor-pointer"
      style={{
        color: copied ? "var(--success, #22c55e)" : "var(--text-secondary, rgba(232,228,220,0.55))",
        background: copied ? "rgba(34,197,94,0.1)" : "transparent",
      }}
      title={copied ? "Copied!" : `Copy ${text}`}
      onMouseEnter={(e) => {
        if (!copied) {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--gold-primary)";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(var(--gold-primary-rgb), 0.08)";
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary, rgba(232,228,220,0.55))";
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }
      }}
    >
      {copied ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function ListMemberTable({ members: serverMembers, listId, listName }: ListMemberTableProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const fromQuery = listId && listName
    ? `?from=list&listId=${listId}&listName=${encodeURIComponent(listName)}`
    : "";
  const [members, setMembers] = useState(serverMembers);
  // enrichingIds: Set of prospect IDs currently being (re-)enriched. Rows in
  // this set render a skeleton cell layout instead of normal content until the
  // enrichment resolves (via explicit fetch settle OR via the Realtime payload
  // at line ~186 landing with a terminal enrichment_status).
  // Phase 40-07: replaced prior `enrichingId: string | null` single-slot
  // tracker so concurrent re-enriches no longer stomp each other's spinners.
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [pendingRemoveMember, setPendingRemoveMember] = useState<{ memberId: string; prospectName: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { setMembers(serverMembers); }, [serverMembers]);

  const handleRequestRemove = (memberId: string, prospectName: string) => {
    setPendingRemoveMember({ memberId, prospectName });
  };

  const handleConfirmRemove = async () => {
    if (!pendingRemoveMember) return;
    setRemoving(true);

    const previousMembers = members;
    const memberIdToRemove = pendingRemoveMember.memberId;
    setMembers(prev => prev.filter(m => m.id !== memberIdToRemove));

    const restoreMember = (prev: ListMember[]) => {
      return prev.some(m => m.id === memberIdToRemove) ? prev : previousMembers;
    };

    toast({
      title: "Prospect removed from list",
      action: (
        <ToastAction altText="Undo" onClick={() => setMembers((prev) => restoreMember(prev))}>
          Undo
        </ToastAction>
      ),
    });

    const result = await removeFromListAction(pendingRemoveMember.memberId);
    if (!result.success) {
      setMembers(previousMembers);
      toast({ title: "Remove failed", description: result.error || "Could not remove prospect.", variant: "destructive" });
    }

    setRemoving(false);
    setPendingRemoveMember(null);
  };

  const handleReEnrich = async (prospectId: string) => {
    setEnrichingIds((prev) => addEnrichingIds(prev, [prospectId]));
    try {
      const res = await fetch(`/api/prospects/${prospectId}/enrich?force=true`, { method: "POST" });
      if (res.ok) {
        toast({ title: "Re-enrichment queued", description: "Data will refresh in the background." });
      } else {
        toast({ title: "Re-enrichment failed", description: "Could not queue enrichment.", variant: "destructive" });
        setEnrichingIds((prev) => removeEnrichingIds(prev, [prospectId]));
        return;
      }
    } catch {
      toast({ title: "Re-enrichment failed", description: "Network error.", variant: "destructive" });
      setEnrichingIds((prev) => removeEnrichingIds(prev, [prospectId]));
      return;
    }

    // Subscribe to Realtime updates — clear skeleton when enrichment completes or fails.
    // reconcileEnrichedPayload handles the terminal-status gate + no-op early-return
    // if the id was already cleared (e.g. by a concurrent request).
    const supabase = createClient();
    const channel = supabase
      .channel(`list-re-enrich-${prospectId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "prospects", filter: `id=eq.${prospectId}` },
        (payload) => {
          const row = payload.new as { id?: string; enrichment_status?: string };
          const id = row.id ?? prospectId;
          const status = row.enrichment_status;
          if (status === "complete" || status === "failed" || status === "enriched") {
            setEnrichingIds((prev) =>
              reconcileEnrichedPayload(prev, { id, enrichment_status: status })
            );
            supabase.removeChannel(channel);
          }
        }
      )
      .subscribe();
  };

  return (
    <div data-tour-id="list-member-table">
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-[280px]">Prospect</TableHead>
              <TableHead className="w-[120px]">Location</TableHead>
              <TableHead className="w-[50px] text-center">Contact</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[70px]">Added</TableHead>
              <TableHead className="w-[180px]">Notes</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member, i) => {
              const isEnriching = enrichingIds.has(member.prospect.id);
              if (isEnriching) {
                // Phase 40-07 bulk/re-enrich skeleton: targeted rows show
                // rounded-lg skeletons in the enrichment-populated columns
                // (prospect, location, contact, status-width, added, notes).
                // Cleared by Realtime terminal status OR fetch-settle fallback.
                return (
                  <TableRow
                    key={member.id}
                    className="row-hover-lift"
                    style={{ background: i % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent" }}
                    data-testid="list-row-enriching-skeleton"
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Skeleton className={`h-10 w-10 ${ROW_SKELETON_SHAPE}`} />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className={`h-4 w-40 ${ROW_SKELETON_SHAPE}`} />
                          <Skeleton className={`h-3 w-56 ${ROW_SKELETON_SHAPE}`} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className={`h-4 w-24 ${ROW_SKELETON_SHAPE}`} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Skeleton className={`h-4 w-4 ${ROW_SKELETON_SHAPE}`} />
                        <Skeleton className={`h-4 w-4 ${ROW_SKELETON_SHAPE}`} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className={`h-6 w-20 ${ROW_SKELETON_SHAPE}`} />
                    </TableCell>
                    <TableCell>
                      <Skeleton className={`h-3 w-12 ${ROW_SKELETON_SHAPE}`} />
                    </TableCell>
                    <TableCell>
                      <Skeleton className={`h-4 w-40 ${ROW_SKELETON_SHAPE}`} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Re-enrichment in progress"
                          disabled
                        >
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }
              return (
              <TableRow
                key={member.id}
                className="row-hover-lift press-effect"
                style={{ background: i % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent" }}
              >
                {/* Prospect: Name + Title at Company */}
                <TableCell className="py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ProspectAvatar
                      name={member.prospect.name}
                      photoUrl={member.prospect.photo_url}
                      email={member.prospect.email}
                      size="md"
                    />
                    <EnrichmentStatusDots sourceStatus={null} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <HoverCard openDelay={300} closeDelay={120}>
                          <HoverCardTrigger asChild>
                            <Link
                              href={`/${orgId}/prospects/${member.prospect.id}${fromQuery}`}
                              className="text-[15px] font-semibold truncate hover:underline transition-colors"
                              style={{ color: "var(--gold-primary)" }}
                            >
                              {member.prospect.name}
                            </Link>
                          </HoverCardTrigger>
                          <HoverCardContent align="start" side="right" sideOffset={12}>
                            <LeadHoverPreview prospect={member.prospect} />
                          </HoverCardContent>
                        </HoverCard>
                        {member.prospect.linkedin_url && (
                          <a
                            href={member.prospect.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 transition-colors"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm truncate" style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}>
                        {member.prospect.title || ""}
                        {member.prospect.title && member.prospect.company && " at "}
                        {member.prospect.company || ""}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Location (shortened) */}
                <TableCell className="py-3">
                  <span className="text-sm" style={{ color: "var(--text-secondary, rgba(232,228,220,0.5))" }}>
                    {member.prospect.location ? shortLocation(member.prospect.location) : "—"}
                  </span>
                </TableCell>

                {/* Contact icons */}
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    {member.prospect.email ? (
                      <CopyButton text={member.prospect.email} icon={Mail} />
                    ) : (
                      <span className="inline-flex items-center justify-center h-7 w-7">
                        <Mail className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.06)" }} />
                      </span>
                    )}
                    {member.prospect.phone ? (
                      <CopyButton text={member.prospect.phone} icon={Phone} />
                    ) : (
                      <span className="inline-flex items-center justify-center h-7 w-7">
                        <Phone className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.06)" }} />
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <MemberStatusSelect
                    memberId={member.id}
                    currentStatus={member.status}
                  />
                </TableCell>

                {/* Added timestamp */}
                <TableCell className="py-3">
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
                    title={new Date(member.added_at).toLocaleString()}
                  >
                    {timeAgo(member.added_at)}
                  </span>
                </TableCell>

                {/* Notes */}
                <TableCell>
                  <MemberNotesCell
                    memberId={member.id}
                    initialNotes={member.notes || ""}
                  />
                </TableCell>

                {/* Actions: Re-enrich + Delete */}
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Re-enrich prospect"
                      onClick={() => handleReEnrich(member.prospect.id)}
                      disabled={enrichingIds.has(member.prospect.id)}
                    >
                      {enrichingIds.has(member.prospect.id)
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <RefreshCw className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRequestRemove(member.id, member.prospect.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden divide-y" style={{ borderColor: "var(--border-subtle)" }}>
        {members.map((member) => {
          const isEnriching = enrichingIds.has(member.prospect.id);
          if (isEnriching) {
            // Phase 40-07 mobile skeleton card: rounded-[14px] outer shape per
            // Phase 14-polish convention for card-shaped skeletons.
            return (
              <div
                key={member.id}
                className={`p-4 space-y-2 ${CARD_SKELETON_SHAPE}`}
                data-testid="list-card-enriching-skeleton"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className={`h-8 w-8 ${ROW_SKELETON_SHAPE}`} />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className={`h-4 w-32 ${ROW_SKELETON_SHAPE}`} />
                    <Skeleton className={`h-3 w-48 ${ROW_SKELETON_SHAPE}`} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className={`h-6 w-20 ${ROW_SKELETON_SHAPE}`} />
                  <Skeleton className={`h-3 w-16 ${ROW_SKELETON_SHAPE}`} />
                </div>
              </div>
            );
          }
          return (
          <div key={member.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <ProspectAvatar
                    name={member.prospect.name}
                    photoUrl={member.prospect.photo_url}
                    email={member.prospect.email}
                    size="sm"
                  />
                  <EnrichmentStatusDots sourceStatus={null} />
                  <HoverCard openDelay={300} closeDelay={120}>
                    <HoverCardTrigger asChild>
                      <Link
                        href={`/${orgId}/prospects/${member.prospect.id}${fromQuery}`}
                        className="text-sm font-semibold truncate hover:underline"
                        style={{ color: "var(--gold-primary)" }}
                      >
                        {member.prospect.name}
                      </Link>
                    </HoverCardTrigger>
                    <HoverCardContent align="start" side="bottom" sideOffset={8}>
                      <LeadHoverPreview prospect={member.prospect} />
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
                  {member.prospect.title || ""}
                  {member.prospect.title && member.prospect.company && " at "}
                  {member.prospect.company || ""}
                </p>
                {member.prospect.location && (
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {shortLocation(member.prospect.location)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {member.prospect.email && <CopyButton text={member.prospect.email} icon={Mail} />}
                {member.prospect.phone && <CopyButton text={member.prospect.phone} icon={Phone} />}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <MemberStatusSelect memberId={member.id} currentStatus={member.status} />
              <div className="flex items-center gap-2">
                <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {timeAgo(member.added_at)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  title="Re-enrich prospect"
                  onClick={() => handleReEnrich(member.prospect.id)}
                  disabled={enrichingIds.has(member.prospect.id)}
                >
                  {enrichingIds.has(member.prospect.id)
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <RefreshCw className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handleRequestRemove(member.id, member.prospect.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      <Dialog open={!!pendingRemoveMember} onOpenChange={(o) => !o && setPendingRemoveMember(null)}>
        <DialogContent>
          <Confirmation
            isDestructive
            confirmLabel="Remove"
            cancelLabel="Cancel"
            onConfirm={handleConfirmRemove}
            onCancel={() => setPendingRemoveMember(null)}
            isLoading={removing}
          >
            <ConfirmationIcon variant="destructive" />
            <ConfirmationTitle>
              Remove {pendingRemoveMember?.prospectName ?? "this prospect"} from the list?
            </ConfirmationTitle>
            <ConfirmationDescription>
              The prospect record stays in your database. You can re-add them from search later.
            </ConfirmationDescription>
          </Confirmation>
        </DialogContent>
      </Dialog>
    </div>
  );
}
