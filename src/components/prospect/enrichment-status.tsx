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
 * - pending: Circle icon + "Pending"
 * - in_progress: Loader2 spinning + "Running"
 * - complete: CheckCircle2 + "Complete"
 * - failed: XCircle + "Failed"
 * - skipped: Minus + "Skipped" (e.g., SEC for non-public companies)
 * - circuit_open: Circle + "Paused"
 *
 * Status always uses icon + color + label (color is never the only indicator).
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

  const renderStatus = (status: SourceStatus) => {
    switch (status) {
      case "pending":
        return (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Circle className="h-4 w-4 shrink-0" />
            <span>Pending</span>
          </span>
        );
      case "in_progress":
        return (
          <span className="flex items-center gap-1.5 text-info">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span>Running</span>
          </span>
        );
      case "complete":
        return (
          <span className="flex items-center gap-1.5 text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Complete</span>
          </span>
        );
      case "failed":
        return (
          <span className="flex items-center gap-1.5 text-destructive">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>Failed</span>
          </span>
        );
      case "skipped":
        return (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Minus className="h-4 w-4 shrink-0" />
            <span>Skipped</span>
          </span>
        );
      case "circuit_open":
        return (
          <span className="flex items-center gap-1.5 text-warning">
            <Circle className="h-4 w-4 shrink-0" />
            <span>Paused</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Circle className="h-4 w-4 shrink-0" />
            <span>Unknown</span>
          </span>
        );
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Enrichment Status
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="cursor-pointer"
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
              className="flex flex-col gap-2 rounded-md border bg-background p-3"
            >
              <span className="text-sm font-medium text-foreground">
                {label}
              </span>
              <span className="text-xs">{renderStatus(status)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
