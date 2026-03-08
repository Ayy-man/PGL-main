import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus } from "lucide-react";
import { TenantTable } from "./tenant-table";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const supabase = createAdminClient();

  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Tenants
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage real estate teams on the platform
          </p>
        </div>
        <Link
          href="/admin/tenants/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[var(--border-gold)] bg-[var(--gold-bg-strong)] px-4 text-sm font-semibold text-[var(--gold-primary)] hover:bg-[var(--gold-bg)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Tenant
        </Link>
      </div>

      <TenantTable tenants={tenants ?? []} />
    </div>
  );
}
