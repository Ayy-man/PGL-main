"use client";

import { useEffect, useState, useCallback } from "react";
import { ACTION_TYPES, type ActionType } from "@/lib/activity-logger";

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

const PAGE_SIZE = 50;

export function ActivityLogViewer() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      setEntries(json.data || []);
      setTotal(json.total || 0);
    } finally {
      setLoading(false);
    }
  }, [actionType, startDate, endDate, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">
            Action Type
          </label>
          <select
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 focus:border-[#d4af37] focus:outline-none"
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
          <label className="mb-1 block text-xs text-zinc-400">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 focus:border-[#d4af37] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 focus:border-[#d4af37] focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-zinc-500">Loading activity log...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-zinc-500">No activity found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-400">
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
                  className={`border-b border-zinc-800/50 transition-colors hover:bg-zinc-800 ${
                    i % 2 === 0 ? "bg-zinc-900" : "bg-zinc-950"
                  }`}
                >
                  <td
                    className="px-4 py-2 text-zinc-300"
                    title={new Date(entry.created_at).toLocaleString()}
                  >
                    {relativeTime(entry.created_at)}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-400">
                    {entry.user_id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2 text-zinc-300">
                    {ACTION_LABELS[entry.action_type] || entry.action_type}
                  </td>
                  <td className="px-4 py-2 text-zinc-400">
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
                        className="text-xs text-[#d4af37] hover:underline"
                      >
                        {expandedId === entry.id ? "Hide" : "View"}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-600">-</span>
                    )}
                    {expandedId === entry.id && entry.metadata && (
                      <pre className="mt-2 max-w-xs overflow-auto rounded bg-zinc-950 p-2 text-xs text-zinc-400">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
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
        <p className="text-sm text-zinc-500">
          {total} total entries
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
