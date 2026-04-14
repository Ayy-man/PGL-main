import { Skeleton } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[200px] rounded-[8px]" />
        <Skeleton className="h-10 w-[160px] rounded-[8px]" />
      </div>
      <div className="surface-card rounded-[14px] p-6">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-[8px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
