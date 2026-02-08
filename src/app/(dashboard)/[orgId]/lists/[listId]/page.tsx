import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getListById, getListMembers } from "@/lib/lists/queries";
import { ListMemberTable } from "../components/list-member-table";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ orgId: string; listId: string }>;
}

export default async function ListDetailPage({ params }: PageProps) {
  const { orgId, listId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    redirect("/login");
  }

  const [list, members] = await Promise.all([
    getListById(listId, tenantId),
    getListMembers(listId, tenantId)
  ]);

  if (!list) {
    notFound();
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${orgId}/lists`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-serif font-bold">{list.name}</h1>
          {list.description && (
            <p className="text-muted-foreground mt-1">{list.description}</p>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? "member" : "members"}
        </div>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground text-lg">
            No prospects in this list yet. Add prospects from the search page.
          </p>
        </div>
      ) : (
        <ListMemberTable members={members} />
      )}
    </div>
  );
}
