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
    <div className="space-y-8">
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
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Search Prospects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a persona to find matching prospects
        </p>
      </div>
      <Suspense fallback={<SearchFallback />}>
        <SearchContent personas={personas} lists={lists} orgId={orgId} />
      </Suspense>
    </div>
  );
}
