"use client";

import { toggleUserStatusAction } from "@/app/admin/actions";
import { useState, useTransition } from "react";

interface UserStatusToggleProps {
  userId: string;
  isActive: boolean;
}

export function UserStatusToggle({ userId, isActive }: UserStatusToggleProps) {
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(isActive);

  const handleToggle = () => {
    const newStatus = !currentStatus;
    setCurrentStatus(newStatus);

    startTransition(async () => {
      const result = await toggleUserStatusAction(userId, newStatus);
      if (!result.success) {
        // Revert on error
        setCurrentStatus(!newStatus);
        console.error(result.error);
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex h-8 items-center rounded-[8px] px-3 text-xs font-medium transition-colors ${
        currentStatus
          ? "bg-[var(--success-muted)] text-[var(--success)] hover:bg-[var(--success-muted)]"
          : "bg-destructive/10 text-destructive hover:bg-destructive/15"
      } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isPending ? "Updating..." : currentStatus ? "Deactivate" : "Activate"}
    </button>
  );
}
