import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus } from "lucide-react";
import { UsersClientTable } from "./users-client-table";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const supabase = createAdminClient();

  const { data: users, error } = await supabase
    .from("users")
    .select(`
      *,
      tenants:tenant_id (
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Users
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users across all tenants
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[var(--border-gold)] bg-[var(--gold-bg-strong)] px-4 text-sm font-semibold text-[var(--gold-primary)] hover:bg-[var(--gold-bg)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create User
        </Link>
      </div>

      <UsersClientTable users={users ?? []} />
    </div>
  );
}
