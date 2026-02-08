import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPersonas } from "@/lib/personas/queries";
import { PersonaList } from "./components/persona-list";
import { PersonaFormDialog } from "./components/persona-form-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function PersonasPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  await params; // Required for Next.js 15 async params
  const supabase = await createClient();

  // Get authenticated user and tenant ID from session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId) {
    redirect("/login");
  }

  // Fetch personas
  const personas = await getPersonas(tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Personas
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage search personas with Apollo.io filters
          </p>
        </div>

        <PersonaFormDialog
          mode="create"
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              Create Persona
            </Button>
          }
        />
      </div>

      {personas.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No personas yet. Create one to start searching.
          </p>
        </div>
      ) : (
        <PersonaList personas={personas} />
      )}
    </div>
  );
}
