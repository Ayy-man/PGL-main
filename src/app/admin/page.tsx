import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  // Fetch summary counts
  const [tenantsResult, usersResult] = await Promise.all([
    supabase.from("tenants").select("id, is_active", { count: "exact" }),
    supabase.from("users").select("id, is_active", { count: "exact" }),
  ]);

  const totalTenants = tenantsResult.count || 0;
  const activeTenants = tenantsResult.data?.filter(t => t.is_active).length || 0;
  const totalUsers = usersResult.count || 0;
  const activeUsers = usersResult.data?.filter(u => u.is_active).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage tenants and users across the platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Tenants</p>
          <p className="mt-2 text-3xl font-bold">{totalTenants}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Active Tenants</p>
          <p className="mt-2 text-3xl font-bold text-primary">{activeTenants}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="mt-2 text-3xl font-bold">{totalUsers}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Active Users</p>
          <p className="mt-2 text-3xl font-bold text-primary">{activeUsers}</p>
        </div>
      </div>
    </div>
  );
}
