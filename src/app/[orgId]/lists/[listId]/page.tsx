import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getListById, getListMembers } from "@/lib/lists/queries";
import { ListMemberTable } from "../components/list-member-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ReportIssueButton } from "@/components/issues/report-issue-button";
import { ArrowLeft, Users } from "lucide-react";

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

  let list;
  let members;

  try {
    [list, members] = await Promise.all([
      getListById(listId, tenantId),
      getListMembers(listId, tenantId)
    ]);
  } catch (error) {
    console.error("[ListDetailPage] Failed to load list data:", { listId, tenantId, error });
    throw error; // Surface real errors to error boundary instead of masking as 404
  }

  if (!list) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${orgId}/lists`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-serif text-3xl font-bold tracking-tight">{list.name}</h1>
          {list.description && (
            <p className="mt-1 text-sm text-muted-foreground">{list.description}</p>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? "member" : "members"}
        </div>
        <ReportIssueButton
          target={{
            type: "list",
            id: list.id,
            snapshot: {
              name: list.name ?? null,
              description: list.description ?? null,
              member_count: members.length,
            },
          }}
        />
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No prospects in this list yet"
          description="Add prospects from the search page to start building your pipeline."
        />
      ) : (
        <ListMemberTable members={members} />
      )}
    </div>
  );
}
