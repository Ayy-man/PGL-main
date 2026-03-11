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
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Trash2, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { MemberStatusSelect } from "./member-status-select";
import { MemberNotesCell } from "./member-notes-cell";
import { removeFromListAction } from "../actions";
import type { ListMember } from "@/lib/lists/types";
import { useState } from "react";

interface ListMemberTableProps {
  members: ListMember[];
}

function EnrichmentBadge({ status }: { status: string | null }) {
  switch (status) {
    case "complete":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: "var(--success, #22c55e)" }}>
          <CheckCircle2 className="h-3 w-3" /> Enriched
        </span>
      );
    case "in_progress":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: "var(--gold-primary)" }}>
          <Loader2 className="h-3 w-3 animate-spin" /> Enriching
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive">
          <XCircle className="h-3 w-3" /> Failed
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
          <Clock className="h-3 w-3" /> Pending
        </span>
      );
    default:
      return (
        <span className="text-[10px] text-muted-foreground/50">—</span>
      );
  }
}

export function ListMemberTable({ members }: ListMemberTableProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (memberId: string) => {
    if (!confirm("Remove this prospect from the list?")) {
      return;
    }

    setRemovingId(memberId);
    const result = await removeFromListAction(memberId);

    if (!result.success) {
      alert(result.error || "Failed to remove from list");
    }

    setRemovingId(null);
  };

  const getEmailStatusBadge = (status: string | null) => {
    if (!status) return null;

    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      verified: "default",
      guessed: "secondary",
      invalid: "destructive"
    };

    return (
      <Badge variant={variants[status] || "outline"} className="ml-2 text-xs">
        {status}
      </Badge>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return { bg: "var(--gold-bg)", text: "var(--gold-primary)" };
      case "contacted":
        return { bg: "rgba(59,130,246,0.1)", text: "rgb(96,165,250)" };
      case "responded":
        return { bg: "var(--success-muted)", text: "var(--success)" };
      case "not_interested":
        return { bg: "rgba(239,68,68,0.1)", text: "rgb(248,113,113)" };
      default:
        return { bg: "rgba(255,255,255,0.05)", text: "var(--text-tertiary)" };
    }
  };

  return (
    <div className="border rounded-lg" style={{ borderColor: "var(--border-subtle)" }}>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Enrichment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/${orgId}/prospects/${member.prospect.id}`}
                      className="hover:underline transition-colors"
                      style={{ color: "var(--gold-primary)" }}
                    >
                      {member.prospect.name}
                    </Link>
                    {member.prospect.linkedin_url && (
                      <a
                        href={member.prospect.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>{member.prospect.title || "—"}</TableCell>
                <TableCell>{member.prospect.company || "—"}</TableCell>
                <TableCell>{member.prospect.location || "—"}</TableCell>
                <TableCell>
                  {member.prospect.email ? (
                    <div className="flex items-center">
                      <a
                        href={`mailto:${member.prospect.email}`}
                        className="hover:underline"
                      >
                        {member.prospect.email}
                      </a>
                      {getEmailStatusBadge(member.prospect.email_status)}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {member.prospect.phone ? (
                    <a href={`tel:${member.prospect.phone}`} className="hover:underline">
                      {member.prospect.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <EnrichmentBadge status={member.prospect.enrichment_status} />
                </TableCell>
                <TableCell>
                  <MemberStatusSelect
                    memberId={member.id}
                    currentStatus={member.status}
                  />
                </TableCell>
                <TableCell>
                  <MemberNotesCell
                    memberId={member.id}
                    initialNotes={member.notes || ""}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(member.id)}
                    disabled={removingId === member.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden divide-y" style={{ borderColor: "var(--border-subtle)" }}>
        {members.map((member) => {
          const statusColors = getStatusColor(member.status);
          return (
            <div key={member.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/${orgId}/prospects/${member.prospect.id}`}
                      className="text-sm font-medium truncate hover:underline"
                      style={{ color: "var(--gold-primary)" }}
                    >
                      {member.prospect.name}
                    </Link>
                    {member.prospect.linkedin_url && (
                      <a
                        href={member.prospect.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                    {member.prospect.title || "—"}
                    {member.prospect.company && ` at ${member.prospect.company}`}
                  </p>
                  <div className="mt-1">
                    <EnrichmentBadge status={member.prospect.enrichment_status} />
                  </div>
                </div>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase shrink-0"
                  style={{ background: statusColors.bg, color: statusColors.text }}
                >
                  {member.status.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MemberStatusSelect
                  memberId={member.id}
                  currentStatus={member.status}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => handleRemove(member.id)}
                  disabled={removingId === member.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
