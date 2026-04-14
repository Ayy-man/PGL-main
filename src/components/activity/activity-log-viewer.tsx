"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ACTION_TYPES, type ActionType } from "@/lib/activity-logger";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface ActivityEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  action_type: ActionType;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
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
  persona_created: "Created Saved Search",
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

const PAGE_SIZE = 50;

// Preset chip date ranges
type DatePreset = "today" | "7d" | "30d" | "clear";

function getPresetDates(preset: DatePreset): { start: string; end: string } {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  if (preset === "today") {
    return { start: toISO(now), end: toISO(now) };
  }
  if (preset === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { start: toISO(d), end: toISO(now) };
  }
  if (preset === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return { start: toISO(d), end: toISO(now) };
  }
  return { start: "", end: "" };
}

export function ActivityLogViewer() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());

  const [actionType, setActionType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionType) params.set("action_type", actionType);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/activity?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      const data: ActivityEntry[] = json.data || [];
      setEntries(data);
      setTotal(json.total || 0);

      // Resolve unique user IDs to names
      const uniqueIds = Array.from(new Set(data.map((e) => e.user_id)));
      if (uniqueIds.length > 0) {
        const supabase = createClient();
        const { data: users } = await supabase
          .from("users")
          .select("id, full_name, email")
          .in("id", uniqueIds);
        if (users) {
          const map = new Map(users.map((u: { id: string; full_name: string | null; email: string | null }) => [u.id, u.full_name || u.email || u.id.slice(0, 8)]));
          setUserMap(map);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [actionType, startDate, endDate, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyPreset = (preset: DatePreset) => {
    const { start, end } = getPresetDates(preset);
    setStartDate(start);
    setEndDate(end);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4">
        {/* Preset date chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["today", "7d", "30d", "clear"] as DatePreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary-ds)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-gold)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--gold-primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-subtle)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary-ds)";
              }}
            >
              {preset === "clear" ? "Clear" : preset === "today" ? "Today" : preset}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Action Type
          </label>
          <select
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value);
              setPage(1);
            }}
            className="rounded-md border bg-muted px-3 py-1.5 text-sm text-foreground focus:border-gold focus:outline-none"
          >
            <option value="">All Actions</option>
            {ACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {ACTION_LABELS[type] || type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="rounded-md border bg-muted px-3 py-1.5 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="rounded-md border bg-muted px-3 py-1.5 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Actions your team takes will appear here."
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border text-left text-muted-foreground">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={`border-b border-border/50 transition-colors hover:bg-muted ${
                    i % 2 === 0 ? "bg-card" : "bg-background"
                  }`}
                >
                  <td
                    className="px-4 py-2 text-foreground"
                    title={new Date(entry.created_at).toLocaleString()}
                  >
                    {relativeTime(entry.created_at)}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {userMap.get(entry.user_id) ?? `${entry.user_id.slice(0, 8)}...`}
                  </td>
                  <td className="px-4 py-2 text-foreground">
                    {ACTION_LABELS[entry.action_type] || entry.action_type}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {entry.target_type && entry.target_id
                      ? `${entry.target_type}: ${entry.target_id.slice(0, 8)}...`
                      : "-"}
                  </td>
                  <td className="px-4 py-2">
                    {entry.metadata ? (
                      <button
                        onClick={() =>
                          setExpandedId(
                            expandedId === entry.id ? null : entry.id
                          )
                        }
                        className="text-xs text-gold hover:underline"
                      >
                        {expandedId === entry.id ? "Hide" : "View"}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                    {expandedId === entry.id && entry.metadata && (
                      <div className="mt-2 relative">
                        <button
                          onClick={() => navigator.clipboard.writeText(JSON.stringify(entry.metadata, null, 2))}
                          className="absolute top-1 right-1 p-1 rounded hover:bg-muted transition-colors"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <pre className="max-w-xs overflow-auto rounded bg-background p-2 pr-6 text-xs text-muted-foreground">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} total entries
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md bg-muted px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md bg-muted px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
