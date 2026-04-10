"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfile, changePassword } from "@/app/actions/profile";

export default function SettingsPage() {
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [profilePending, startProfileTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();

  function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startProfileTransition(async () => {
      const result = await updateProfile(formData);
      if (result.error) {
        setProfileError(result.error);
      } else {
        setProfileSuccess(true);
        form.reset();
      }
    });
  }

  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startPasswordTransition(async () => {
      const result = await changePassword(formData);
      if (result.error) {
        setPasswordError(result.error);
      } else {
        setPasswordSuccess(true);
        form.reset();
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
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
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="full_name"
                className="text-sm font-medium"
                style={{ color: "var(--text-primary-ds)" }}
              >
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Your full name"
                required
                className="flex h-10 w-full rounded-[8px] border px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary-ds)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--gold-primary)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                }}
              />
            </div>

            {profileError && (
              <p className="text-sm text-destructive">{profileError}</p>
            )}
            {profileSuccess && (
              <p className="text-sm" style={{ color: "var(--success)" }}>
                Profile updated successfully.
              </p>
            )}

            <button
              type="submit"
              disabled={profilePending}
              className="inline-flex h-10 items-center justify-center rounded-[8px] px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--gold-primary)",
                color: "var(--bg-base)",
              }}
            >
              {profilePending ? "Saving..." : "Save changes"}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="current_password"
                className="text-sm font-medium"
                style={{ color: "var(--text-primary-ds)" }}
              >
                Current password
              </label>
              <input
                id="current_password"
                name="current_password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="flex h-10 w-full rounded-[8px] border px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary-ds)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--gold-primary)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new_password"
                className="text-sm font-medium"
                style={{ color: "var(--text-primary-ds)" }}
              >
                New password
              </label>
              <input
                id="new_password"
                name="new_password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
                minLength={8}
                className="flex h-10 w-full rounded-[8px] border px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary-ds)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--gold-primary)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                }}
              />
              <p className="text-xs" style={{ color: "var(--text-secondary-ds)" }}>
                Minimum 8 characters
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm_password"
                className="text-sm font-medium"
                style={{ color: "var(--text-primary-ds)" }}
              >
                Confirm new password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="flex h-10 w-full rounded-[8px] border px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary-ds)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--gold-primary)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                }}
              />
            </div>

            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-sm" style={{ color: "var(--success)" }}>
                Password updated successfully.
              </p>
            )}

            <button
              type="submit"
              disabled={passwordPending}
              className="inline-flex h-10 items-center justify-center rounded-[8px] px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--gold-primary)",
                color: "var(--bg-base)",
              }}
            >
              {passwordPending ? "Updating..." : "Update password"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
