import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Search, List, Users, BarChart3, ArrowRight } from "lucide-react";

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

  const firstName = user.user_metadata?.first_name || user.email?.split("@")[0] || "there";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const secondaryActions = [
    {
      label: "Lists",
      description: "Organize prospect pipelines",
      href: `/${orgId}/lists`,
      icon: List,
    },
    {
      label: "Personas",
      description: "Define ideal buyer profiles",
      href: `/${orgId}/personas`,
      icon: Users,
    },
    {
      label: "Analytics",
      description: "Team activity & usage",
      href: `/${orgId}/dashboard/analytics`,
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
          {today}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
      </div>

      {/* Hero — Search is why you're here */}
      <Link
        href={`/${orgId}/search`}
        className="group relative flex items-center gap-6 rounded-xl border border-gold/20 bg-card p-8 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gold/40 cursor-pointer"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold transition-colors group-hover:bg-gold/15">
          <Search className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-serif text-xl font-semibold text-foreground">
              Search Prospects
            </span>
            <ArrowRight className="h-4 w-4 text-gold opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Find high-net-worth buyers matching your personas
          </p>
        </div>
      </Link>

      {/* Secondary actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        {secondaryActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-start gap-3 rounded-xl border bg-card p-5 transition-all duration-150 hover:border-border hover:bg-muted/30 cursor-pointer"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
              <action.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-foreground">
                {action.label}
              </span>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {action.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
