"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Activity } from "lucide-react";

interface ActivityEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  login: "Logged In",
  search_executed: "Executed Search",
  profile_viewed: "Viewed Profile",
  profile_enriched: "Enriched Profile",
  add_to_list: "Added to List",
  remove_from_list: "Removed from List",
  status_updated: "Updated Status",
  note_added: "Added Note",
  csv_exported: "Exported CSV",
  persona_created: "Created Persona",
  lookalike_search: "Lookalike Search",
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function ActivityFeed() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/activity?limit=10&page=1");
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
  }, [fetchEntries]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity
            className="h-4 w-4 shrink-0"
            style={{ color: "var(--gold-muted)" }}
          />
          <h3
            className="font-serif text-[22px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Live Feed
          </h3>
        </div>
        <button
          onClick={fetchEntries}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(232,228,220,0.6)",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = "var(--border-hover)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          }}
          aria-label="Refresh activity feed"
        >
          <RefreshCw className={`h-3 w-3 shrink-0 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-[8px]"
              style={{
                background: "var(--bg-elevated)",
              }}
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-8 text-center rounded-[14px]"
          style={{
            background: "var(--bg-card-gradient)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Activity
            className="h-8 w-8 mb-2"
            style={{ color: "var(--text-tertiary)" }}
          />
          <p
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            No recent activity
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 transition-colors"
              style={{ background: "transparent" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-elevated)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
                  {ACTION_LABELS[entry.action_type] || entry.action_type}
                </p>
                <p className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                  {entry.user_id.slice(0, 8)}...
                </p>
              </div>
              <span
                className="text-xs shrink-0"
                style={{ color: "var(--text-tertiary)" }}
              >
                {relativeTime(entry.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
