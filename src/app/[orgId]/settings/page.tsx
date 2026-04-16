"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Confirmation,
  ConfirmationIcon,
  ConfirmationTitle,
  ConfirmationDescription,
} from "@/components/ui/confirmation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import Link from "next/link";
import { Loader2, Eye, EyeOff, RotateCcw, Building2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateProfile, changePassword } from "@/app/actions/profile";
import { updateOnboardingState } from "@/app/actions/onboarding-state";
import { cn } from "@/lib/utils";

function passwordStrength(pwd: string): 1 | 2 | 3 {
  if (pwd.length < 8) return 1;
  if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /\d/.test(pwd)) return 3;
  return 2;
}

export default function SettingsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);
  const [passwordDirty, setPasswordDirty] = useState(false);

  const [profilePending, startProfileTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();

  const [resetOpen, setResetOpen] = useState(false);
  const [resetPending, startResetTransition] = useTransition();

  // Password show/hide
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Track new password value for strength meter
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [confirmPasswordValue, setConfirmPasswordValue] = useState("");
  const passwordMismatch =
    confirmPasswordValue.length > 0 && confirmPasswordValue !== newPasswordValue;

  const profileFormRef = useRef<HTMLFormElement>(null);

  // Beforeunload guard when either form is dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (profileDirty || passwordDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [profileDirty, passwordDirty]);

  function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startProfileTransition(async () => {
      const result = await updateProfile(formData);
      if (result.error) {
        setProfileError(result.error);
      } else {
        // Do NOT reset the profile form — display name should persist
        setProfileDirty(false);
        toast({ title: "Profile updated" });
      }
    });
  }

  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startPasswordTransition(async () => {
      const result = await changePassword(formData);
      if (result.error) {
        setPasswordError(result.error);
      } else {
        // Security-correct: reset password fields on success
        form.reset();
        setNewPasswordValue("");
        setConfirmPasswordValue("");
        setPasswordDirty(false);
        toast({ title: "Password updated" });
      }
    });
  }

  function handleResetOnboarding() {
    startResetTransition(async () => {
      const result = await updateOnboardingState({
        tour_completed: false,
        tour_skipped_at: undefined,
        admin_checklist: {
          invite_team: false,
          upload_logo: false,
          pick_theme: false,
          create_first_persona: false,
        },
      });
      if (!result.ok) {
        toast({
          title: "Reset failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      setResetOpen(false);
      toast({ title: "Onboarding reset — starting tour" });
      router.push(`/${orgId}`);
      router.refresh();
    });
  }

  const strength = newPasswordValue.length > 0 ? passwordStrength(newPasswordValue) : 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: `/${orgId}` },
          { label: "Settings" },
        ]}
      />

      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="mt-1" style={{ color: "var(--text-secondary-ds)" }}>
          Manage your account settings
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Display Name
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            ref={profileFormRef}
            onSubmit={handleProfileSubmit}
            className="space-y-4"
            onChange={() => setProfileDirty(true)}
          >
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Your full name"
                required
              />
            </div>

            {profileError && (
              <p className="text-sm text-destructive">{profileError}</p>
            )}

            <Button
              type="submit"
              disabled={profilePending}
              variant="gold-solid"
            >
              {profilePending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {profilePending ? "Saving" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Organization (tenant-admin + super-admin only — destination page gates) */}
      <Link
        href={`/${orgId}/settings/organization`}
        className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      >
        <Card className="transition-colors hover:border-[var(--border-gold)]">
          <CardContent className="flex items-center gap-4 p-6 md:pt-6">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{
                backgroundColor: "var(--gold-bg-strong)",
                border: "1px solid var(--border-gold)",
              }}
            >
              <Building2 className="h-5 w-5" style={{ color: "var(--gold-primary)" }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Organization</p>
              <p className="text-sm" style={{ color: "var(--text-secondary-ds)" }}>
                Update your team name, upload a logo, and pick a theme.
              </p>
            </div>
            <ChevronRight
              className="h-5 w-5 transition-transform group-hover:translate-x-0.5"
              style={{ color: "var(--text-secondary-ds)" }}
            />
          </CardContent>
        </Card>
      </Link>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handlePasswordSubmit}
            className="space-y-4"
            onChange={() => setPasswordDirty(true)}
          >
            <div className="space-y-1.5">
              <Label htmlFor="current_password">Current password</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  name="current_password"
                  type={showCurrent ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? (
                    <EyeOff className="h-4 w-4 text-[var(--text-secondary-ds)]" />
                  ) : (
                    <Eye className="h-4 w-4 text-[var(--text-secondary-ds)]" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_password">New password</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  name="new_password"
                  type={showNew ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  value={newPasswordValue}
                  onChange={(e) => {
                    setNewPasswordValue(e.target.value);
                    setPasswordDirty(true);
                  }}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4 text-[var(--text-secondary-ds)]" />
                  ) : (
                    <Eye className="h-4 w-4 text-[var(--text-secondary-ds)]" />
                  )}
                </button>
              </div>
              {/* Password strength meter */}
              {newPasswordValue.length > 0 && (
                <div className="flex gap-1 mt-1">
                  <div className={cn("h-1 flex-1 rounded", strength >= 1 ? "bg-[var(--destructive)]" : "bg-[var(--bg-elevated)]")} />
                  <div className={cn("h-1 flex-1 rounded", strength >= 2 ? "bg-[var(--warning,#f59e0b)]" : "bg-[var(--bg-elevated)]")} />
                  <div className={cn("h-1 flex-1 rounded", strength >= 3 ? "bg-[var(--success)]" : "bg-[var(--bg-elevated)]")} />
                </div>
              )}
              <p className="text-xs" style={{ color: "var(--text-secondary-ds)" }}>
                Minimum 8 characters
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  value={confirmPasswordValue}
                  onChange={(e) => {
                    setConfirmPasswordValue(e.target.value);
                    setPasswordDirty(true);
                  }}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4 text-[var(--text-secondary-ds)]" />
                  ) : (
                    <Eye className="h-4 w-4 text-[var(--text-secondary-ds)]" />
                  )}
                </button>
              </div>
              {passwordMismatch && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}

            <Button
              type="submit"
              disabled={passwordPending || passwordMismatch}
              variant="gold-solid"
            >
              {passwordPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {passwordPending ? "Updating" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Reset Onboarding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Reset onboarding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm" style={{ color: "var(--text-secondary-ds)" }}>
            Replay the product tour from step 1 and reset the admin setup
            checklist. Your data is not affected.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset onboarding
          </Button>
        </CardContent>
      </Card>

      <Dialog open={resetOpen} onOpenChange={(o) => !o && setResetOpen(false)}>
        <DialogContent>
          <Confirmation
            confirmLabel="Reset onboarding"
            cancelLabel="Cancel"
            onConfirm={handleResetOnboarding}
            onCancel={() => setResetOpen(false)}
            isLoading={resetPending}
          >
            <ConfirmationIcon variant="info" />
            <ConfirmationTitle>Reset onboarding?</ConfirmationTitle>
            <ConfirmationDescription>
              The product tour will re-fire from step 1 and the admin setup
              checklist resets to 0/4. No data is deleted.
            </ConfirmationDescription>
          </Confirmation>
        </DialogContent>
      </Dialog>
    </div>
  );
}
