import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Look up tenant by slug or UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("id, name, slug, logo_url, primary_color, secondary_color, is_active")
    .eq(isUuid ? "id" : "slug", orgId)
    .single();

  if (error || !tenant || !tenant.is_active) {
    notFound();
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        orgId={orgId}
        tenantName={tenant.name}
        logoUrl={tenant.logo_url}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>

    </div>
  );
}
