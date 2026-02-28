import { Skeleton } from "@/components/ui/skeleton";

export default function ExportsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-[180px]" />
        <Skeleton className="h-5 w-[280px]" />
      </div>
      {/* Stat cards row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] rounded-[14px]" />
        ))}
      </div>
      {/* Table skeleton */}
      <Skeleton className="h-[400px] rounded-[14px]" />
    </div>
  );
}
