"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toggleTeamMemberStatus } from "@/app/actions/team";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Confirmation,
  ConfirmationIcon,
  ConfirmationTitle,
  ConfirmationDescription,
} from "@/components/ui/confirmation";

interface UserStatusToggleProps {
  userId: string;
  isActive: boolean;
  orgId: string;
  memberEmail?: string;
}

export function UserStatusToggle({
  userId,
  isActive,
  orgId,
  memberEmail,
}: UserStatusToggleProps) {
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(isActive);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const handleToggle = () => {
    // Deactivating requires confirmation; activating is one-click
    if (currentStatus) {
      setConfirmDeactivate(true);
    } else {
      executeToggle();
    }
  };

  const executeToggle = () => {
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

  const handleConfirmDeactivate = () => {
    setConfirmDeactivate(false);
    executeToggle();
  };

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`inline-flex h-8 min-w-[96px] items-center justify-center rounded-[8px] px-3 text-xs font-medium transition-colors ${
          currentStatus
            ? "bg-[var(--success-muted)] text-[var(--success)]"
            : "bg-destructive/10 text-destructive"
        } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : currentStatus ? (
          "Deactivate"
        ) : (
          "Activate"
        )}
      </button>

      {/* Deactivate confirmation dialog */}
      <Dialog open={confirmDeactivate} onOpenChange={(o) => !o && setConfirmDeactivate(false)}>
        <DialogContent>
          <Confirmation
            isDestructive
            confirmLabel="Deactivate"
            cancelLabel="Cancel"
            onConfirm={handleConfirmDeactivate}
            onCancel={() => setConfirmDeactivate(false)}
            isLoading={isPending}
          >
            <ConfirmationIcon variant="destructive" />
            <ConfirmationTitle>
              Deactivate {memberEmail ?? "this member"}?
            </ConfirmationTitle>
            <ConfirmationDescription>
              They will be signed out of all sessions and lose access immediately. You can reactivate them at any time.
            </ConfirmationDescription>
          </Confirmation>
        </DialogContent>
      </Dialog>
    </>
  );
}
