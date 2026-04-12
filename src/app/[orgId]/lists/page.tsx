import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLists } from "@/lib/lists/queries";
import { ListsPageClient } from "./components/lists-page-client";

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

  return <ListsPageClient lists={lists} />;
}
