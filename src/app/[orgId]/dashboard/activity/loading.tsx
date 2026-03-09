import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityLoading() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-[180px] max-w-full" />
        <Skeleton className="h-5 w-[240px] max-w-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
