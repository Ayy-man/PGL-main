import { ComingSoonCard } from "@/components/admin/coming-soon-card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Platform Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Cross-tenant usage metrics and platform insights
        </p>
      </div>

      <ComingSoonCard label="Coming Soon">
        <p className="text-xs text-muted-foreground mt-2 mb-6">
          In the meantime, see the{" "}
          <Link
            href="/admin"
            className="underline hover:text-foreground transition-colors"
          >
            Command Center
          </Link>{" "}
          for real-time metrics.
        </p>
        <div className="surface-admin-card rounded-[14px] p-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="mt-6 h-[300px] rounded-xl" />
        </div>
      </ComingSoonCard>
    </div>
  );
}
