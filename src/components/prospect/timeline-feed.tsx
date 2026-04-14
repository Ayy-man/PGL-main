"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  Phone,
  Mail,
  Users,
  Linkedin,
  Eye,
  Zap,
  FileText,
  MessageSquare,
  ListPlus,
  ListMinus,
  Download,
  Edit3,
  Tag,
  UserPlus,
  Camera,
  RefreshCw,
  TrendingUp,
  Pin,
  Search,
  MoreHorizontal,
  ChevronDown,
  Loader2,
} from "lucide-react";
import type { ProspectActivity, ActivityCategory, EventType } from "@/types/activity";
import { EmptyState } from "@/components/ui/empty-state";

/* ------------------------------------------------------------------ */
/*  Icon + color maps                                                  */
/* ------------------------------------------------------------------ */

const EVENT_ICONS: Partial<Record<EventType, React.ElementType>> = {
  call: Phone,
  email: Mail,
  met: Users,
  linkedin: Linkedin,
  profile_viewed: Eye,
  enrichment_started: Zap,
  enrichment_complete: Zap,
  enrichment_failed: Zap,
  contactout_updated: RefreshCw,
  exa_updated: Search,
  sec_updated: FileText,
  ai_summary_updated: Zap,
  market_data_updated: TrendingUp,
  new_signal: TrendingUp,
  research_scrapbook_search: Search,
  research_scrapbook_pin: Pin,
  note_added: MessageSquare,
  added_to_list: ListPlus,
  removed_from_list: ListMinus,
  exported_csv: Download,
  profile_edited: Edit3,
  status_changed: RefreshCw,
  tag_added: Tag,
  tag_removed: Tag,
  assigned_to: UserPlus,
  photo_uploaded: Camera,
  custom: Activity,
};

const ICON_COLORS: Record<ActivityCategory, string> = {
  outreach: "var(--gold-primary)",
  data: "var(--info, #3b82f6)",
  team: "rgba(255,255,255,0.3)",
  custom: "#a855f7",
};

/* ------------------------------------------------------------------ */
/*  Helpers (unchanged)                                                */
/* ------------------------------------------------------------------ */

interface TimelineFeedProps {
  prospectId: string;
  initialEvents: ProspectActivity[];
  initialUsers: Record<string, { full_name: string }>;
  activeCategories: ActivityCategory[];
  showSystemEvents: boolean;
  refreshTrigger?: number;
}

interface DateGroup {
  label: string;
  events: ProspectActivity[];
  isEarlier?: boolean;
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - eventDay.getTime()) / 86400000);

  if (eventDay.getTime() === today.getTime()) return "Today";
  if (eventDay.getTime() === yesterday.getTime()) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }
  if (diffDays <= 30) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return "Earlier";
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function groupEventsByDate(events: ProspectActivity[]): DateGroup[] {
  const groupMap = new Map<string, ProspectActivity[]>();

  for (const event of events) {
    const label = getDateLabel(event.event_at);
    if (!groupMap.has(label)) groupMap.set(label, []);
    groupMap.get(label)!.push(event);
  }

  const groups: DateGroup[] = Array.from(groupMap.entries()).map(([label, evts]) => ({
    label,
    events: evts,
    isEarlier: label === "Earlier",
  }));
  return groups;
}

/* ------------------------------------------------------------------ */
/*  EventRow                                                           */
/* ------------------------------------------------------------------ */

interface EventRowProps {
  event: ProspectActivity;
  users: Record<string, { full_name: string }>;
  prospectId: string;
  onEventDeleted: (id: string) => void;
  onEventUpdated: (event: ProspectActivity) => void;
}

