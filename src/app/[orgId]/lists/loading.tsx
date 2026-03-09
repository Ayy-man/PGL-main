import { Skeleton } from "@/components/ui/skeleton";

export default function ListsLoading() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-[160px] max-w-full" />
        <Skeleton className="h-5 w-[260px] max-w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] w-full rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
