"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { completeUserOnboarding } from "@/app/actions/onboarding";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { passwordStrength } from "@/lib/password-strength";

export default function SetPasswordPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadContext() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const tenantId = user.app_metadata?.tenant_id;
      if (tenantId) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("name, logo_url")
          .eq("id", tenantId)
          .single();
        if (tenant) {
          setOrgName(tenant.name);
          setLogoUrl(tenant.logo_url ?? null);
        }
      }
    }
    loadContext();
  }, []);

  const strength = password.length > 0 ? passwordStrength(password) : 0;
  const passwordMismatch = confirmPassword.length > 0 && confirmPassword !== password;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

    setLoading(true);
    const formData = new FormData();
    formData.set("password", password);
    formData.set("confirm_password", confirmPassword);

    const result = await completeUserOnboarding(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.success && result.slug) {
      router.push(`/${result.slug}`);
    }
  };

  return (
    <div className="max-w-md mx-auto surface-card rounded-[14px] p-8">
      {/* Tenant logo / org name */}
      {logoUrl ? (
        <div className="flex flex-col items-center gap-2 mb-6">
          <img
            src={logoUrl}
            alt={orgName ? `${orgName} logo` : "Organization logo"}
            className="h-12 w-12 rounded-lg object-cover"
            style={{ border: "1px solid var(--border-subtle)" }}
          />
          {orgName && (
            <span className="text-xs" style={{ color: "var(--text-secondary-ds)" }}>
              {orgName}
            </span>
          )}
        </div>
      ) : orgName ? (
        <div className="flex flex-col items-center gap-2 mb-6">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg font-serif font-bold text-lg"
            style={{
              background: "var(--gold-bg-strong)",
              color: "var(--gold-primary)",
              border: "1px solid var(--border-gold)",
            }}
          >
            {orgName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs" style={{ color: "var(--text-secondary-ds)" }}>
            {orgName}
          </span>
        </div>
      ) : null}

      <div className="space-y-1 mb-6">
        <h1 className="font-serif text-2xl font-bold tracking-tight" style={{ color: "var(--gold-primary)" }}>
          Welcome{orgName ? ` to ${orgName}` : ""}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary-ds)" }}>
          Set your password to get started
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
          />
          {/* Password strength meter */}
          {password.length > 0 && (
            <div className="flex gap-1 mt-1">
              <div className={cn("h-1 flex-1 rounded", strength >= 1 ? "bg-[var(--destructive)]" : "bg-[var(--bg-elevated)]")} />
              <div className={cn("h-1 flex-1 rounded", strength >= 2 ? "bg-[var(--warning,#f59e0b)]" : "bg-[var(--bg-elevated)]")} />
              <div className={cn("h-1 flex-1 rounded", strength >= 3 ? "bg-[var(--success)]" : "bg-[var(--bg-elevated)]")} />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
          />
          {passwordMismatch && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading || passwordMismatch}
          variant="gold-solid"
          size="lg"
          className="w-full mt-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {loading ? "Setting up" : "Set Password & Continue"}
        </Button>
      </form>
    </div>
  );
}
