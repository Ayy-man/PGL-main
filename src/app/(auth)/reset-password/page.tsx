"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function passwordStrength(pwd: string): 1 | 2 | 3 {
  if (pwd.length < 8) return 1;
  if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /\d/.test(pwd)) return 3;
  return 2;
}

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Supabase delivers the recovery session via a fragment (#access_token=...).
  // The browser never sends the fragment to the server, so we must wait for
  // the client-side auth state change that signals SESSION_ESTABLISHED from
  // the hash tokens. Once the session is ready, the updateUser call will work.
  useEffect(() => {
    const supabase = createClient();

    // Check if we already have a session (e.g. navigated back to the page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setSessionReady(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const strength = password.length > 0 ? passwordStrength(password) : 0;
  const passwordMismatch = confirmPassword.length > 0 && confirmPassword !== password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Sign out after password reset so the user logs in fresh
      await supabase.auth.signOut();
      router.push("/login?message=password_reset_success");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!sessionReady) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold tracking-tight">
            Set new password
          </h1>
          <p className="text-sm text-muted-foreground">
            Verifying your reset link&hellip;
          </p>
        </div>
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--gold-primary)" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="lg:hidden text-center">
        <span className="font-serif text-lg font-bold tracking-tight text-gold">
          PGL
        </span>
      </div>

      <div className="space-y-2">
        <h1 className="font-serif text-2xl font-bold tracking-tight">
          Set new password
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            disabled={loading}
            className="h-10 rounded-lg bg-background ring-offset-background placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold/50"
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
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your new password"
            required
            disabled={loading}
            className="h-10 rounded-lg bg-background ring-offset-background placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold/50"
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
          className="w-full"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {loading ? "Updating" : "Update Password"}
        </Button>
      </form>
    </div>
  );
}
