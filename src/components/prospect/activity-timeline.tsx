"use client";

interface ActivityEvent {
  id: string;
  action_type: string;
  user_id: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

function getEventColor(actionType: string): string {
  switch (actionType) {
    case "search_executed":
    case "lookalike_search":
      return "var(--info)";
    case "profile_enriched":
      return "var(--gold-primary)";
    case "note_added":
      return "var(--muted-foreground)";
    case "add_to_list":
    case "remove_from_list":
    case "status_updated":
      return "var(--success)";
    case "profile_viewed":
      return "var(--text-tertiary)";
    default:
      return "var(--text-muted)";
  }
}

function getEventLabel(actionType: string): string {
  switch (actionType) {
    case "search_executed":
      return "Search executed";
    case "lookalike_search":
      return "Lookalike search run";
    case "profile_enriched":
      return "Enrichment triggered";
    case "profile_viewed":
      return "Profile viewed";
    case "note_added":
      return "Note added";
    case "add_to_list":
      return "Added to list";
    case "remove_from_list":
      return "Removed from list";
    case "status_updated":
      return "Status updated";
    default:
      return actionType.replace(/_/g, " ");
  }
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo ago`;
  return `${Math.floor(diffDay / 365)}y ago`;
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      {/* Events */}
      <div>
        {events.map((event) => (
          <div key={event.id} className="relative pl-8 pb-6">
            {/* Event circle */}
            <div
              className="absolute left-[13px] top-0 h-[10px] w-[10px] rounded-full"
              style={{ background: getEventColor(event.action_type) }}
            />

            {/* Event content */}
            <p className="text-sm text-foreground leading-snug">
              {getEventLabel(event.action_type)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatRelativeDate(event.created_at)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
