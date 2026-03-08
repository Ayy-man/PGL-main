"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
  const router = useRouter();
  const searchParams = useSearchParams();

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
      {/* Mobile brand mark -- hidden on desktop where the split panel shows */}
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
          <Label htmlFor="password">Password</Label>
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

        <Button
          type="submit"
          disabled={loading}
          variant="gold-solid"
          size="lg"
          className="w-full"
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </div>
  );
}
