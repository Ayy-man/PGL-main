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
        <Skeleton className="h-12 w-64 mb-3" />
        <Skeleton className="h-5 w-72" />
      </div>
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}
      >
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-[200px] w-full rounded-[14px]" />
        ))}
      </div>
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
    <Suspense fallback={<SearchFallback />}>
      <SearchContent personas={personas} lists={lists} orgId={orgId} />
    </Suspense>
  );
}
