"use client";

type ChannelStatus = {
  channelId: string;
  displayName: string;
  resultCount: number;
  cached: boolean;
  latencyMs: number;
  error?: string;
};

interface ChannelStatusBarProps {
  statuses: ChannelStatus[];
  loading?: boolean;
}

export function ChannelStatusBar({ statuses, loading }: ChannelStatusBarProps) {
  if (!statuses || statuses.length === 0) {
    if (!loading) return null;

    // Loading state with no statuses yet: show a generic pulse indicator
    return (
      <div className="flex flex-wrap gap-2 p-3 rounded-lg surface-card">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[rgba(255,255,255,0.05)]"
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-[var(--gold-primary)]" />
            <span className="text-[var(--text-secondary-ds)]">
              Searching…
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-lg surface-card">
      {statuses.map((status) => {
        const isLoading =
          loading && status.resultCount === 0 && !status.error;
        const hasError = Boolean(status.error);
        const hasResults = status.resultCount > 0;
        const isEmpty = !hasResults && !hasError && !isLoading;

        // Determine dot color and label
        let dotClass = "w-1.5 h-1.5 rounded-full ";
        let label: string;

        if (isLoading) {
          dotClass += "animate-pulse bg-[var(--gold-primary)]";
          label = "Searching…";
        } else if (hasError) {
          dotClass += "bg-red-500";
          const truncated =
            status.error!.length > 30
              ? status.error!.slice(0, 30) + "…"
              : status.error!;
          label = truncated;
        } else if (hasResults) {
          dotClass += "bg-emerald-500";
          label = status.cached
            ? `${status.resultCount} results (cached)`
            : `${status.resultCount} results`;
        } else if (isEmpty) {
          dotClass += "bg-zinc-500";
          label = "No results";
        } else {
          dotClass += "bg-zinc-500";
          label = "Done";
        }

        return (
          <div
            key={status.channelId}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[rgba(255,255,255,0.05)]"
            title={status.error ?? undefined}
          >
            <span className={dotClass} />
            <span className="text-[var(--text-secondary-ds)]">
              {status.displayName}
            </span>
            <span className="text-[var(--text-secondary-ds)] opacity-60">
              {label}
            </span>
            {!isLoading && !hasError && status.latencyMs > 0 && (
              <span className="text-[10px] text-[var(--text-secondary-ds)] opacity-40 ml-0.5">
                {status.latencyMs}ms
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
