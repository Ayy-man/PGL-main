"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  resendInvite,
  revokeInvite,
  changeUserRole,
  removeTeamMember,
} from "@/app/actions/team";
import { useToast } from "@/hooks/use-toast";

interface TeamMemberActionsProps {
  userId: string;
  orgId: string;
  currentUserId: string;
  memberRole: string;
  isPending: boolean; // hasn't signed in yet
  isActive: boolean;
}

export function TeamMemberActions({
  userId,
  orgId,
  currentUserId,
  memberRole,
  isPending,
  isActive,
}: TeamMemberActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [actionPending, startTransition] = useTransition();
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  const isSelf = userId === currentUserId;
  const isAdmin = memberRole === "tenant_admin";

  const handleResend = () => {
    startTransition(async () => {
      const result = await resendInvite(userId, orgId);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Invite resent" });
      }
    });
  };

  const handleRevoke = () => {
    startTransition(async () => {
      const result = await revokeInvite(userId, orgId);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Invite revoked" });
        router.refresh();
      }
    });
  };

  const handleRoleChange = (newRole: "agent" | "assistant") => {
    startTransition(async () => {
      const result = await changeUserRole(userId, newRole, orgId);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: `Role changed to ${newRole}` });
        router.refresh();
      }
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeTeamMember(userId, orgId);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Member removed" });
        setShowConfirmRemove(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Pending invite actions */}
      {isPending && (
        <>
          <button
            onClick={handleResend}
            disabled={actionPending}
            className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            style={{
              background: "var(--gold-bg)",
              color: "var(--gold-primary)",
            }}
          >
            Resend
          </button>
          <button
            onClick={handleRevoke}
            disabled={actionPending}
            className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
          >
            Revoke
          </button>
        </>
      )}

      {/* Role change for active non-admin, non-self users */}
      {!isPending && isActive && !isSelf && !isAdmin && (
        <select
          value={memberRole}
          onChange={(e) =>
            handleRoleChange(e.target.value as "agent" | "assistant")
          }
          disabled={actionPending}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          <option value="agent">Agent</option>
          <option value="assistant">Assistant</option>
        </select>
      )}

      {/* Remove button (not for self, not for pending — use revoke for pending) */}
      {!isSelf && !isPending && (
        <>
          {!showConfirmRemove ? (
            <button
              onClick={() => setShowConfirmRemove(true)}
              disabled={actionPending}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              Remove
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleRemove}
                disabled={actionPending}
                className="rounded-md bg-destructive px-2.5 py-1 text-xs font-medium text-destructive-foreground"
              >
                {actionPending ? "..." : "Confirm"}
              </button>
              <button
                onClick={() => setShowConfirmRemove(false)}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
