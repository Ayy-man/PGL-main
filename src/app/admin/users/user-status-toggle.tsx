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
      className={`inline-flex h-8 items-center rounded-md px-3 text-xs font-medium transition-colors ${
        currentStatus
          ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
          : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
      } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isPending ? "Updating..." : currentStatus ? "Deactivate" : "Activate"}
    </button>
  );
}
