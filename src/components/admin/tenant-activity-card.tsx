"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Maximize2,
  Building2,
  Pencil,
  Settings,
  CheckCircle2,
  UserPlus,
  UserCheck,
  LogIn,
  Search,
  Eye,
  Sparkles,
  Download,
  Compass,
  ListPlus,
  ListMinus,
  RefreshCw,
  StickyNote,
  Users,
  Activity,
} from "lucide-react";
import { ACTION_TYPES, type ActionType } from "@/lib/activity-logger";

// ── Types ─────────────────────────────────────────────────────────

interface ActivityEntry {
  id: string;
  action_type: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface TenantActivityCardProps {
  tenantId: string;
  tenantName: string;
}

// ── Helpers ───────────────────────────────────────────────────────

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
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const ACTION_ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  tenant_created: Building2,
  tenant_renamed: Pencil,
  tenant_settings_updated: Settings,
  tenant_confirmed: CheckCircle2,
  user_invited: UserPlus,
  user_invite_accepted: UserCheck,
  login: LogIn,
  search_executed: Search,
  profile_viewed: Eye,
  profile_enriched: Sparkles,
  csv_exported: Download,
  persona_created: Compass,
  add_to_list: ListPlus,
  remove_from_list: ListMinus,
  status_updated: RefreshCw,
  note_added: StickyNote,
  lookalike_search: Users,
};

const ACTION_VERBS: Record<string, string> = {
  tenant_created: "created tenant",
  tenant_renamed: "renamed tenant",
  tenant_settings_updated: "updated settings",
  tenant_confirmed: "confirmed setup",
  user_invited: "invited a user",
  user_invite_accepted: "accepted invite",
  login: "logged in",
  search_executed: "ran a search",
  profile_viewed: "viewed a profile",
  profile_enriched: "enriched a profile",
  csv_exported: "exported CSV",
  persona_created: "created a persona",
  add_to_list: "added to list",
  remove_from_list: "removed from list",
  status_updated: "updated status",
  note_added: "added a note",
  lookalike_search: "ran lookalike search",
};

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
  tenant_created: "Tenant Created",
  tenant_renamed: "Tenant Renamed",
  tenant_settings_updated: "Settings Updated",
  tenant_confirmed: "Setup Confirmed",
  user_invited: "User Invited",
  user_invite_accepted: "Invite Accepted",
};

function getActionIcon(actionType: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  return ACTION_ICON_MAP[actionType] || Activity;
}

// ── Skeleton Rows ─────────────────────────────────────────────────

function ActivitySkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-12 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ── Activity Entry Row ────────────────────────────────────────────

function ActivityRow({
  entry,
  isLast,
}: {
  entry: ActivityEntry;
  isLast: boolean;
}) {
  const Icon = getActionIcon(entry.action_type);
  const userName = entry.user_name || entry.user_email || "Unknown user";
  const verb = ACTION_VERBS[entry.action_type] || entry.action_type;

  return (
    <div
      className={`flex items-center gap-3 py-2.5 ${
        isLast ? "" : "border-b"
      }`}
      style={{
        borderColor: isLast ? "transparent" : "var(--admin-row-border)",
      }}
    >
      <Icon
        className="h-4 w-4 flex-shrink-0"
        style={{ color: "var(--admin-text-secondary)" }}
      />
      <p className="flex-1 text-sm min-w-0 truncate" style={{ color: "var(--text-primary-ds)" }}>
        <span className="font-semibold">{userName}</span>{" "}
        <span style={{ color: "var(--admin-text-secondary)" }}>{verb}</span>
      </p>
      <span
        className="text-xs flex-shrink-0"
        style={{ color: "var(--admin-text-secondary)" }}
      >
        {relativeTime(entry.created_at)}
      </span>
    </div>
  );
}

// ── Tab Button ────────────────────────────────────────────────────

type TabValue = "all" | "admin" | "user";

