import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      <Skeleton className="h-8 w-[200px] rounded-[8px]" />
      <div className="surface-card rounded-[14px] p-6 space-y-4">
        <Skeleton className="h-5 w-[140px] rounded" />
        <Skeleton className="h-10 w-full rounded-[8px]" />
        <Skeleton className="h-10 w-full rounded-[8px]" />
        <Skeleton className="h-10 w-[120px] rounded-[8px]" />
      </div>
      <div className="surface-card rounded-[14px] p-6 space-y-4">
        <Skeleton className="h-5 w-[160px] rounded" />
        <Skeleton className="h-10 w-full rounded-[8px]" />
        <Skeleton className="h-10 w-full rounded-[8px]" />
      </div>
    </div>
  );
}
