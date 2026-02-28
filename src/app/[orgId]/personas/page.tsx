import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPersonas } from "@/lib/personas/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PersonasLayout } from "./components/personas-layout";
import { Users } from "lucide-react";

export default async function PersonasPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId) {
    redirect("/login");
  }

  const personas = await getPersonas(tenantId);

  return (
    <div className="space-y-6 page-enter">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: "Personas" }]} />

      {/* Page header — matches Screen C mockup */}
      <div>
        <h1
          className="font-serif text-[38px] font-medium"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.5px" }}
        >
          Saved Personas & Living Data
        </h1>
        <p
          className="mt-1 text-[14px] font-light"
          style={{ color: "var(--text-tertiary)" }}
        >
          Your active data streams. These personas are constantly updated with
          new leads matching your criteria.
        </p>
      </div>

      {/* Main content */}
      {personas.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No personas yet"
          description="Create a persona to define your ideal buyer profile and start searching for qualified prospects."
        />
      ) : (
        <PersonasLayout personas={personas} />
      )}
    </div>
  );
}
