"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmTenantOnboarding } from "@/app/actions/onboarding";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export default function ConfirmTenantPage() {
  const router = useRouter();
  const [_tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function fetchTenant() {
      try {
        const res = await fetch("/api/onboarding/tenant");
        if (!res.ok) {
          const body = await res.json();
          setFetchError(body.error || "Failed to load tenant data");
          return;
        }
        const data: TenantData = await res.json();
        setTenant(data);
        setName(data.name || "");
        setSlug(data.slug || "");
        setLogoUrl(data.logo_url || "");
        setPrimaryColor(data.primary_color || "#d4af37");
        setSecondaryColor(data.secondary_color || "#f4d47f");
      } catch {
        setFetchError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    }
    fetchTenant();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("slug", slug);
      formData.set("logo_url", logoUrl);
      formData.set("primary_color", primaryColor);
      formData.set("secondary_color", secondaryColor);
      formData.set("password", password);
      formData.set("confirm_password", confirmPassword);

      const result = await confirmTenantOnboarding(formData);

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
            {[...Array(5)].map((_, i) => (
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
          Confirm your organization&apos;s settings to get started
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Tenant Name */}
        <div className="space-y-1">
          <label
            htmlFor="name"
            className="block text-sm font-medium"
            style={{ color: "var(--text-primary-ds)" }}
          >
            Organization Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={submitting}
            className="w-full rounded-[8px] border px-3 py-2 text-sm outline-none transition-colors disabled:opacity-50"
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

        {/* Slug */}
        <div className="space-y-1">
          <label
            htmlFor="slug"
            className="block text-sm font-medium"
            style={{ color: "var(--text-primary-ds)" }}
          >
            URL Slug
          </label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            required
            pattern="^[a-z0-9][a-z0-9-]*[a-z0-9]$"
            disabled={submitting}
            className="w-full rounded-[8px] border px-3 py-2 text-sm outline-none transition-colors disabled:opacity-50"
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
            Lowercase letters, numbers, and hyphens only
          </p>
        </div>

        {/* Logo URL */}
        <div className="space-y-1">
          <label
            htmlFor="logo_url"
            className="block text-sm font-medium"
            style={{ color: "var(--text-primary-ds)" }}
          >
            Logo URL
            <span
              className="ml-1 text-xs font-normal"
              style={{ color: "var(--text-secondary-ds)" }}
            >
              (optional)
            </span>
          </label>
          <input
            id="logo_url"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
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

        {/* Primary Color */}
        <div className="space-y-1">
          <label
            htmlFor="primary_color"
            className="block text-sm font-medium"
            style={{ color: "var(--text-primary-ds)" }}
          >
            Primary Color
            <span
              className="ml-1 text-xs font-normal"
              style={{ color: "var(--text-secondary-ds)" }}
            >
              (optional)
            </span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="primary_color"
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#d4af37"
              disabled={submitting}
              className="flex-1 rounded-[8px] border px-3 py-2 text-sm outline-none transition-colors disabled:opacity-50 placeholder:opacity-40"
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
            <div
              className="size-10 rounded-[8px] border shrink-0"
              style={{
                backgroundColor: primaryColor || "#d4af37",
                borderColor: "var(--border-default)",
              }}
            />
          </div>
        </div>

        {/* Secondary Color */}
        <div className="space-y-1">
          <label
            htmlFor="secondary_color"
            className="block text-sm font-medium"
            style={{ color: "var(--text-primary-ds)" }}
          >
            Secondary Color
            <span
              className="ml-1 text-xs font-normal"
              style={{ color: "var(--text-secondary-ds)" }}
            >
              (optional)
            </span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="secondary_color"
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              placeholder="#f4d47f"
              disabled={submitting}
              className="flex-1 rounded-[8px] border px-3 py-2 text-sm outline-none transition-colors disabled:opacity-50 placeholder:opacity-40"
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
            <div
              className="size-10 rounded-[8px] border shrink-0"
              style={{
                backgroundColor: secondaryColor || "#f4d47f",
                borderColor: "var(--border-default)",
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div
          className="my-2"
          style={{ borderTop: "1px solid var(--border-default)" }}
        />

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
          {submitting ? "Confirming..." : "Confirm & Get Started"}
        </button>
      </form>
    </div>
  );
}
