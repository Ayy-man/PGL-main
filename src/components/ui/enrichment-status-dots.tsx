import { cn } from "@/lib/utils";

type SourceStatus = "pending" | "in_progress" | "complete" | "failed" | "skipped" | "circuit_open";

interface EnrichmentStatusDotsProps {
  sourceStatus: Record<string, SourceStatus> | null;
  className?: string;
}

const SOURCE_ORDER = ["contactout", "exa", "sec", "claude"];

const SOURCE_LABELS: Record<string, string> = {
  contactout: "ContactOut",
  exa: "Exa",
  sec: "SEC",
  claude: "AI",
};

function getDotColor(status: SourceStatus): string {
  switch (status) {
    case "complete":
      return "var(--success)";
    case "in_progress":
      return "var(--info)";
    case "failed":
      return "var(--destructive)";
    case "circuit_open":
      return "var(--warning)";
    default:
      return "rgba(255,255,255,0.15)";
  }
}

export function EnrichmentStatusDots({ sourceStatus, className }: EnrichmentStatusDotsProps) {
  if (!sourceStatus) return null;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {SOURCE_ORDER.map((key) => {
        const status = sourceStatus[key] ?? "pending";
        return (
          <div
            key={key}
            title={`${SOURCE_LABELS[key] ?? key}: ${status}`}
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: getDotColor(status) }}
          />
        );
      })}
    </div>
  );
}
