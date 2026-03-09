import { Skeleton } from "@/components/ui/skeleton";

export default function ExportsLoading() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-[180px] max-w-full" />
        <Skeleton className="h-5 w-[280px] max-w-full" />
      </div>
      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] w-full rounded-[14px]" />
        ))}
      </div>
      {/* Table skeleton */}
      <Skeleton className="h-[300px] md:h-[400px] w-full rounded-[14px]" />
    </div>
  );
}
