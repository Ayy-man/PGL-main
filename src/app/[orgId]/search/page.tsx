import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPersonas } from "@/lib/personas/queries";
import { getLists } from "@/lib/lists/queries";
import { SearchContent } from "./components/search-content";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

function SearchFallback() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-72" />
      </div>
      <Skeleton className="h-10 w-[320px]" />
      <Skeleton className="h-[500px] w-full" />
    </div>
  );
}

export default async function SearchPage({ params }: PageProps) {
  const { orgId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    redirect("/login");
  }

  const [personas, lists] = await Promise.all([
    getPersonas(tenantId),
    getLists(tenantId),
  ]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Search Prospects</h1>
        <p className="text-muted-foreground mt-1">
          Select a persona to discover matching prospects from Apollo.io
        </p>
      </div>
      <Suspense fallback={<SearchFallback />}>
        <SearchContent personas={personas} lists={lists} orgId={orgId} />
      </Suspense>
    </div>
  );
}
