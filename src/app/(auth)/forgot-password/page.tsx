"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${origin}/api/auth/callback?type=recovery`,
        }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "var(--gold-bg)" }}>
          <Mail className="h-6 w-6" style={{ color: "var(--gold-primary)" }} />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold tracking-tight">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground">
            We sent a password reset link to{" "}
            <span className="text-foreground font-medium">{email}</span>.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Didn&apos;t receive it? Check your spam folder, or{" "}
          <button
            onClick={() => {
              setSubmitted(false);
              setEmail("");
            }}
            className="text-gold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold-primary)]/40 rounded underline-offset-2 transition-colors"
          >
            try again
          </button>
          .
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-gold hover:underline">
            Back to sign in
          </Link>
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
          Reset your password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
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

        <Button
          type="submit"
          disabled={loading}
          variant="gold-solid"
          size="lg"
          className="w-full"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {loading ? "Sending" : "Send Reset Link"}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href="/login" className="text-gold hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