function EventRow({ event, users, prospectId, onEventDeleted, onEventUpdated }: EventRowProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState(event.note ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();

  const Icon = EVENT_ICONS[event.event_type] ?? Activity;
  const iconColor = ICON_COLORS[event.category] ?? "rgba(255,255,255,0.3)";

  const userName = event.user_id ? (users[event.user_id]?.full_name ?? "Team member") : null;
  const firstName = userName ? userName.split(" ")[0] : null;

  // Check if event was backdated (event_at differs from created_at by more than 1 minute)
  const eventAt = new Date(event.event_at).getTime();
  const createdAt = new Date(event.created_at).getTime();
  const isBackdated = Math.abs(createdAt - eventAt) > 60000;

  async function saveEditNote() {
    const previousNote = event.note;
    const trimmedNote = editNote.trim() || null;
    // Optimistic: update parent immediately
    onEventUpdated({ ...event, note: trimmedNote });
    setIsEditing(false);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/activity/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: trimmedNote }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const data = await res.json();
      onEventUpdated(data.event ?? { ...event, note: trimmedNote });
    } catch (err) {
      console.error("[TimelineFeed] edit note error:", err);
      onEventUpdated({ ...event, note: previousNote }); // Rollback
      setEditNote(previousNote ?? "");
      setIsEditing(true); // Re-open editor
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteEvent() {
    // Optimistic: remove from timeline immediately
    onEventDeleted(event.id);
    toast({ title: "Activity deleted" });
    try {
      const res = await fetch(`/api/prospects/${prospectId}/activity/${event.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
    } catch (err) {
      console.error("[TimelineFeed] delete event error:", err);
      toast({ title: "Delete failed — refresh to restore", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="relative flex items-start gap-2 py-1.5 px-1.5 rounded-[4px] transition-colors duration-100"
      style={{ background: isHovered ? "rgba(255,255,255,0.02)" : "transparent" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
    >
      {/* Icon — fixed width for alignment */}
      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-[2px]">
        <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Main row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-xs leading-tight">
              {firstName && (
                <span
                  className="font-semibold"
                  style={{ color: "var(--text-foreground, rgba(232,228,220,0.9))" }}
                >
                  {firstName}
                </span>
              )}
              {firstName && " "}
              <span style={{ color: "var(--text-secondary, rgba(232,228,220,0.55))" }}>
                {event.title}
              </span>
              <span
                className="ml-1"
                style={{ color: "var(--text-secondary, rgba(232,228,220,0.3))" }}
              >
                &middot; {formatRelativeTime(event.event_at)}
              </span>
            </span>
          </div>

          {/* Three-dot menu (hover only) */}
          {isHovered && (
            <div className="relative flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
                className="flex items-center justify-center w-5 h-5 rounded transition-colors duration-150"
                style={{ color: "var(--text-secondary, rgba(232,228,220,0.4))" }}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>

              {showMenu && !showDeleteConfirm && (
                <div
                  className="absolute right-0 top-full mt-1 z-50 rounded-[6px] border py-1 min-w-[120px]"
                  style={{
                    background: "#1a1a1a",
                    borderColor: "var(--border-default, rgba(255,255,255,0.06))",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                  }}
                >
                  <button
                    onClick={() => { setIsEditing(true); setShowMenu(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs transition-colors duration-150 hover:bg-white/5"
                    style={{ color: "var(--text-foreground, rgba(232,228,220,0.9))" }}
                  >
                    Edit note
                  </button>
                  <button
                    onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs transition-colors duration-150 hover:bg-white/5"
                    style={{ color: "var(--destructive, #ef4444)" }}
                  >
                    Delete event
                  </button>
                </div>
              )}

              {/* Delete confirm */}
              {showDeleteConfirm && (
                <div
                  className="absolute right-0 top-full mt-1 z-50 rounded-[6px] border p-3 min-w-[160px]"
                  style={{
                    background: "#1a1a1a",
                    borderColor: "var(--destructive, rgba(239,68,68,0.3))",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                  }}
                >
                  <p className="text-[11px] mb-2" style={{ color: "var(--text-foreground, rgba(232,228,220,0.9))" }}>
                    Delete this event?
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-2 py-1 text-[10px] rounded border"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        borderColor: "var(--border-default, rgba(255,255,255,0.06))",
                        color: "var(--text-secondary, rgba(232,228,220,0.5))",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={deleteEvent}
                      disabled={isDeleting}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] rounded border"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        borderColor: "var(--destructive, #ef4444)",
                        color: "var(--destructive, #ef4444)",
                      }}
                    >
                      {isDeleting ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Note display (not editing) */}
        {event.note && !isEditing && (
          <p
            className="text-[11px] mt-0.5 truncate"
            title={event.note}
            style={{ color: "var(--text-secondary, rgba(232,228,220,0.4))" }}
          >
            {event.note}
          </p>
        )}

        {/* Inline edit note */}
        {isEditing && (
          <div className="mt-1 flex flex-col gap-1">
            <textarea
              rows={2}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") { setIsEditing(false); setEditNote(event.note ?? ""); }
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEditNote(); }
              }}
              className="w-full px-2 py-1 text-xs rounded-[6px] border outline-none resize-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "var(--border-default, rgba(255,255,255,0.06))",
                color: "var(--text-foreground, rgba(232,228,220,0.9))",
              }}
            />
            <div className="flex gap-1 justify-end">
              <button
                onClick={() => { setIsEditing(false); setEditNote(event.note ?? ""); }}
                className="px-2 py-0.5 text-[10px] rounded border"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "var(--border-default, rgba(255,255,255,0.06))",
                  color: "var(--text-secondary, rgba(232,228,220,0.5))",
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveEditNote}
                disabled={isSaving}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border"
                style={{
                  background: "rgba(212,175,55,0.1)",
                  borderColor: "var(--gold-primary)",
                  color: "var(--gold-primary)",
                }}
              >
                {isSaving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Data category metadata */}
        {event.category === "data" && Object.keys(event.metadata ?? {}).length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {event.metadata?.source != null && (
              <span className="text-[10px]" style={{ color: "var(--text-secondary, rgba(232,228,220,0.4))" }}>
                Source: {String(event.metadata.source as unknown)}
              </span>
            )}
            {Array.isArray(event.metadata?.fields) && (
              <span className="text-[10px]" style={{ color: "var(--text-secondary, rgba(232,228,220,0.4))" }}>
                Fields: {(event.metadata.fields as string[]).join(", ")}
              </span>
            )}
          </div>
        )}

        {/* Custom: backdated label */}
        {event.category === "custom" && isBackdated && (
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary, rgba(232,228,220,0.4))" }}>
            Backdated to {formatDate(event.event_at)}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TimelineFeed (main component)                                      */
/* ------------------------------------------------------------------ */

export function TimelineFeed({
  prospectId,
  initialEvents,
  initialUsers,
  activeCategories,
  showSystemEvents,
  refreshTrigger,
}: TimelineFeedProps) {
  const [events, setEvents] = useState<ProspectActivity[]>(initialEvents);
  const [users, setUsers] = useState<Record<string, { full_name: string }>>(initialUsers);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandEarlier, setExpandEarlier] = useState(false);

  const fetchEvents = useCallback(async (categories: ActivityCategory[], cursor?: string) => {
    const params = new URLSearchParams();
    if (categories.length > 0 && categories.length < 4) {
      params.set("category", categories.join(","));
    }
    params.set("limit", "50");
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/prospects/${prospectId}/activity?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch events");
    return res.json() as Promise<{
      events: ProspectActivity[];
      users: Record<string, { full_name: string }>;
      hasMore: boolean;
    }>;
  }, [prospectId]);

  // Re-fetch when filters or refreshTrigger change
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchEvents(activeCategories)
      .then((data) => {
        if (cancelled) return;
        setEvents(data.events);
        setUsers(data.users);
        setHasMore(data.hasMore);
      })
      .catch((err) => {
        if (!cancelled) console.error("[TimelineFeed] fetch error:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeCategories, refreshTrigger, fetchEvents]);

  async function loadMore() {
    if (!events.length) return;
    const lastEvent = events[events.length - 1];
    setIsLoadingMore(true);
    try {
      const data = await fetchEvents(activeCategories, lastEvent.event_at);
      setEvents((prev) => [...prev, ...data.events]);
      setUsers((prev) => ({ ...prev, ...data.users }));
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("[TimelineFeed] load more error:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleEventDeleted(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  function handleEventUpdated(updated: ProspectActivity) {
    setEvents((prev) => prev.map((e) => e.id === updated.id ? updated : e));
  }

  // Client-side filter
  const filteredEvents = events.filter((e) => {
    if (!activeCategories.includes(e.category)) return false;
    if (!showSystemEvents && e.category === "data" && !e.user_id) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2" style={{ color: "var(--text-secondary, rgba(232,228,220,0.4))" }}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Loading activity...</span>
      </div>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Actions on this prospect will appear here."
      />
    );
  }

  const groups = groupEventsByDate(filteredEvents);

  return (
    <div className="flex flex-col">
      {groups.map((group) => {
        // Handle "Earlier" bucket
        if (group.isEarlier && !expandEarlier) {
          return (
            <div key="earlier">
              <button
                onClick={() => setExpandEarlier(true)}
                className="flex items-center gap-1.5 text-xs py-1.5 px-1.5"
                style={{ color: "var(--text-secondary, rgba(232,228,220,0.4))" }}
              >
                <ChevronDown className="h-3 w-3" />
                Show {group.events.length} earlier event{group.events.length !== 1 ? "s" : ""}
              </button>
            </div>
          );
        }

        return (
          <div key={group.label}>
            {/* Date group header */}
            <p
              className="text-[10px] uppercase tracking-wider pt-3 pb-1 first:pt-0"
              style={{ color: "var(--text-secondary, rgba(232,228,220,0.3))" }}
            >
              {group.label}
            </p>

            {/* Events */}
            {group.events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                users={users}
                prospectId={prospectId}
                onEventDeleted={handleEventDeleted}
                onEventUpdated={handleEventUpdated}
              />
            ))}
          </div>
        );
      })}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoadingMore}
          className="flex items-center justify-center gap-2 py-2 mt-2 text-xs rounded-[8px] border transition-all duration-150"
          style={{
            background: "rgba(255,255,255,0.02)",
            borderColor: "var(--border-default, rgba(255,255,255,0.06))",
            color: "var(--text-secondary, rgba(232,228,220,0.5))",
          }}
        >
          {isLoadingMore ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Load more
            </>
          )}
        </button>
      )}
    </div>
  );
}
