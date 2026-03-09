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


function getEventLabel(actionType: string): string {
  switch (actionType) {
    case "search_executed":
      return "Search Executed";
    case "lookalike_search":
      return "Lookalike Search";
    case "profile_enriched":
      return "Enrichment Triggered";
    case "profile_viewed":
      return "Profile Viewed";
    case "note_added":
      return "Note Added";
    case "add_to_list":
      return "Added to List";
    case "remove_from_list":
      return "Removed from List";
    case "status_updated":
      return "Status Updated";
    case "csv_exported":
      return "CSV Exported";
    default:
      return actionType
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

function getEventDetail(event: ActivityEvent): string | null {
  if (!event.metadata) return null;
  const m = event.metadata;
  if (m.list_name) return `List: "${m.list_name}"`;
  if (m.persona_name) return `Persona: "${m.persona_name}"`;
  if (m.query) return `Query: "${String(m.query).slice(0, 40)}"`;
  return null;
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * ActivityTimeline — Right-column card-based timeline for the prospect dossier.
 *
 * Matches the stitch mockup "Activity Log" section:
 * - Vertical line with colored dot markers
 * - Card-based event entries with title, timestamp, and detail
 */
export function ActivityTimeline({ events }: ActivityTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          No activity recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 py-2 ml-4 space-y-6">
      {/* Vertical line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-px"
        style={{
          background: "var(--border-default, rgba(255,255,255,0.06))",
        }}
      />

      {events.map((event, index) => {
        const isFirst = index === 0;
        const detail = getEventDetail(event);

        return (
          <div key={event.id} className="relative">
            {/* Dot on the line */}
            <div
              className="absolute rounded-full"
              style={{
                left: "-28px",
                top: "14px",
                width: "10px",
                height: "10px",
                background: isFirst
                  ? "var(--gold-primary)"
                  : "var(--border-default, rgba(255,255,255,0.06))",
                boxShadow: isFirst
                  ? "0 0 0 3px rgba(212,175,55,0.2)"
                  : "none",
              }}
            />

            {/* Event card */}
            <div
              className="p-3 rounded-[8px] transition-colors cursor-pointer"
              style={{
                background: isFirst
                  ? "rgba(255,255,255,0.03)"
                  : "transparent",
                border: isFirst
                  ? "1px solid var(--border-default, rgba(255,255,255,0.06))"
                  : "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isFirst) {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "rgba(255,255,255,0.02)";
                } else {
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    "rgba(212,175,55,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isFirst) {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "transparent";
                } else {
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    "var(--border-default, rgba(255,255,255,0.06))";
                }
              }}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-foreground">
                  {getEventLabel(event.action_type)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatRelativeDate(event.created_at)}
                </span>
              </div>
              {detail && (
                <p className="text-xs text-muted-foreground">{detail}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
