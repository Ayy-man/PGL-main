"use client";

import { toggleTenantStatus } from "@/app/actions/admin";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TenantStatusToggleProps {
  tenantId: string;
  isActive: boolean;
  tenantName?: string;
}

export function TenantStatusToggle({ tenantId, isActive, tenantName }: TenantStatusToggleProps) {
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(isActive);
  const { toast } = useToast();

  const handleToggle = () => {
    const newStatus = !currentStatus;
    setCurrentStatus(newStatus);

    startTransition(async () => {
      try {
        await toggleTenantStatus(tenantId);
        toast({
          title: "Tenant updated",
          description: `${tenantName ?? "Tenant"} is now ${newStatus ? "active" : "inactive"}.`,
        });
      } catch (err) {
        // Revert on error
        setCurrentStatus(!newStatus);
        toast({
          variant: "destructive",
          title: "Failed to update tenant",
          description: err instanceof Error ? err.message : "An unexpected error occurred.",
        });
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-xs font-medium transition-colors ${
        currentStatus
          ? "bg-[var(--success-muted)] text-[var(--success)] hover:bg-[var(--success-muted)]"
          : "bg-destructive/10 text-destructive hover:bg-destructive/15"
      } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
      {isPending ? "Updating..." : currentStatus ? "Deactivate" : "Activate"}
    </button>
  );
}
