"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Download, FileDown, List as ListIcon, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportStatCards } from "./export-stat-cards";
import type { ActivityLogEntry } from "@/lib/activity-logger";

const PAGE_SIZE = 20;

// Minimal date formatter using native Intl (no date-fns required)
function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface ExportLogClientProps {
  orgId: string;
  initialExports: ActivityLogEntry[];
  initialTotal: number;
  userMap: Record<string, string>;
}

export function ExportLogClient({
  orgId: _orgId,
  initialExports,
  initialTotal,
  userMap,
}: ExportLogClientProps) {
  // Build first-of-month default for start date filter
  const defaultStart = (() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  })();

  const [exports, setExports] = useState<ActivityLogEntry[]>(initialExports);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>("");

  // Track whether initial data has been consumed to avoid double-fetch on mount
  const isInitialLoad = useRef(true);

  // Fetch from /api/activity with current filters
  const fetchExports = useCallback(
    async (pg: number, start: string, end: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          action_type: "csv_exported",
          page: String(pg),
          limit: String(PAGE_SIZE),
        });
        if (start) params.set("start_date", new Date(start).toISOString());
        if (end) {
          // end date is inclusive: advance to end of that day
          const endDt = new Date(end);
          endDt.setHours(23, 59, 59, 999);
          params.set("end_date", endDt.toISOString());
        }

        const res = await fetch(`/api/activity?${params.toString()}`);
        const text = await res.text();
        let json: { data?: ActivityLogEntry[]; total?: number } = {};
        try {
          json = JSON.parse(text);
        } catch {
          json = {};
        }

        setExports(json.data ?? []);
        setTotal(json.total ?? 0);
      } catch {
        setExports([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Skip initial fetch — server already provided data for page 1 + default dates
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    fetchExports(page, startDate, endDate);
  }, [page, startDate, endDate, fetchExports]);

  // Compute stat values from current data
  const statsExports = exports;
  const statsTotal = total;

  // Pagination display
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards — reactive to filtered data */}
      <ExportStatCards
        exports={statsExports}
        total={statsTotal}
        userMap={userMap}
      />

      {/* Filter row */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label
            className="text-[11px] font-semibold uppercase tracking-[1px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setPage(1);
              setStartDate(e.target.value);
            }}
            className="px-3 py-2 text-sm rounded-[8px] border"
            style={{
              borderColor: "var(--border-default)",
              background: "var(--bg-input)",
              color: "var(--text-primary-ds)",
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-[11px] font-semibold uppercase tracking-[1px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setPage(1);
              setEndDate(e.target.value);
            }}
            className="px-3 py-2 text-sm rounded-[8px] border"
            style={{
              borderColor: "var(--border-default)",
              background: "var(--bg-input)",
              color: "var(--text-primary-ds)",
            }}
          />
        </div>

        {/* Clear button */}
        <button
          onClick={() => {
            setPage(1);
            setStartDate(defaultStart);
            setEndDate("");
          }}
          className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-[8px] transition-colors cursor-pointer"
          style={{
            border: "1px solid var(--border-default)",
            color: "var(--text-secondary-ds)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color =
              "var(--text-primary-ds)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color =
              "var(--text-secondary-ds)";
          }}
          aria-label="Clear filters"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      {/* Table section */}
      {loading ? (
        <div
          className="flex h-64 items-center justify-center surface-card rounded-[14px]"
        >
          <p style={{ color: "var(--text-tertiary)" }}>Loading exports...</p>
        </div>
      ) : exports.length === 0 ? (
        <EmptyState
          icon={FileDown}
          title="No exports yet"
          description="When your team exports prospect lists to CSV, they'll appear here for tracking and re-download."
        />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>List Name</TableHead>
                  <TableHead>Row Count</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Exported By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports.map((entry) => {
                  const meta =
                    (entry.metadata as Record<string, unknown> | null) ?? {};
                  const listName =
                    (meta.listName as string | undefined) ?? "Unknown List";
                  const memberCount = meta.memberCount ?? "—";
                  const displayName =
                    userMap[entry.user_id] ??
                    `${entry.user_id.slice(0, 8)}...`;
                  const initials = displayName.charAt(0).toUpperCase();

                  return (
                    <TableRow key={entry.id}>
                      {/* Timestamp */}
                      <TableCell>
                        <span
                          className="font-mono text-xs"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {formatTimestamp(entry.created_at)}
                        </span>
                      </TableCell>

                      {/* List Name */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ListIcon
                            className="h-4 w-4 shrink-0"
                            style={{ color: "var(--text-tertiary)" }}
                          />
                          <span
                            className="text-sm font-medium"
                            style={{ color: "var(--text-primary-ds)" }}
                          >
                            {listName}
                          </span>
                        </div>
                      </TableCell>

                      {/* Row Count */}
                      <TableCell>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid var(--border-default)",
                            color: "var(--text-primary-ds)",
                          }}
                        >
                          {typeof memberCount === "number"
                            ? memberCount.toLocaleString()
                            : String(memberCount)}
                        </span>
                      </TableCell>

                      {/* Format */}
                      <TableCell>
                        <span
                          className="text-[10px] font-semibold uppercase px-2 py-1 rounded"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid var(--border-default)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          CSV
                        </span>
                      </TableCell>

                      {/* Exported By */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-semibold shrink-0"
                            style={{
                              background: "var(--gold-bg-strong)",
                              color: "var(--gold-primary)",
                              border: "1px solid var(--border-gold)",
                            }}
                          >
                            {initials}
                          </div>
                          <span
                            className="text-sm"
                            style={{ color: "var(--text-secondary-ds)" }}
                          >
                            {displayName}
                          </span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        {entry.target_id ? (
                          <button
                            className="inline-flex items-center gap-1 text-sm font-medium transition-colors cursor-pointer"
                            style={{ color: "var(--text-tertiary)" }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.color =
                                "var(--gold-primary)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.color =
                                "var(--text-tertiary)";
                            }}
                            onClick={() => {
                              window.location.href = `/api/export/csv?listId=${entry.target_id}`;
                            }}
                            aria-label="Re-download this export"
                          >
                            <Download className="h-4 w-4 shrink-0" />
                            Re-download
                          </button>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Unavailable
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination bar */}
      {total > 0 && !loading && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Showing {startIdx}–{endIdx} of {total} exports
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs font-medium rounded-[8px] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary-ds)",
              }}
            >
              Previous
            </button>
            <button
              disabled={page * PAGE_SIZE >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs font-medium rounded-[8px] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary-ds)",
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
