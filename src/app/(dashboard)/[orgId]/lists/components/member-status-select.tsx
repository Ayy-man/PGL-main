"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { updateMemberStatusAction } from "../actions";
import type { ListMemberStatus } from "@/lib/lists/types";

interface MemberStatusSelectProps {
  memberId: string;
  currentStatus: ListMemberStatus;
}

const STATUS_CONFIG: Record<
  ListMemberStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  new: { label: "New", variant: "default" },
  contacted: { label: "Contacted", variant: "secondary" },
  responded: { label: "Responded", variant: "outline" },
  not_interested: { label: "Not Interested", variant: "destructive" }
};

export function MemberStatusSelect({ memberId, currentStatus }: MemberStatusSelectProps) {
  const [status, setStatus] = useState<ListMemberStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: ListMemberStatus) => {
    setIsUpdating(true);
    setStatus(newStatus);

    const result = await updateMemberStatusAction(memberId, newStatus);

    if (!result.success) {
      alert(result.error || "Failed to update status");
      setStatus(currentStatus);
    }

    setIsUpdating(false);
  };

  return (
    <Select
      value={status}
      onValueChange={(value) => handleStatusChange(value as ListMemberStatus)}
      disabled={isUpdating}
    >
      <SelectTrigger className="w-[150px]">
        <SelectValue>
          <Badge variant={STATUS_CONFIG[status].variant}>
            {STATUS_CONFIG[status].label}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="new">
          <Badge variant={STATUS_CONFIG.new.variant}>New</Badge>
        </SelectItem>
        <SelectItem value="contacted">
          <Badge variant={STATUS_CONFIG.contacted.variant}>Contacted</Badge>
        </SelectItem>
        <SelectItem value="responded">
          <Badge variant={STATUS_CONFIG.responded.variant}>Responded</Badge>
        </SelectItem>
        <SelectItem value="not_interested">
          <Badge variant={STATUS_CONFIG.not_interested.variant}>Not Interested</Badge>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
