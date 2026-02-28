"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FileDown, Users, Trophy } from "lucide-react";
import type { ActivityLogEntry } from "@/lib/activity-logger";

// Derive stat values from the current exports array
function computeStats(
  exports: ActivityLogEntry[],
  total: number,
  userMap: Record<string, string>
): ExportStatCardsProps {
  // Unique prospects: sum of memberCount across all entries
  const uniqueProspects = exports.reduce((sum, entry) => {
    const meta = entry.metadata as Record<string, unknown> | null;
    const count = meta?.memberCount;
    return sum + (typeof count === "number" ? count : 0);
  }, 0);

  // Top exporter: count exports per user_id, find the max
  const userExportCounts: Record<string, number> = {};
  const userProspectCounts: Record<string, number> = {};

  for (const entry of exports) {
    const uid = entry.user_id;
    userExportCounts[uid] = (userExportCounts[uid] ?? 0) + 1;
    const meta = entry.metadata as Record<string, unknown> | null;
    const count = meta?.memberCount;
    userProspectCounts[uid] =
      (userProspectCounts[uid] ?? 0) +
      (typeof count === "number" ? count : 0);
  }

  let topExporter: ExportStatCardsProps["topExporter"] = null;

  const topUserId = Object.entries(userExportCounts).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0];

  if (topUserId) {
    const name = userMap[topUserId] ?? topUserId.slice(0, 8);
    const initials = name.charAt(0).toUpperCase();
    topExporter = {
      name,
      initials,
      exportCount: userExportCounts[topUserId] ?? 0,
      prospectCount: userProspectCounts[topUserId] ?? 0,
    };
  }

  return { totalExports: total, uniqueProspects, topExporter };
}

interface ExportStatCardsProps {
  totalExports: number;
  uniqueProspects: number;
  topExporter: {
    name: string;
    initials: string;
    exportCount: number;
    prospectCount: number;
  } | null;
}

// Server-rendered wrapper props (parent passes raw data)
interface ExportStatCardsWrapperProps {
  exports: ActivityLogEntry[];
  total: number;
  userMap: Record<string, string>;
}

export function ExportStatCards({
  exports,
  total,
  userMap,
}: ExportStatCardsWrapperProps) {
  const { totalExports, uniqueProspects, topExporter } = computeStats(
    exports,
    total,
    userMap
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Card 1: Total Monthly Exports */}
      <Card className="relative overflow-hidden">
        <CardContent className="pt-6">
          <FileDown
            className="h-12 w-12 absolute top-4 right-4"
            style={{ opacity: 0.1, color: "var(--gold-primary)" }}
          />
          <p
            className="text-[11px] font-semibold uppercase tracking-[1px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            TOTAL MONTHLY EXPORTS
          </p>
          <p
            className="font-serif text-4xl font-semibold mt-3"
            style={{ color: "var(--text-primary-ds)" }}
          >
            {totalExports}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            Files generated this billing cycle
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Unique Prospects */}
      <Card className="relative overflow-hidden">
        <CardContent className="pt-6">
          <Users
            className="h-12 w-12 absolute top-4 right-4"
            style={{ opacity: 0.1, color: "var(--gold-primary)" }}
          />
          <p
            className="text-[11px] font-semibold uppercase tracking-[1px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            UNIQUE PROSPECTS
          </p>
          <p
            className="font-serif text-4xl font-semibold mt-3"
            style={{ color: "var(--text-primary-ds)" }}
          >
            {uniqueProspects.toLocaleString()}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            High Net Worth Individuals exported
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Top Exporter */}
      <Card className="relative overflow-hidden">
        <CardContent className="pt-6">
          <Trophy
            className="h-12 w-12 absolute top-4 right-4"
            style={{ opacity: 0.1, color: "var(--gold-primary)" }}
          />
          <p
            className="text-[11px] font-semibold uppercase tracking-[1px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            TOP EXPORTER
          </p>

          {topExporter ? (
            <div className="flex items-center gap-3 mt-3">
              <div
                className="flex items-center justify-center h-10 w-10 rounded-full text-sm font-semibold shrink-0"
                style={{
                  background: "var(--gold-bg-strong)",
                  color: "var(--gold-primary)",
                  border: "1px solid var(--border-gold)",
                }}
              >
                {topExporter.initials}
              </div>
              <div>
                <p
                  className="font-serif text-xl font-semibold"
                  style={{ color: "var(--text-primary-ds)" }}
                >
                  {topExporter.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {topExporter.exportCount} Exports /{" "}
                  {topExporter.prospectCount.toLocaleString()} Prospects
                </p>
              </div>
            </div>
          ) : (
            <>
              <p
                className="font-serif text-4xl font-semibold mt-3"
                style={{ color: "var(--text-primary-ds)" }}
              >
                —
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                No exports yet
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