function TabButton({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: TabValue;
  active: boolean;
  onClick: (v: TabValue) => void;
}) {
  return (
    <button
      onClick={() => onClick(value)}
      className="text-xs pb-1.5 transition-colors relative"
      style={{
        color: active ? "var(--gold-primary)" : "var(--admin-text-secondary)",
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
      {active && (
        <span
          className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
          style={{ background: "var(--gold-primary)" }}
        />
      )}
    </button>
  );
}

// ── Expanded Modal ────────────────────────────────────────────────

function ActivityModal({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [actionType, setActionType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const PAGE_SIZE = 50;

  const fetchData = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("tab", "all");
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      if (actionType) params.set("action_type", actionType);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const res = await fetch(
        `/api/admin/tenants/${tenantId}/activity?${params.toString()}`
      );
      if (!res.ok) return;
      const json = await res.json();
      setEntries(json.data || []);
      setTotal(json.total || 0);
    } finally {
      setLoading(false);
    }
  }, [open, tenantId, page, actionType, startDate, endDate]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setEntries([]);
      setTotal(0);
      setPage(1);
      setExpandedId(null);
      setActionType("");
      setStartDate("");
      setEndDate("");
    }
  }, [open]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl w-full max-h-[80vh] flex flex-col overflow-hidden"
        style={{
          background: "var(--bg-card-gradient)",
          border: "1px solid var(--border-default)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-serif">
            {tenantName} &mdash; Activity Log
          </DialogTitle>
          <DialogDescription className="sr-only">
            Full activity log for {tenantName}
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div
          className="flex flex-wrap items-end gap-4 rounded-[10px] p-3"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <label
              className="mb-1 block text-xs"
              style={{ color: "var(--admin-text-secondary)" }}
            >
              Action Type
            </label>
            <select
              value={actionType}
              onChange={(e) => {
                setActionType(e.target.value);
                setPage(1);
              }}
              className="rounded-md px-3 py-1.5 text-sm focus:outline-none"
              style={{
                background: "var(--admin-card-bg)",
                color: "var(--text-primary-ds)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <option value="">All Actions</option>
              {ACTION_TYPES.map((type: ActionType) => (
                <option key={type} value={type}>
                  {ACTION_LABELS[type] || type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="mb-1 block text-xs"
              style={{ color: "var(--admin-text-secondary)" }}
            >
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="rounded-md px-3 py-1.5 text-sm focus:outline-none"
              style={{
                background: "var(--admin-card-bg)",
                color: "var(--text-primary-ds)",
                border: "1px solid var(--border-subtle)",
              }}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs"
              style={{ color: "var(--admin-text-secondary)" }}
            >
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="rounded-md px-3 py-1.5 text-sm focus:outline-none"
              style={{
                background: "var(--admin-card-bg)",
                color: "var(--text-primary-ds)",
                border: "1px solid var(--border-subtle)",
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <p style={{ color: "var(--admin-text-secondary)" }}>
                Loading activity log...
              </p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <p style={{ color: "var(--admin-text-secondary)" }}>
                No activity found
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left text-xs"
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    color: "var(--admin-text-secondary)",
                  }}
                >
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="transition-colors"
                    style={{
                      borderBottom: "1px solid var(--admin-row-border)",
                    }}
                  >
                    <td
                      className="px-4 py-2 whitespace-nowrap"
                      style={{ color: "var(--admin-text-secondary)" }}
                      title={new Date(entry.created_at).toLocaleString()}
                    >
                      {relativeTime(entry.created_at)}
                    </td>
                    <td
                      className="px-4 py-2"
                      style={{ color: "var(--text-primary-ds)" }}
                    >
                      {entry.user_name || entry.user_email || entry.user_id.slice(0, 8) + "..."}
                    </td>
                    <td
                      className="px-4 py-2"
                      style={{ color: "var(--text-primary-ds)" }}
                    >
                      {ACTION_LABELS[entry.action_type] || entry.action_type}
                    </td>
                    <td className="px-4 py-2">
                      {entry.metadata ? (
                        <button
                          onClick={() =>
                            setExpandedId(
                              expandedId === entry.id ? null : entry.id
                            )
                          }
                          className="text-xs hover:underline"
                          style={{ color: "var(--gold-primary)" }}
                        >
                          {expandedId === entry.id ? "Hide" : "View"}
                        </button>
                      ) : (
                        <span
                          className="text-xs"
                          style={{ color: "var(--admin-text-secondary)" }}
                        >
                          -
                        </span>
                      )}
                      {expandedId === entry.id && entry.metadata && (
                        <pre
                          className="mt-2 max-w-xs overflow-auto rounded-[8px] p-2 text-xs"
                          style={{
                            background: "rgba(0,0,0,0.2)",
                            color: "var(--admin-text-secondary)",
                          }}
                        >
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
        {!loading && entries.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p
              className="text-sm"
              style={{ color: "var(--admin-text-secondary)" }}
            >
              {total} total entries
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-[8px] px-3 py-1.5 text-sm transition-colors disabled:opacity-40"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--text-primary-ds)",
                }}
              >
                Previous
              </button>
              <span
                className="text-sm"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-[8px] px-3 py-1.5 text-sm transition-colors disabled:opacity-40"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--text-primary-ds)",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────

export function TenantActivityCard({
  tenantId,
  tenantName,
}: TenantActivityCardProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Cache per-tab results so switching doesn't re-fetch
  const cacheRef = useRef<Record<string, ActivityEntry[]>>({});
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  const fetchTab = useCallback(
    async (tab: TabValue) => {
      // Return cached results if available
      if (cacheRef.current[tab]) {
        setEntries(cacheRef.current[tab]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/tenants/${tenantId}/activity?tab=${tab}&limit=5`
        );
        if (!res.ok) {
          setEntries([]);
          return;
        }
        const json = await res.json();
        const data: ActivityEntry[] = json.data || [];
        cacheRef.current[tab] = data;
        setEntries(data);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    },
    [tenantId]
  );

  useEffect(() => {
    fetchTab(activeTab);
  }, [activeTab, fetchTab]);

  // Reset cache when tenantId changes
  useEffect(() => {
    cacheRef.current = {};
  }, [tenantId]);

  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab);
  };

  return (
    <>
      <div className="surface-admin-card rounded-[14px] p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3
            className="font-serif text-sm font-semibold"
            style={{ color: "var(--text-primary-ds)" }}
          >
            Activity
          </h3>
          <button
            onClick={() => setModalOpen(true)}
            className="opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: "var(--admin-text-secondary)" }}
            title="Expand activity log"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-4 mb-3 pb-1"
          style={{ borderBottom: "1px solid var(--admin-row-border)" }}
        >
          <TabButton
            label="All"
            value="all"
            active={activeTab === "all"}
            onClick={handleTabChange}
          />
          <TabButton
            label="Admin"
            value="admin"
            active={activeTab === "admin"}
            onClick={handleTabChange}
          />
          <TabButton
            label="User"
            value="user"
            active={activeTab === "user"}
            onClick={handleTabChange}
          />
        </div>

        {/* Tab Content */}
        {loading ? (
          <ActivitySkeletonRows />
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <p
              className="text-sm"
              style={{ color: "var(--admin-text-secondary)" }}
            >
              No activity yet
            </p>
          </div>
        ) : (
          <div>
            {entries.map((entry, i) => (
              <ActivityRow
                key={entry.id}
                entry={entry}
                isLast={i === entries.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3rd-level drill-down modal */}
      <ActivityModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        tenantId={tenantId}
        tenantName={tenantName}
      />
    </>
  );
}
