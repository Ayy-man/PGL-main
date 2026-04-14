"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { inviteTeamMember } from "@/app/actions/team";

interface InviteDialogProps {
  orgId: string;
}

export function InviteDialog({ orgId }: InviteDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"agent" | "assistant">("agent");

  function resetForm() {
    setEmail("");
    setFullName("");
    setRole("agent");
    setError(null);
    setEmailError(null);
  }

  function validateEmail(value: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      setEmailError("Enter a valid email address");
    } else {
      setEmailError(null);
    }
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
        toast({
          title: "Invitation sent",
          description: `${email} will receive an email shortly.`,
        });
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
      <Button
        variant="gold-solid"
        size="default"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Invite Team Member
      </Button>

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
            <Label htmlFor="invite-email">
              Email <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => validateEmail(e.target.value)}
              required
              disabled={submitting}
              placeholder="colleague@company.com"
            />
            {emailError && (
              <p className="text-xs text-destructive">{emailError}</p>
            )}
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <Label htmlFor="invite-name">
              Full Name{" "}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="invite-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={submitting}
              placeholder="Jane Doe"
            />
          </div>

          {/* Role */}
          <div className="space-y-1">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "agent" | "assistant")}
              disabled={submitting}
            >
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === "agent"
                ? "Can create searches and enrich leads"
                : "Can view searches and assist agents — no billing."}
            </p>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 mt-2">
            <Button
              type="submit"
              disabled={submitting || !!emailError}
              variant="gold-solid"
              size="lg"
              className="flex-1"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {submitting ? "Sending" : "Send Invitation"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
