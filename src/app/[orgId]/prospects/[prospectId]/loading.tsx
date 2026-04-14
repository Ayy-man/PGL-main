import { Skeleton } from "@/components/ui/skeleton";

export default function ProspectProfileLoading() {
  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="surface-card rounded-[14px] p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-56 rounded-[8px]" />
            <Skeleton className="h-4 w-40 rounded-[6px]" />
            <Skeleton className="h-4 w-32 rounded-[6px]" />
          </div>
          <Skeleton className="h-9 w-28 rounded-[8px]" />
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-48 rounded-[14px]" />
          <Skeleton className="h-64 rounded-[14px]" />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-[14px]" />
          <Skeleton className="h-48 rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}
