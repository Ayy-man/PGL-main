"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmTenantOnboarding } from "@/app/actions/onboarding";
import { ThemePicker } from "@/components/ui/theme-picker";
import { LogoUpload } from "@/components/ui/logo-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Loader2, AlertCircle } from "lucide-react";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  theme: string | null;
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
  const [slugTouched, setSlugTouched] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState("gold");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Dirty tracking for beforeunload
  const [dirty, setDirty] = useState(false);

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
        setLogoUrl(data.logo_url || null);
        setTheme(data.theme || "gold");
      } catch {
        setFetchError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    }
    fetchTenant();
  }, []);

  // Slug auto-derive from name when slug not manually touched
  useEffect(() => {
    if (!slugTouched) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  }, [name, slugTouched]);

  // Beforeunload guard when form is dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const passwordMismatch =
    confirmPassword.length > 0 && confirmPassword !== password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("slug", slug);
      formData.set("theme", theme);
      formData.set("password", password);
      formData.set("confirm_password", confirmPassword);

      const result = await confirmTenantOnboarding(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success && result.slug) {
        setDirty(false);
        router.push(`/${result.slug}`);
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
        <div className="space-y-4">
          <Skeleton className="h-8 w-40 rounded-[8px]" />
          <Skeleton className="h-4 w-64 rounded" />
          <div className="space-y-3 pt-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-10 w-full rounded-[8px]" />
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
      <div className="max-w-lg mx-auto">
        <EmptyState
          variant="error"
          icon={AlertCircle}
          title="Couldn't load your organization"
          description={fetchError}
        >
          <Button
            variant="gold-solid"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
        </EmptyState>
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

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        onChange={() => setDirty(true)}
      >
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Tenant Name */}
        <div className="space-y-1">
          <Label htmlFor="name">Organization Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            required
            disabled={submitting}
            placeholder="Acme Corp"
          />
        </div>

        {/* Slug */}
        <div className="space-y-1">
          <Label htmlFor="slug">URL Slug</Label>
          <Input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase());
              setSlugTouched(true);
              setDirty(true);
            }}
            required
            pattern="^[a-z0-9][a-z0-9-]*[a-z0-9]$"
            disabled={submitting}
            placeholder="acme-corp"
          />
          <p className="text-xs" style={{ color: "var(--text-secondary-ds)" }}>
            Your workspace URL: <strong>app.pgl.com/{slug || "your-org"}</strong>
          </p>
        </div>

        {/* Brand Theme */}
        <div className="space-y-1">
          <label
            className="block text-sm font-medium"
            style={{ color: "var(--text-primary-ds)" }}
          >
            Brand Theme
          </label>
          <ThemePicker
            value={theme}
            onChange={(v) => {
              setTheme(v);
              setDirty(true);
            }}
          />
          <input type="hidden" name="theme" value={theme} />
        </div>

        {/* Company Logo */}
        {_tenant && (
          <div className="space-y-1">
            <label
              className="block text-sm font-medium"
              style={{ color: "var(--text-primary-ds)" }}
            >
              Company Logo
              <span
                className="ml-1 text-xs font-normal"
                style={{ color: "var(--text-secondary-ds)" }}
              >
                (optional)
              </span>
            </label>
            <LogoUpload
              tenantId={_tenant.id}
              currentUrl={logoUrl}
              onUploaded={(url) => {
                setLogoUrl(url);
                setDirty(true);
              }}
            />
          </div>
        )}

        {/* Divider */}
        <div
          className="my-2"
          style={{ borderTop: "1px solid var(--border-default)" }}
        />

        {/* New Password (optional) */}
        <div className="space-y-1">
          <Label htmlFor="password">
            New Password{" "}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (optional — leave blank to keep your current password)
            </span>
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setDirty(true);
            }}
            placeholder="Leave blank to keep current password"
            minLength={password.length > 0 ? 8 : undefined}
            disabled={submitting}
          />
        </div>

        {/* Confirm Password */}
        {password.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="confirm_password">Confirm Password</Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setDirty(true);
              }}
              placeholder="Re-enter your password"
              required
              minLength={8}
              disabled={submitting}
            />
            {passwordMismatch && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={submitting || passwordMismatch}
          variant="gold-solid"
          size="lg"
          className="w-full mt-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {submitting ? "Confirming" : "Confirm & Get Started"}
        </Button>
      </form>
    </div>
  );
}
