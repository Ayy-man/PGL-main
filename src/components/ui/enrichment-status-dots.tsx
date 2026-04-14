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

// Maps status -> dot color class (bg uses CSS token) and glow utility class from globals.css
function getDotClasses(status: SourceStatus): { bgClass: string; glowClass: string } {
  switch (status) {
    case "complete":
      return { bgClass: "bg-[var(--success)]", glowClass: "dot-glow-green" };
    case "in_progress":
      return { bgClass: "bg-[var(--info)]", glowClass: "dot-glow-blue" };
    case "failed":
      return { bgClass: "bg-[var(--destructive)]", glowClass: "dot-glow-red" };
    case "circuit_open":
      return { bgClass: "bg-[var(--warning)]", glowClass: "dot-glow-amber" };
    default:
      return { bgClass: "bg-[rgba(255,255,255,0.15)]", glowClass: "" };
  }
}

export function EnrichmentStatusDots({ sourceStatus, className }: EnrichmentStatusDotsProps) {
  if (!sourceStatus) return null;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {SOURCE_ORDER.map((key) => {
        const status = sourceStatus[key] ?? "pending";
        const { bgClass, glowClass } = getDotClasses(status);
        return (
          <div
            key={key}
            title={`${SOURCE_LABELS[key] ?? key}: ${status}`}
            className={cn(
              "h-2.5 w-2.5 rounded-full shrink-0 transition-shadow",
              bgClass,
              glowClass,
              status === "in_progress" && "animate-pulse",
              status === "pending" && "animate-pulse opacity-60"
            )}
          />
        );
      })}
    </div>
  );
}
