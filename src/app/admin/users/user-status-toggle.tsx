"use client";

import { toggleUserStatus } from "@/app/actions/admin";
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
      try {
        await toggleUserStatus(userId);
      } catch (err) {
        // Revert on error
        setCurrentStatus(!newStatus);
        console.error(err instanceof Error ? err.message : "Failed to toggle user status");
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
