"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { completeUserOnboarding } from "@/app/actions/onboarding";

interface TenantData {
  id: string;
  name: string;
  slug: string;
}

export default function SetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string>("");

  // Form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function fetchTenantInfo() {
      try {
        const res = await fetch("/api/onboarding/tenant");
        if (!res.ok) {
          const text = await res.text();
          let errorMsg = "Failed to load account data";
          try {
            const body = JSON.parse(text);
            errorMsg = body.error || errorMsg;
          } catch {
            // text wasn't JSON
          }
          setFetchError(errorMsg);
          return;
        }
        const data: TenantData = await res.json();
        setTenantName(data.name || "your organization");
      } catch {
        setFetchError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    }
    fetchTenantInfo();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("password", password);
      formData.set("confirm_password", confirmPassword);

      const result = await completeUserOnboarding(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success && result.slug) {
        router.push(`/${result.slug}/dashboard`);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-lg mx-auto surface-card rounded-[14px] p-8">
        <div className="space-y-4 animate-pulse">
          <div
            className="h-8 w-40 rounded"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
          <div
            className="h-4 w-64 rounded"
            style={{ background: "rgba(255,255,255,0.03)" }}
          />
          <div className="space-y-3 pt-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div
                  className="h-3 w-24 rounded"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                />
                <div
                  className="h-10 w-full rounded-[8px]"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fetch error state
  if (fetchError) {
    return (
      <div className="max-w-lg mx-auto surface-card rounded-[14px] p-8 text-center">
        <p className="text-sm text-destructive">{fetchError}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto surface-card rounded-[14px] p-8">
      <div className="space-y-1 mb-6">
        <h1
          className="font-serif text-2xl font-bold tracking-tight"
          style={{ color: "var(--gold-primary)" }}
        >
          Welcome
        </h1>
        <p style={{ color: "var(--text-secondary-ds)" }} className="text-sm">
          Set your password to get started with {tenantName}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* New Password */}
        <div className="space-y-1">
          <label
            htmlFor="password"
            className="block text-sm font-medium"
            style={{ color: "var(--text-primary-ds)" }}
          >
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            required
            minLength={8}
            disabled={submitting}
            className="w-full rounded-[8px] border px-3 py-2 text-sm outline-none transition-colors disabled:opacity-50 placeholder:opacity-40"
            style={{
              borderColor: "var(--border-default)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-primary-ds)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--gold-primary)";
              e.currentTarget.style.boxShadow =
                "0 0 0 2px rgba(212,175,55,0.25)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <p className="text-xs" style={{ color: "var(--text-secondary-ds)" }}>
            Choose a strong password with at least 8 characters
          </p>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <label
            htmlFor="confirm_password"
            className="block text-sm font-medium"
            style={{ color: "var(--text-primary-ds)" }}
          >
            Confirm Password
          </label>
          <input
            id="confirm_password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
            minLength={8}
            disabled={submitting}
            className="w-full rounded-[8px] border px-3 py-2 text-sm outline-none transition-colors disabled:opacity-50 placeholder:opacity-40"
            style={{
              borderColor: "var(--border-default)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-primary-ds)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--gold-primary)";
              e.currentTarget.style.boxShadow =
                "0 0 0 2px rgba(212,175,55,0.25)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
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
          {submitting ? "Setting up..." : "Set Password & Get Started"}
        </button>
      </form>
    </div>
  );
}
