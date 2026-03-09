import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLists } from "@/lib/lists/queries";
import { ListGrid } from "./components/list-grid";
import { CreateListDialog } from "./components/create-list-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { List } from "lucide-react";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function ListsPage({ params }: PageProps) {
  await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    redirect("/login");
  }

  const lists = await getLists(tenantId);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">Lists</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lists.length > 0
              ? `${lists.length} list${lists.length === 1 ? "" : "s"}`
              : "Organize prospects into targeted groups"}
          </p>
        </div>
        <CreateListDialog />
      </div>

      {lists.length === 0 ? (
        <EmptyState
          icon={List}
          title="No lists yet"
          description="Create your first list to start organizing prospects for outreach."
        >
          <CreateListDialog />
        </EmptyState>
      ) : (
        <ListGrid lists={lists} />
      )}
    </div>
  );
}
