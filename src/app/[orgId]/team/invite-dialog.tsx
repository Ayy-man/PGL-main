"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { inviteTeamMember } from "@/app/actions/team";

interface InviteDialogProps {
  orgId: string;
}

export function InviteDialog({ orgId }: InviteDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"agent" | "assistant">("agent");

  // Button hover state
  const [triggerHovered, setTriggerHovered] = useState(false);

  function resetForm() {
    setEmail("");
    setFullName("");
    setRole("agent");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("full_name", fullName);
      formData.set("role", role);
      formData.set("org_id", orgId);

      const result = await inviteTeamMember(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success) {
        setOpen(false);
        resetForm();
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-semibold transition-colors"
        style={{
          borderColor: "var(--border-gold)",
          color: "var(--gold-primary)",
          backgroundColor: triggerHovered
            ? "var(--gold-bg)"
            : "var(--gold-bg-strong)",
        }}
        onMouseEnter={() => setTriggerHovered(true)}
        onMouseLeave={() => setTriggerHovered(false)}
      >
        <UserPlus className="h-4 w-4" />
        Invite Team Member
      </button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new member to your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1">
            <label
              htmlFor="invite-email"
              className="block text-sm font-medium"
              style={{ color: "var(--text-primary-ds)" }}
            >
              Email
              <span className="text-destructive ml-0.5">*</span>
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
              placeholder="colleague@company.com"
              className="w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary-ds)] focus:ring-2 focus:ring-[var(--gold-primary)]/50 focus:border-[var(--gold-primary)] outline-none transition-colors disabled:opacity-50 placeholder:opacity-40"
            />
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <label
              htmlFor="invite-name"
              className="block text-sm font-medium"
              style={{ color: "var(--text-primary-ds)" }}
            >
              Full Name
              <span
                className="ml-1 text-xs font-normal"
                style={{ color: "var(--text-secondary-ds)" }}
              >
                (optional)
              </span>
            </label>
            <input
              id="invite-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={submitting}
              placeholder="Jane Doe"
              className="w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary-ds)] focus:ring-2 focus:ring-[var(--gold-primary)]/50 focus:border-[var(--gold-primary)] outline-none transition-colors disabled:opacity-50 placeholder:opacity-40"
            />
          </div>

          {/* Role */}
          <div className="space-y-1">
            <label
              htmlFor="invite-role"
              className="block text-sm font-medium"
              style={{ color: "var(--text-primary-ds)" }}
            >
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "agent" | "assistant")
              }
              disabled={submitting}
              className="w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary-ds)] focus:ring-2 focus:ring-[var(--gold-primary)]/50 focus:border-[var(--gold-primary)] outline-none transition-colors disabled:opacity-50"
            >
              <option value="agent">Agent</option>
              <option value="assistant">Assistant</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[8px] border px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50 mt-2"
            style={{
              backgroundColor: "var(--gold-bg-strong)",
              borderColor: "var(--border-gold)",
              color: "var(--gold-primary)",
            }}
          >
            {submitting ? "Sending Invite..." : "Send Invitation"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
