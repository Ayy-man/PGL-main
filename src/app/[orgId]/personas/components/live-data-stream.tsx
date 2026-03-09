"use client";

import { useEffect, useState, useCallback } from "react";
import { type LucideIcon, Zap, TrendingUp, AlertCircle, Users, Search, FileDown, UserPlus, Activity } from "lucide-react";

interface ActivityEntry {
  id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { icon: LucideIcon; label: string; color: string; bg: string }> = {
  search_executed: { icon: Search, label: "Search", color: "var(--gold-primary)", bg: "var(--gold-bg)" },
  profile_viewed: { icon: Users, label: "Profile Viewed", color: "var(--gold-primary)", bg: "var(--gold-bg)" },
  profile_enriched: { icon: Zap, label: "Enrichment", color: "var(--success)", bg: "rgba(34,197,94,0.08)" },
  add_to_list: { icon: UserPlus, label: "Added to List", color: "var(--gold-bright)", bg: "rgba(240,208,96,0.08)" },
  csv_exported: { icon: FileDown, label: "Export", color: "var(--gold-primary)", bg: "var(--gold-bg-strong)" },
  persona_created: { icon: TrendingUp, label: "New Persona", color: "var(--gold-bright)", bg: "rgba(240,208,96,0.08)" },
  lookalike_search: { icon: Search, label: "Lookalike", color: "var(--gold-primary)", bg: "var(--gold-bg)" },
  login: { icon: Users, label: "Login", color: "var(--text-secondary)", bg: "rgba(255,255,255,0.04)" },
};

const DEFAULT_CONFIG = { icon: AlertCircle, label: "Activity", color: "var(--text-secondary)", bg: "rgba(255,255,255,0.04)" };

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getEventDetail(entry: ActivityEntry): string {
  const meta = entry.metadata;
  if (!meta) return entry.action_type.replace(/_/g, " ");

  switch (entry.action_type) {
    case "search_executed":
      return (meta.personaName as string) || (meta.query as string) || "Search performed";
    case "profile_viewed":
      return (meta.prospectName as string) || "Profile viewed";
    case "profile_enriched":
      return (meta.prospectName as string) || "Contact details updated";
    case "add_to_list":
      return (meta.listName as string) || "Added to list";
    case "csv_exported":
      return meta.rowCount ? `${meta.rowCount} records exported` : "CSV exported";
    case "persona_created":
      return (meta.personaName as string) || "New persona created";
    case "lookalike_search":
      return (meta.generatedPersonaName as string) || "Lookalike search";
    case "login":
      return "User signed in";
    default:
      return entry.action_type.replace(/_/g, " ");
  }
}

function getEventName(entry: ActivityEntry): string {
  const meta = entry.metadata;
  if (meta?.userName) return meta.userName as string;
  if (meta?.userEmail) return (meta.userEmail as string).split("@")[0];
  if (meta?.prospectName) return meta.prospectName as string;
  if (meta?.personaName) return meta.personaName as string;
  const config = ACTION_CONFIG[entry.action_type] || DEFAULT_CONFIG;
  return config.label;
}

export function LiveDataStream() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/activity?limit=8&page=1");
      const text = await res.text();
      let json: { data: ActivityEntry[] } | null = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
      setEntries(json?.data || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    // Poll every 30 seconds for new activity
    const interval = setInterval(fetchEntries, 30000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

  return (
    <aside
      className="hidden lg:flex flex-col gap-0 overflow-hidden"
      style={{
        background: "var(--bg-card-gradient)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "14px",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center gap-2"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div
          className="h-2 w-2 rounded-full animate-pulse"
          style={{ background: entries.length > 0 ? "var(--gold-primary)" : "var(--text-tertiary)" }}
        />
        <span
          className="text-[13px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Live Data Stream
        </span>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-5 py-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-[8px]"
                style={{ background: "var(--bg-elevated)" }}
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
            <Activity
              className="h-8 w-8 mb-3"
              style={{ color: "var(--text-tertiary)" }}
            />
            <p
              className="text-[13px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              No activity yet
            </p>
            <p
              className="text-[11px] mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Events will appear as you use the platform
            </p>
          </div>
        ) : (
          entries.map((entry) => {
            const config = ACTION_CONFIG[entry.action_type] || DEFAULT_CONFIG;
            const EventIcon = config.icon;
            const isHovered = hoveredId === entry.id;

            return (
              <div
                key={entry.id}
                className="px-5 py-3.5 flex gap-3 transition-colors"
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  background: isHovered ? "rgba(255,255,255,0.02)" : "transparent",
                }}
                onMouseEnter={() => setHoveredId(entry.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Icon circle */}
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: config.bg }}
                >
                  <EventIcon
                    className="h-3.5 w-3.5"
                    style={{ color: config.color }}
                  />
                </div>

                {/* Info block */}
                <div className="flex flex-col min-w-0">
                  {/* Row 1: name + time */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[13px] font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {getEventName(entry)}
                    </span>
                    <span
                      className="text-[11px] shrink-0"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {relativeTime(entry.created_at)}
                    </span>
                  </div>

                  {/* Row 2: detail */}
                  <span
                    className="text-[12px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {getEventDetail(entry)}
                  </span>

                  {/* Row 3: event type pill */}
                  <span
                    className="inline-flex items-center mt-1 text-[10px] font-semibold uppercase tracking-[0.5px] px-2 py-0.5 rounded-full w-fit"
                    style={{
                      background: config.bg,
                      color: config.color,
                    }}
                  >
                    {config.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
