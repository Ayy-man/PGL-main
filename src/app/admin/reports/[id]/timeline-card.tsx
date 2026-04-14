"use client";

import type { IssueReportEventWithActor, IssueStatus } from "@/types/database";

interface TimelineCardProps {
  events: IssueReportEventWithActor[];
  reporterName: string | null;
  category: string;
  description: string;
}

const STATUS_LABEL: Record<IssueStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  resolved: "Resolved",
  wontfix: "Won't Fix",
  duplicate: "Duplicate",
};

const CLOSED_STATUSES: IssueStatus[] = ["resolved", "wontfix", "duplicate"];

const CATEGORY_LABELS: Record<string, string> = {
  incorrect_data: "Incorrect data",
  missing_data: "Missing data",
  bad_source: "Bad source",
  bug: "Bug",
  other: "Other",
};

function formatRelative(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function actorName(actor: IssueReportEventWithActor["actor"]): string {
  if (!actor) return "Unknown";
  return actor.full_name ?? actor.email;
}

interface Variant {
  dotColor: string; // CSS var or hex
  headline: React.ReactNode;
  body: React.ReactNode | null;
}

function renderVariant(
  event: IssueReportEventWithActor,
  reporterName: string | null,
  category: string,
  description: string
): Variant {
  switch (event.event_type) {
    case "reported":
      return {
        dotColor: "var(--destructive, #ef4444)",
        headline: (
          <>
            Reported by <span className="font-semibold">{reporterName ?? "Unknown tenant"}</span>
          </>
        ),
        body: (
          <>
            <span className="text-xs uppercase tracking-wider text-muted-foreground mr-2">
              {CATEGORY_LABELS[category] ?? category}
            </span>
            <span>{description.slice(0, 100)}{description.length > 100 ? "…" : ""}</span>
          </>
        ),
      };
    case "status_changed": {
      const from = event.from_status ? STATUS_LABEL[event.from_status] : "—";
      const to = event.to_status ? STATUS_LABEL[event.to_status] : "—";
      const isClose = !!event.to_status && CLOSED_STATUSES.includes(event.to_status);
      const isReopen =
        !!event.from_status &&
        CLOSED_STATUSES.includes(event.from_status) &&
        !!event.to_status &&
        !CLOSED_STATUSES.includes(event.to_status);

      const body = event.note
        ? (
          <div
            className="mt-1 rounded-[6px] px-2 py-1.5 text-xs whitespace-pre-wrap"
            style={{ background: "var(--bg-root)", color: "var(--text-secondary-ds)" }}
          >
            {event.note}
          </div>
        )
        : null;

      if (isClose && event.to_status) {
        return {
          dotColor: "var(--success, #22c55e)",
          headline: (
            <>
              <span className="font-semibold">{actorName(event.actor)}</span>
              {" "}closed as {STATUS_LABEL[event.to_status]}
            </>
          ),
          body,
        };
      }
      if (isReopen) {
        return {
          dotColor: "var(--destructive, #ef4444)",
          headline: (
            <>
              <span className="font-semibold">{actorName(event.actor)}</span>
              {" "}reopened ticket
            </>
          ),
          body,
        };
      }
      return {
        dotColor: "#3b82f6", // blue-500
        headline: (
          <>
            <span className="font-semibold">{actorName(event.actor)}</span>
            {" "}changed status: {from} → {to}
          </>
        ),
        body,
      };
    }
    case "note_added":
      return {
        dotColor: "#9ca3af", // gray-400
        headline: (
          <>
            <span className="font-semibold">{actorName(event.actor)}</span> added a note
          </>
        ),
        body: event.note
          ? (
            <div
              className="mt-1 rounded-[6px] px-2 py-1.5 text-xs whitespace-pre-wrap"
              style={{ background: "var(--bg-root)", color: "var(--text-secondary-ds)" }}
            >
              {event.note}
            </div>
          )
          : null,
      };
    case "viewed_by_admin":
      return {
        dotColor: "#4b5563", // gray-600 (fainter)
        headline: (
          <>
            <span className="font-semibold">{actorName(event.actor)}</span> viewed
          </>
        ),
        body: null,
      };
    case "screenshot_expired":
      return {
        dotColor: "#f59e0b", // amber-500
        headline: <>Screenshot expired</>,
        body: null,
      };
    default:
      return {
        dotColor: "#6b7280",
        headline: <span className="text-muted-foreground">Unknown event</span>,
        body: null,
      };
  }
}

export function TimelineCard({ events, reporterName, category, description }: TimelineCardProps) {
  // Newest on top per spec. Events arrive ASC from the API, so reverse for display.
  const ordered = [...events].reverse();

  return (
    <div className="surface-admin-card rounded-[14px] p-5 space-y-3">
      <h2
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--admin-text-secondary)" }}
      >
        Timeline
      </h2>
      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events yet.</p>
      ) : (
        <ol className="relative space-y-4">
          {ordered.map((event, idx) => {
            const v = renderVariant(event, reporterName, category, description);
            const isLast = idx === ordered.length - 1;
            return (
              <li key={event.id} className="relative pl-6">
                {/* Vertical connector line (hidden on last row) */}
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute left-[5px] top-4 bottom-[-1rem] w-px"
                    style={{ background: "var(--border-subtle)" }}
                  />
                )}
                {/* Dot */}
                <span
                  aria-hidden
                  className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full"
                  style={{
                    background: v.dotColor,
                    boxShadow: "0 0 0 2px var(--bg-elevated)",
                  }}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm" style={{ color: "var(--text-primary-ds)" }}>
                      {v.headline}
                    </p>
                    {v.body && (
                      <div className="text-xs" style={{ color: "var(--text-secondary-ds)" }}>
                        {v.body}
                      </div>
                    )}
                  </div>
                  <time
                    dateTime={event.created_at}
                    title={new Date(event.created_at).toISOString()}
                    className="shrink-0 text-xs text-muted-foreground"
                  >
                    {formatRelative(event.created_at)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
