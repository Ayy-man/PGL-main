"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TENANT_THEMES, isValidTheme } from "@/lib/tenant-theme";

interface TenantBranding {
  name: string;
  logoUrl: string | null;
  theme: string;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Fetch tenant branding when tenant slug is in the URL
  useEffect(() => {
    const tenantSlug = searchParams.get("tenant");
    if (!tenantSlug) return;
    fetch(`/api/tenant-branding?slug=${encodeURIComponent(tenantSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setBranding(data); })
      .catch(() => {});
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.user) {
        // Check for redirect param set by middleware
        const redirectTo = searchParams.get("redirect");

        if (redirectTo && redirectTo !== "/" && redirectTo !== "/login") {
          router.push(redirectTo);
          router.refresh();
          return;
        }

        const tenantId = data.user.app_metadata?.tenant_id;
        const role = data.user.app_metadata?.role;

        if (role === "super_admin") {
          router.push("/admin");
          router.refresh();
        } else if (tenantId) {
          // Look up tenant slug for URL routing
          const { data: tenant } = await supabase
            .from("tenants")
            .select("slug")
            .eq("id", tenantId)
            .single();

          if (tenant?.slug) {
            router.push(`/${tenant.slug}`);
          } else {
            router.push(`/${tenantId}`);
          }
          router.refresh();
        } else {
          setError("No tenant assigned. Contact your administrator.");
        }
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Tenant branding or default PGL mark */}
      {branding ? (
        <div className="flex flex-col items-center gap-2">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={`${branding.name} logo`}
              className="h-12 w-12 rounded-lg object-cover"
              style={{ border: "1px solid var(--border-subtle)" }}
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg font-serif font-bold text-lg"
              style={{
                background: isValidTheme(branding.theme)
                  ? `linear-gradient(135deg, ${TENANT_THEMES[branding.theme].main}30, ${TENANT_THEMES[branding.theme].main}10)`
                  : "var(--gold-bg-strong)",
                color: isValidTheme(branding.theme)
                  ? TENANT_THEMES[branding.theme].main
                  : "var(--gold-primary)",
                border: `1px solid ${isValidTheme(branding.theme) ? TENANT_THEMES[branding.theme].main + "40" : "var(--border-gold)"}`,
              }}
            >
              {branding.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs" style={{ color: "var(--admin-text-secondary)" }}>
            {branding.name}
          </span>
        </div>
      ) : (
        <div className="lg:hidden text-center">
          <span className="font-serif text-lg font-bold tracking-tight text-gold">
            PGL
          </span>
        </div>
      )}

      <div className="space-y-2">
        <h1 className="font-serif text-2xl font-bold tracking-tight">
          Sign in
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to continue
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={loading}
            className="h-10 rounded-lg bg-background ring-offset-background placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold/50"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-gold transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={loading}
            className="h-10 rounded-lg bg-background ring-offset-background placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold/50"
          />
        </div>

        {branding && isValidTheme(branding.theme) && branding.theme !== "gold" ? (
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60 cursor-pointer"
            style={{
              background: TENANT_THEMES[branding.theme].main,
              color: "#fff",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        ) : (
          <Button
            type="submit"
            disabled={loading}
            variant="gold-solid"
            size="lg"
            className="w-full"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        )}
      </form>
    </div>
  );
}
