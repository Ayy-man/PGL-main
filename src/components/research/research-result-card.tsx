"use client";

import { CHANNEL_DISPLAY_NAMES } from "@/lib/search/channels";

interface ResearchResultCardProps {
  result: {
    channelId: string;
    headline: string;
    summary: string;
    source_url: string;
    source_name: string;
    event_date: string | null;
    category: string;
    relevance: string;
    confidence_note?: string;
  };
}

/**
 * Returns the category accent color (rgba) for icon/dot usage.
 */
function getCategoryColor(category: string): string {
  switch (category) {
    case "news":
      return "rgba(59,130,246,0.6)";
    case "wealth_signal":
    case "funding":
      return "rgba(var(--gold-primary-rgb), 0.6)";
    case "corporate":
    case "company_intel":
      return "rgba(168,85,247,0.6)";
    case "property":
      return "rgba(34,197,94,0.6)";
    case "career_move":
    case "media":
      return "rgba(20,184,166,0.6)";
    default:
      return "rgba(161,161,170,0.6)";
  }
}

/**
 * Returns the Tailwind dot background class for a given relevance level.
 */
function getRelevanceDotClass(relevance: string): string {
  switch (relevance) {
    case "high":
      return "bg-success";
    case "medium":
      return "bg-amber-500";
    default:
      return "bg-zinc-500";
  }
}

/**
 * Formats a date string as a short relative label (e.g., "3 days ago") or
 * a short absolute date, using only Intl.DateTimeFormat (no date-fns).
 */
function formatEventDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // Future date — fall through to absolute
    } else if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? "s" : ""} ago`;
    }

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function ResearchResultCard({ result }: ResearchResultCardProps) {
  const categoryColor = getCategoryColor(result.category);
  const relevanceDotClass = getRelevanceDotClass(result.relevance);

  // Resolve channel display name: prefer CHANNEL_DISPLAY_NAMES, fall back to source_name
  const channelLabel =
    CHANNEL_DISPLAY_NAMES[result.channelId as keyof typeof CHANNEL_DISPLAY_NAMES] ??
    result.source_name;

  return (
    <div
      className="surface-card p-4 rounded-[14px]"
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Top row: category dot + channel badge + relevance dot + date */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className="h-[6px] w-[6px] rounded-full shrink-0"
            style={{ background: categoryColor }}
          />
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.08)] text-[var(--text-secondary-ds)]">
            {channelLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {result.event_date && (
            <span className="text-[10px] text-[var(--text-secondary-ds)] opacity-60">
              {formatEventDate(result.event_date)}
            </span>
          )}
          <span
            className={`w-1.5 h-1.5 rounded-full ${relevanceDotClass} shrink-0`}
            title={`${result.relevance} relevance`}
          />
        </div>
      </div>

      {/* Headline */}
      <a
        href={result.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm font-semibold text-[var(--text-primary-ds)] hover:text-[var(--gold-primary)] transition-colors mb-1.5 leading-snug"
      >
        {result.headline}
      </a>

      {/* Summary */}
      <p className="text-xs text-[var(--text-secondary-ds)] line-clamp-3 mb-2 leading-relaxed">
        {result.summary}
      </p>

      {/* Bottom row: source attribution + confidence note */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-[var(--text-secondary-ds)] opacity-60">
          via {result.source_name}
        </span>
        {result.confidence_note && (
          <>
            <span className="text-[10px] text-[var(--text-secondary-ds)] opacity-30">
              ·
            </span>
            <span className="text-[10px] text-[var(--text-secondary-ds)] opacity-50 italic">
              {result.confidence_note}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
