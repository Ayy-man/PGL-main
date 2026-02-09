"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, Minus, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type SourceStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "failed"
  | "skipped"
  | "circuit_open";

interface EnrichmentStatusProps {
  sourceStatus: Record<string, SourceStatus>;
  prospectId: string;
}

const SOURCE_LABELS: Record<string, string> = {
  contactout: "ContactOut",
  exa: "Exa",
  sec: "SEC EDGAR",
  claude: "Claude AI",
};

/**
 * EnrichmentStatus Component
 *
 * Displays per-source enrichment status indicators with visual states:
 * - pending: gray dot + "Pending"
 * - in_progress: spinning loader + "Enriching..."
 * - complete: green checkmark + "Complete"
 * - failed: red X + "Failed"
 * - skipped: gray dash + "Skipped" (e.g., SEC for non-public companies)
 * - circuit_open: orange warning + "Circuit Open"
 *
 * Includes "Refresh Enrichment" button to manually trigger enrichment.
 */
export function EnrichmentStatus({
  sourceStatus,
  prospectId,
}: EnrichmentStatusProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/prospects/${prospectId}/enrich`, {
        method: "POST",
      });

      if (response.ok) {
        // Refresh the page to show updated status
        router.refresh();
      } else {
        const data = await response.json();
        console.error("Enrichment trigger failed:", data.error);
      }
    } catch (error) {
      console.error("Failed to trigger enrichment:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderStatusIcon = (status: SourceStatus) => {
    switch (status) {
      case "pending":
        return <Circle className="h-4 w-4 text-zinc-500" />;
      case "in_progress":
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
      case "complete":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "skipped":
        return <Minus className="h-4 w-4 text-zinc-500" />;
      case "circuit_open":
        return <Circle className="h-4 w-4 text-orange-500" />;
      default:
        return <Circle className="h-4 w-4 text-zinc-500" />;
    }
  };

  const renderStatusText = (status: SourceStatus) => {
    switch (status) {
      case "pending":
        return <span className="text-zinc-400">Pending</span>;
      case "in_progress":
        return <span className="text-blue-400">Enriching...</span>;
      case "complete":
        return <span className="text-green-400">Complete</span>;
      case "failed":
        return <span className="text-red-400">Failed</span>;
      case "skipped":
        return <span className="text-zinc-500">Skipped</span>;
      case "circuit_open":
        return <span className="text-orange-400">Circuit Open</span>;
      default:
        return <span className="text-zinc-400">Unknown</span>;
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-100">
          Enrichment Status
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            "Refresh Enrichment"
          )}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Object.entries(SOURCE_LABELS).map(([key, label]) => {
          const status = sourceStatus[key] || "pending";
          return (
            <div
              key={key}
              className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3"
            >
              {renderStatusIcon(status)}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-zinc-300">
                  {label}
                </span>
                <span className="text-xs">{renderStatusText(status)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
