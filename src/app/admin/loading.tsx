import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-[200px] rounded-[8px]" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[180px] rounded-[14px]" />
        ))}
      </div>
      <Skeleton className="h-[360px] rounded-[14px]" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-[280px] rounded-[14px]" />
        <Skeleton className="h-[280px] rounded-[14px]" />
      </div>
    </div>
  );
}
