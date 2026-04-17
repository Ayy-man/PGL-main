"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import { Loader2, Eye, EyeOff, RotateCcw, Building2, ChevronRight, Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateProfile, changePassword } from "@/app/actions/profile";
import { updateOnboardingState } from "@/app/actions/onboarding-state";
import { cn } from "@/lib/utils";
import { passwordStrength } from "@/lib/password-strength";

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
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // User profile data loaded from DB
  const [currentName, setCurrentName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [confirmRemoveAvatar, setConfirmRemoveAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) {
        setCurrentName(data.full_name || "");
        setAvatarUrl(data.avatar_url ?? null);
      }
    }
    loadProfile();
  }, []);

  const handleAvatarUpload = useCallback(async (file: File) => {
    setAvatarError(null);
    if (file.size > 2 * 1024 * 1024) { setAvatarError("File size exceeds 2MB limit"); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setAvatarError("Invalid file type. Allowed: PNG, JPG, WebP"); return;
    }
    const localUrl = URL.createObjectURL(file);
    setAvatarUrl(localUrl);
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      URL.revokeObjectURL(localUrl);
      setAvatarUrl(data.url);
      toast({ title: "Profile photo updated" });
    } catch (err) {
      URL.revokeObjectURL(localUrl);
      setAvatarUrl(null);
      setAvatarError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }, [toast]);

  const handleRemoveAvatar = useCallback(async () => {
    setRemovingAvatar(true);
    try {
      const res = await fetch("/api/upload/avatar", { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      setAvatarUrl(null);
      setConfirmRemoveAvatar(false);
      toast({ title: "Profile photo removed" });
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Failed to remove photo");
    } finally {
      setRemovingAvatar(false);
    }
  }, [toast]);

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
          <CardTitle className="text-base font-semibold">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-3">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
                if (avatarInputRef.current) avatarInputRef.current.value = "";
              }}
            />
            <div className="relative group">
              {/* Avatar circle */}
              <button
                type="button"
                onClick={() => { setConfirmRemoveAvatar(false); avatarInputRef.current?.click(); }}
                disabled={avatarUploading}
                className="size-20 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold shrink-0 cursor-pointer"
                style={{
                  background: avatarUrl ? "transparent" : "var(--gold-bg-strong)",
                  color: "var(--gold-primary)",
                  border: "2px solid var(--border-gold)",
                }}
                aria-label="Upload profile photo"
              >
                {avatarUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--gold-primary)" }} />
                ) : avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Profile photo" className="h-full w-full object-cover" />
                ) : (
                  currentName?.charAt(0).toUpperCase() || "?"
                )}
              </button>
              {/* Camera overlay on hover */}
              {!avatarUploading && (
                <div
                  className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: "rgba(0,0,0,0.5)" }}
                >
                  <Camera className="h-5 w-5" style={{ color: "#fff" }} />
                </div>
              )}
              {/* Remove button */}
              {avatarUrl && !avatarUploading && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmRemoveAvatar(true); }}
                  className="absolute -top-1 -right-1 size-5 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                  aria-label="Remove photo"
                >
                  <X size={10} />
                </button>
              )}
            </div>
            {confirmRemoveAvatar ? (
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: "var(--text-secondary-ds)" }}>Remove photo?</span>
                <button
                  type="button"
                  disabled={removingAvatar}
                  onClick={handleRemoveAvatar}
                  className="font-semibold disabled:opacity-50"
                  style={{ color: "var(--destructive, #ef4444)" }}
                >
                  {removingAvatar ? "Removing…" : "Yes"}
                </button>
                <button
                  type="button"
                  disabled={removingAvatar}
                  onClick={() => setConfirmRemoveAvatar(false)}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  No
                </button>
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Click to upload · PNG, JPG, WebP · Max 2MB
              </p>
            )}
            {avatarError && (
              <p className="text-xs text-destructive">{avatarError}</p>
            )}
          </div>

          {/* Name form */}
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
                value={currentName}
                onChange={(e) => { setCurrentName(e.target.value); setProfileDirty(true); }}
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
