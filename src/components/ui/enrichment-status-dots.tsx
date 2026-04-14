import { cn } from "@/lib/utils";

type SourceStatus = "pending" | "in_progress" | "complete" | "failed" | "skipped" | "circuit_open" | "no_data";

interface EnrichmentStatusDotsProps {
  sourceStatus: Record<string, SourceStatus> | null;
  className?: string;
}

const SOURCE_ORDER = ["contactout", "exa", "sec", "market", "claude"];

const SOURCE_LABELS: Record<string, string> = {
  contactout: "Verified Contact",
  exa: "Web Presence",
  sec: "Public Filings",
  market: "Market Data",
  claude: "AI Analysis",
};

function getDotStyle(status: SourceStatus): { background: string; boxShadow: string } {
  switch (status) {
    case "complete":
      return { background: "var(--success)", boxShadow: "0 0 6px rgba(34,197,94,0.6)" };
    case "in_progress":
      return { background: "var(--info)", boxShadow: "0 0 6px rgba(96,165,250,0.6)" };
    case "failed":
      return { background: "var(--destructive)", boxShadow: "0 0 6px rgba(239,68,68,0.6)" };
    case "circuit_open":
      return { background: "var(--warning)", boxShadow: "0 0 6px rgba(245,158,11,0.6)" };
    default:
      return { background: "rgba(255,255,255,0.15)", boxShadow: "none" };
  }
}

export function EnrichmentStatusDots({ sourceStatus, className }: EnrichmentStatusDotsProps) {
  if (!sourceStatus) return null;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {SOURCE_ORDER.map((key) => {
        const status = sourceStatus[key] ?? "pending";
        const dotClass = cn(
          "h-2.5 w-2.5 rounded-full shrink-0 transition-shadow",
          status === "in_progress" && "animate-pulse",
          status === "pending" && "animate-pulse opacity-60"
        );
        return (
          <div
            key={key}
            title={`${SOURCE_LABELS[key] ?? key}: ${status}`}
            className={dotClass}
            style={getDotStyle(status)}
          />
        );
      })}
    </div>
  );
}
