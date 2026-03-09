"use client";

import {
  Circle,
  CheckCircle2,
  XCircle,
  Loader2,
  Minus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SourceStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "failed"
  | "skipped"
  | "circuit_open";

interface EnrichmentTabProps {
  sourceStatus: Record<string, SourceStatus>;
  prospectId: string;
}

const SOURCE_LABELS: Record<string, string> = {
  contactout: "ContactOut",
  exa: "Exa",
  sec: "SEC EDGAR",
  claude: "Claude AI",
};

const SOURCE_KEYS = ["contactout", "exa", "sec", "claude"];

const STATUS_CONFIG: Record<
  SourceStatus,
  { label: string; colorClass: string }
> = {
  pending: { label: "Pending", colorClass: "text-muted-foreground" },
  in_progress: { label: "Running", colorClass: "text-info" },
  complete: { label: "Complete", colorClass: "text-success" },
  failed: { label: "Failed", colorClass: "text-destructive" },
  skipped: { label: "Skipped", colorClass: "text-muted-foreground" },
  circuit_open: { label: "Paused", colorClass: "text-warning" },
};

function EnrichmentIcon({ status }: { status: SourceStatus }): React.ReactElement {
  switch (status) {
    case "pending":
      return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
    case "in_progress":
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-info" />;
    case "complete":
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />;
    case "failed":
      return <XCircle className="h-4 w-4 shrink-0 text-destructive" />;
    case "skipped":
      return <Minus className="h-4 w-4 shrink-0 text-muted-foreground" />;
    case "circuit_open":
      return <Circle className="h-4 w-4 shrink-0 text-warning" />;
    default:
      return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
}

function getDataPreview(status: SourceStatus): string {
  return status === "complete" ? "Data available" : "No data";
}

async function handleRefresh(prospectId: string, source: string): Promise<void> {
  try {
    await fetch(`/api/prospects/${prospectId}/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });
  } catch (err) {
    console.error("Enrichment refresh failed:", err);
  }
}

export function EnrichmentTab({ sourceStatus, prospectId }: EnrichmentTabProps) {
  // Ensure all 4 canonical sources are shown even if not present in sourceStatus
  const sources = SOURCE_KEYS.map((key) => ({
    key,
    label: SOURCE_LABELS[key] ?? key,
    status: (sourceStatus[key] ?? "pending") as SourceStatus,
  }));

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {sources.map(({ key, label, status }) => {
        const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

        return (
          <div key={key} className="surface-card p-4 space-y-3">
            {/* Source name */}
            <p className="text-sm font-semibold text-foreground">{label}</p>

            {/* Status row */}
            <div className={`flex items-center gap-1.5 ${config.colorClass}`}>
              <EnrichmentIcon status={status} />
              <span className="text-xs font-medium">{config.label}</span>
            </div>

            {/* Data preview */}
            <p className="text-xs text-muted-foreground">
              {getDataPreview(status)}
            </p>

            {/* Per-source refresh */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full cursor-pointer justify-start gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => handleRefresh(prospectId, key)}
              aria-label={`Refresh ${label}`}
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          </div>
        );
      })}
    </div>
  );
}
