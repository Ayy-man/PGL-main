"use client";

interface ChannelFilterChipsProps {
  availableChannels: Array<{
    channelId: string;
    displayName: string;
    resultCount: number;
  }>;
  activeFilters: Set<string>;
  onToggle: (channelId: string) => void;
}

export function ChannelFilterChips({
  availableChannels,
  activeFilters,
  onToggle,
}: ChannelFilterChipsProps) {
  if (!availableChannels || availableChannels.length === 0) return null;

  const allActive = activeFilters.size === 0;

  const handleAllClick = () => {
    // Clear all active filters to show everything
    activeFilters.forEach((id) => onToggle(id));
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* "All" chip */}
      <button
        type="button"
        onClick={handleAllClick}
        className={[
          "px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors",
          allActive
            ? "bg-[var(--gold-bg-strong)] text-[var(--gold-primary)] border-[var(--border-gold)]"
            : "bg-transparent text-[var(--text-secondary-ds)] border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]",
        ].join(" ")}
      >
        All
        <span className="ml-1 text-[10px] opacity-70">
          {availableChannels.reduce((sum, ch) => sum + ch.resultCount, 0)}
        </span>
      </button>

      {/* Per-channel chips */}
      {availableChannels.map((channel) => {
        const isActive = activeFilters.has(channel.channelId);
        return (
          <button
            key={channel.channelId}
            type="button"
            onClick={() => onToggle(channel.channelId)}
            className={[
              "px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors",
              isActive
                ? "bg-[var(--gold-bg-strong)] text-[var(--gold-primary)] border-[var(--border-gold)]"
                : "bg-transparent text-[var(--text-secondary-ds)] border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]",
            ].join(" ")}
          >
            {channel.displayName}
            <span className="ml-1 text-[10px] opacity-70">
              {channel.resultCount}
            </span>
          </button>
        );
      })}
    </div>
  );
}
