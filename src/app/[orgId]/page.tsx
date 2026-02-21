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

  const actions = [
    {
      label: "Search Prospects",
      description: "Find high-net-worth buyers matching your personas",
      href: `/${orgId}/search`,
      icon: Search,
    },
    {
      label: "Manage Lists",
      description: "Organize and track your prospect pipelines",
      href: `/${orgId}/lists`,
      icon: List,
    },
    {
      label: "Personas",
      description: "Define ideal buyer profiles for targeted search",
      href: `/${orgId}/personas`,
      icon: Users,
    },
    {
      label: "Analytics",
      description: "View team activity and usage metrics",
      href: `/${orgId}/dashboard/analytics`,
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          What would you like to do today?
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-start gap-4 rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-gold/30 cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-gold/10 group-hover:text-gold">
              <action.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {action.label}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {action.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
