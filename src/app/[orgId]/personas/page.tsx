import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPersonas } from "@/lib/personas/queries";
import { PersonaList } from "./components/persona-list";
import { PersonaFormDialog } from "./components/persona-form-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Users } from "lucide-react";

export default async function PersonasPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId) {
    redirect("/login");
  }

  const personas = await getPersonas(tenantId);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Personas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {personas.length > 0
              ? `${personas.length} persona${personas.length === 1 ? "" : "s"} configured`
              : "Define ideal buyer profiles for targeted search"}
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
        <EmptyState
          icon={Users}
          title="No personas yet"
          description="Create a persona to define your ideal buyer profile and start searching."
        >
          <PersonaFormDialog
            mode="create"
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Create Persona
              </Button>
            }
          />
        </EmptyState>
      ) : (
        <PersonaList personas={personas} />
      )}
    </div>
  );
}
