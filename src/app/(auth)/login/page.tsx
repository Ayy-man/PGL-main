"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
        const tenantId = data.user.app_metadata?.tenant_id;
        const role = data.user.app_metadata?.role;

        if (role === 'super_admin') {
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
      {/* Mobile brand mark — hidden on desktop where the split panel shows */}
      <div className="lg:hidden text-center">
        <span className="font-serif text-lg font-bold tracking-tight text-gold">
          PGL
        </span>
      </div>

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
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={loading}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={loading}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-gold-foreground transition-colors hover:bg-gold-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
