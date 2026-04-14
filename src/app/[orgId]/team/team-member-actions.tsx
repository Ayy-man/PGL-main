"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  resendInvite,
  revokeInvite,
  changeUserRole,
  removeTeamMember,
} from "@/app/actions/team";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Confirmation,
  ConfirmationIcon,
  ConfirmationTitle,
  ConfirmationDescription,
} from "@/components/ui/confirmation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeamMemberActionsProps {
  userId: string;
  orgId: string;
  currentUserId: string;
  memberRole: string;
  memberEmail?: string;
  isPending: boolean; // hasn't signed in yet
  isActive: boolean;
}

export function TeamMemberActions({
  userId,
  orgId,
  currentUserId,
  memberRole,
  memberEmail,
  isPending,
  isActive,
}: TeamMemberActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [actionPending, startTransition] = useTransition();
  const [rowPendingId, setRowPendingId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{ id: string; email: string } | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<{ id: string; email: string } | null>(null);

  const isSelf = userId === currentUserId;
  const isAdmin = memberRole === "tenant_admin";
  const isResending = rowPendingId === userId && actionPending;

  const handleResend = () => {
    setRowPendingId(userId);
    startTransition(async () => {
      const result = await resendInvite(userId, orgId);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Invite resent" });
      }
      setRowPendingId(null);
    });
  };

  const handleConfirmRevoke = () => {
    startTransition(async () => {
      const result = await revokeInvite(userId, orgId);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Invite revoked" });
        setPendingRevoke(null);
        router.refresh();
      }
    });
  };

  const handleRoleChange = (newRole: "agent" | "assistant") => {
    startTransition(async () => {
      const result = await changeUserRole(userId, newRole, orgId);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        // Refresh to revert the dropdown value to the server-side state
        router.refresh();
      } else {
        toast({ title: `Role changed to ${newRole}` });
        router.refresh();
      }
    });
  };

  const handleConfirmRemove = () => {
    startTransition(async () => {
      const result = await removeTeamMember(userId, orgId);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Member removed" });
        setPendingRemove(null);
        router.refresh();
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Pending invite actions */}
        {isPending && (
          <>
            <button
              onClick={handleResend}
              disabled={actionPending}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50"
              style={{
                background: "var(--gold-bg)",
                color: "var(--gold-primary)",
              }}
            >
              {isResending && <Loader2 className="h-3 w-3 animate-spin" />}
              {isResending ? "Resending..." : "Resend"}
            </button>
            <button
              onClick={() => setPendingRevoke({ id: userId, email: memberEmail ?? userId })}
              disabled={actionPending}
              className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
            >
              Revoke
            </button>
          </>
        )}

        {/* Role change for active non-admin, non-self users */}
        {!isPending && isActive && !isSelf && !isAdmin && (
          <Select
            value={memberRole}
            onValueChange={(v) => handleRoleChange(v as "agent" | "assistant")}
            disabled={actionPending}
          >
            <SelectTrigger className="h-7 w-[100px] text-xs px-2 py-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="assistant">Assistant</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Remove button (not for self, not for pending — use revoke for pending) */}
        {!isSelf && !isPending && (
          <button
            onClick={() => setPendingRemove({ id: userId, email: memberEmail ?? userId })}
            disabled={actionPending}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>

      {/* Remove member confirmation dialog */}
      <Dialog open={!!pendingRemove} onOpenChange={(o) => !o && setPendingRemove(null)}>
        <DialogContent>
          <Confirmation
            isDestructive
            confirmLabel="Remove member"
            cancelLabel="Cancel"
            onConfirm={handleConfirmRemove}
            onCancel={() => setPendingRemove(null)}
            isLoading={actionPending}
          >
            <ConfirmationIcon variant="destructive" />
            <ConfirmationTitle>Remove {pendingRemove?.email}?</ConfirmationTitle>
            <ConfirmationDescription>
              Their saved searches will be preserved. They lose access immediately and must be re-invited to return.
            </ConfirmationDescription>
          </Confirmation>
        </DialogContent>
      </Dialog>

      {/* Revoke invite confirmation dialog */}
      <Dialog open={!!pendingRevoke} onOpenChange={(o) => !o && setPendingRevoke(null)}>
        <DialogContent>
          <Confirmation
            isDestructive
            confirmLabel="Revoke invite"
            cancelLabel="Cancel"
            onConfirm={handleConfirmRevoke}
            onCancel={() => setPendingRevoke(null)}
            isLoading={actionPending}
          >
            <ConfirmationIcon variant="destructive" />
            <ConfirmationTitle>Revoke invite for {pendingRevoke?.email}?</ConfirmationTitle>
            <ConfirmationDescription>
              They won&apos;t be able to use the invite link. You can re-invite them later.
            </ConfirmationDescription>
          </Confirmation>
        </DialogContent>
      </Dialog>
    </>
  );
}
