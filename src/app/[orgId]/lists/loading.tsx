import { Skeleton } from "@/components/ui/skeleton";

export default function ListsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-[160px]" />
        <Skeleton className="h-5 w-[260px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
