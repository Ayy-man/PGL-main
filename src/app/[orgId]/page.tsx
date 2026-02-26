import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

export default async function TenantDashboard({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const firstName =
    user.user_metadata?.first_name || user.email?.split("@")[0] || "there";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Greeting header */}
      <div>
        <h1
          className="font-serif font-semibold text-foreground"
          style={{ fontSize: "38px", letterSpacing: "-0.5px" }}
        >
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{today}</p>
      </div>

      {/* Hero — Search is the primary action */}
      <Link
        href={`/${orgId}/search`}
        className="group relative flex items-center gap-6 rounded-xl p-8 transition-all duration-200 cursor-pointer block"
        style={{
          background: "var(--bg-card-gradient)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
          (e.currentTarget as HTMLAnchorElement).style.background =
            "var(--bg-card-hover)";
          (e.currentTarget as HTMLAnchorElement).style.border =
            "1px solid var(--border-hover)";
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
          (e.currentTarget as HTMLAnchorElement).style.background =
            "var(--bg-card-gradient)";
          (e.currentTarget as HTMLAnchorElement).style.border =
            "1px solid rgba(255,255,255,0.04)";
        }}
      >
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors"
          style={{
            background: "var(--gold-bg)",
            color: "var(--gold-primary)",
          }}
        >
          <Search className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-serif text-xl font-semibold text-foreground">
              Search Prospects
            </span>
            <ArrowRight
              className="h-4 w-4 opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
              style={{ color: "var(--gold-primary)" }}
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Find high-net-worth buyers matching your personas
          </p>
        </div>
      </Link>

      {/* Quick navigation pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Lists", href: `/${orgId}/lists` },
          { label: "Personas", href: `/${orgId}/personas` },
          { label: "Analytics", href: `/${orgId}/dashboard/analytics` },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
