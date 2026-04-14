"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SuspendedPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 text-center shadow-lg animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertOctagon className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            Account Suspended
          </h1>
          <p className="text-sm text-muted-foreground">
            Your organization&apos;s account has been suspended. If you believe
            this is an error, please contact your administrator or support team.
          </p>
          <a
            href="mailto:support@phronesis.dev"
            className="inline-block text-gold hover:underline text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold-primary)]/40 rounded mt-1"
          >
            Contact support
          </a>
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
