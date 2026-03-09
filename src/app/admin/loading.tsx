import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-4 md:space-y-6">
      <Skeleton className="h-9 w-[200px] max-w-full" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
