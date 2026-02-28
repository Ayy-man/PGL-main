import Link from "next/link";
import { FileDown, Download, ArrowRight } from "lucide-react";
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
import type { ActivityLogEntry } from "@/lib/activity-logger";

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

interface RecentExportsTableProps {
  exports: ActivityLogEntry[];
  userMap: Record<string, string>;
  orgId: string;
}

export function RecentExportsTable({
  exports: entries,
  userMap,
  orgId,
}: RecentExportsTableProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3
            className="font-serif text-[22px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Recent Exports
          </h3>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Last 5 CSV exports from your team
          </p>
        </div>
        <Link
          href={`/${orgId}/exports`}
          className="inline-flex items-center gap-1 text-xs cursor-pointer transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          View Archive
          <ArrowRight className="h-3 w-3 shrink-0" />
        </Link>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={FileDown}
          title="No exports yet"
          description="When your team exports prospect lists to CSV, they'll appear here."
        />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>List Name</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const meta =
                    (entry.metadata as Record<string, unknown> | null) ?? {};
                  const listName =
                    (meta.listName as string | undefined) ?? "Unknown List";
                  const memberCount = meta.memberCount;
                  const displayName =
                    userMap[entry.user_id] ??
                    `${entry.user_id.slice(0, 8)}...`;

                  return (
                    <TableRow key={entry.id}>
                      {/* List Name */}
                      <TableCell>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary-ds)" }}
                        >
                          {listName}
                        </span>
                        <span
                          className="block text-[11px]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          by {displayName}
                        </span>
                      </TableCell>

                      {/* Date & Time */}
                      <TableCell>
                        <span
                          className="font-mono text-xs"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {formatTimestamp(entry.created_at)}
                        </span>
                      </TableCell>

                      {/* Row Count */}
                      <TableCell>
                        <span
                          className="font-serif text-sm"
                          style={{ color: "var(--text-primary-ds)" }}
                        >
                          {typeof memberCount === "number"
                            ? memberCount.toLocaleString()
                            : "—"}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
                          style={{
                            background: "var(--gold-bg)",
                            color: "var(--gold-primary)",
                            border: "1px solid var(--border-gold)",
                          }}
                        >
                          Complete
                        </span>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        {entry.target_id ? (
                          <Link
                            href={`/api/export/csv?listId=${entry.target_id}`}
                            className="inline-flex items-center gap-1 text-sm cursor-pointer transition-colors"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            <Download className="h-4 w-4 shrink-0" />
                          </Link>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            —
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
    </div>
  );
}
