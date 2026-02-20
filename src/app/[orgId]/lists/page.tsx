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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">Lists</h1>
          <p className="text-muted-foreground mt-1">
            Organize prospects for targeted outreach campaigns
          </p>
        </div>
        <CreateListDialog />
      </div>

      {lists.length === 0 ? (
        <EmptyState
          icon={List}
          title="No lists yet"
          description="Create one to start organizing prospects."
        >
          <CreateListDialog />
        </EmptyState>
      ) : (
        <ListGrid lists={lists} />
      )}
    </div>
  );
}
