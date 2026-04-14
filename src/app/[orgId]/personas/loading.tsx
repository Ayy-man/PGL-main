import { Skeleton } from "@/components/ui/skeleton";

export default function PersonasLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-[8px]" />
          <Skeleton className="h-4 w-72 rounded-[6px]" />
        </div>
        <Skeleton className="h-9 w-36 rounded-[8px]" />
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
