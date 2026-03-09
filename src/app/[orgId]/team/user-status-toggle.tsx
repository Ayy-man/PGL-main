"use client";

import { useState, useTransition } from "react";
import { toggleTeamMemberStatus } from "@/app/actions/team";

interface UserStatusToggleProps {
  userId: string;
  isActive: boolean;
  orgId: string;
}

export function UserStatusToggle({
  userId,
  isActive,
  orgId,
}: UserStatusToggleProps) {
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(isActive);

  const handleToggle = () => {
    const newStatus = !currentStatus;
    setCurrentStatus(newStatus);

    startTransition(async () => {
      try {
        const result = await toggleTeamMemberStatus(userId, orgId);
        if (result?.error) {
          setCurrentStatus(!newStatus);
          console.error(result.error);
        }
      } catch {
        setCurrentStatus(!newStatus);
        console.error("Failed to toggle user status");
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex h-8 items-center rounded-[8px] px-3 text-xs font-medium transition-colors ${
        currentStatus
          ? "bg-[var(--success-muted)] text-[var(--success)]"
          : "bg-destructive/10 text-destructive"
      } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isPending
        ? "Updating..."
        : currentStatus
          ? "Deactivate"
          : "Activate"}
    </button>
  );
}
