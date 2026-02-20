"use client";

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
import { ExternalLink, Trash2 } from "lucide-react";
import { MemberStatusSelect } from "./member-status-select";
import { MemberNotesCell } from "./member-notes-cell";
import { removeFromListAction } from "../actions";
import type { ListMember } from "@/lib/lists/types";
import { useState } from "react";

interface ListMemberTableProps {
  members: ListMember[];
}

export function ListMemberTable({ members }: ListMemberTableProps) {
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

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
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
                  {member.prospect.name}
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
  );
}
