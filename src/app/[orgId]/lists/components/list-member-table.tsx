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
import { useState } from "react";
import { ProspectAvatar } from "@/components/prospect/prospect-avatar";

interface ListMemberTableProps {
  members: ListMember[];
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

function EnrichmentDot({ status }: { status: string | null }) {
  switch (status) {
    case "complete":
      return (
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: "var(--success, #22c55e)" }}
          title="Enriched"
        />
      );
    case "in_progress":
      return <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--gold-primary)" }} />;
    case "failed":
      return (
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: "var(--destructive, #ef4444)" }}
          title="Failed"
        />
      );
    case "pending":
      return (
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.15)" }}
          title="Pending"
        />
      );
    default:
      return (
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
          title="Not enriched"
        />
      );
  }
}

function CopyButton({ text, icon: Icon }: { text: string; icon: typeof Mail }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
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
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.08)";
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

export function ListMemberTable({ members }: ListMemberTableProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  const handleRemove = async (memberId: string) => {
    if (!confirm("Remove this prospect from the list?")) return;
    setRemovingId(memberId);
    const result = await removeFromListAction(memberId);
    if (!result.success) alert(result.error || "Failed to remove from list");
    setRemovingId(null);
  };

  const handleReEnrich = async (prospectId: string) => {
    setEnrichingId(prospectId);
    try {
      await fetch(`/api/prospects/${prospectId}/enrich?force=true`, { method: "POST" });
    } catch {
      // fire-and-forget — Inngest will handle it
    }
    // Keep spinner briefly so user sees feedback, then clear
    setTimeout(() => setEnrichingId(null), 2000);
  };

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
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
            {members.map((member, i) => (
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
                    <EnrichmentDot status={member.prospect.enrichment_status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/${orgId}/prospects/${member.prospect.id}`}
                          className="text-[15px] font-semibold truncate hover:underline transition-colors"
                          style={{ color: "var(--gold-primary)" }}
                        >
                          {member.prospect.name}
                        </Link>
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
                      disabled={enrichingId === member.prospect.id}
                    >
                      {enrichingId === member.prospect.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <RefreshCw className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRemove(member.id)}
                      disabled={removingId === member.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden divide-y" style={{ borderColor: "var(--border-subtle)" }}>
        {members.map((member) => (
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
                  <EnrichmentDot status={member.prospect.enrichment_status} />
                  <Link
                    href={`/${orgId}/prospects/${member.prospect.id}`}
                    className="text-sm font-semibold truncate hover:underline"
                    style={{ color: "var(--gold-primary)" }}
                  >
                    {member.prospect.name}
                  </Link>
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
                  disabled={enrichingId === member.prospect.id}
                >
                  {enrichingId === member.prospect.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <RefreshCw className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handleRemove(member.id)}
                  disabled={removingId === member.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
