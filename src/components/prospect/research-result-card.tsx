"use client";

import { useState } from "react";
import { ExternalLink, Copy, Flag } from "lucide-react";
import { ResearchPinDropdown } from "./research-pin-dropdown";
import type { ScrapbookCard, PinTarget } from "@/types/research";

interface ResearchResultCardProps {
  card: ScrapbookCard;
  prospectId: string;
  messageId: string;
  index?: number;
  onPinSuccess?: (cardIndex: number, pinTarget: PinTarget) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  career_move: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  funding: { bg: "rgba(34,197,94,0.15)", text: "#4ade80" },
  media: { bg: "rgba(168,85,247,0.15)", text: "#c084fc" },
  wealth_signal: { bg: "rgba(212,175,55,0.15)", text: "#d4af37" },
  company_intel: { bg: "rgba(99,102,241,0.15)", text: "#818cf8" },
  recognition: { bg: "rgba(244,114,182,0.15)", text: "#f472b6" },
  sec_filing: { bg: "rgba(251,146,60,0.15)", text: "#fb923c" },
  market_event: { bg: "rgba(45,212,191,0.15)", text: "#2dd4bf" },
  other: { bg: "rgba(255,255,255,0.08)", text: "var(--text-tertiary, rgba(232,228,220,0.4))" },
};

function ExaHighlightQuote({ highlights, scores }: { highlights?: string[]; scores?: number[] }) {
  if (!highlights?.length || !scores?.length) return null;
  // Only show the top highlight (index 0) if score >= 0.7
  const topScore = scores[0] ?? 0;
  if (topScore < 0.7) return null;
  const topHighlight = highlights[0];
  if (!topHighlight) return null;

  return (
    <blockquote
      className="mt-2 pl-3 text-xs font-sans italic leading-relaxed"
      style={{
        borderLeft: "2px solid rgba(212,175,55,0.3)",
        color: "var(--text-tertiary, rgba(232,228,220,0.4))",
      }}
    >
      {topHighlight}
    </blockquote>
  );
}

function formatCategoryLabel(category: string): string {
  return category
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatEventDate(
  date: string,
  precision: "exact" | "approximate" | "unknown"
): string {
  try {
    const d = new Date(date);
    if (precision === "approximate") {
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

export function ResearchResultCard({
  card,
  prospectId,
  messageId,
  index = 0,
  onPinSuccess,
}: ResearchResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const colors = CATEGORY_COLORS[card.category] ?? CATEGORY_COLORS.other;
  const animDelay = `${index * 120}ms`;

  const handleCopy = async () => {
    const text = `${card.headline}\n${card.summary}\n${card.source_url}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePinSuccess = (cardIndex: number, pinTarget: PinTarget) => {
    setIsPinned(true);
    onPinSuccess?.(cardIndex, pinTarget);
  };

  return (
    <div
      className="rounded-xl p-4 transition-all duration-150"
      style={{
        background: "var(--bg-card, rgba(255,255,255,0.04))",
        boxShadow:
          "0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
        border: isPinned
          ? "1px solid rgba(212,175,55,0.2)"
          : "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
        borderLeft: isPinned
          ? "2px solid var(--gold-primary, #d4af37)"
          : undefined,
        animation: `cardFadeIn 300ms ease forwards`,
        animationDelay: animDelay,
        opacity: 0,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = isPinned
          ? "rgba(212,175,55,0.3)"
          : "var(--border-hover, rgba(255,255,255,0.15))";
        el.style.transform = "translateY(-1px)";
        el.style.boxShadow =
          "0 2px 8px rgba(0,0,0,0.4), 0 0 12px rgba(212,175,55,0.08), inset 0 1px 0 rgba(255,255,255,0.04)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = isPinned
          ? "rgba(212,175,55,0.2)"
          : "var(--border-subtle, rgba(255,255,255,0.08))";
        el.style.transform = "translateY(0)";
        el.style.boxShadow =
          "0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)";
      }}
    >
      {/* Header row: category badge + relevance dot + date */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full font-sans"
          style={{
            background: colors.bg,
            color: colors.text,
          }}
        >
          {formatCategoryLabel(card.category)}
        </span>

        {card.relevance === "high" && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: "var(--gold-primary, #d4af37)" }}
            title="High relevance"
          />
        )}
        {card.relevance === "medium" && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.25)" }}
            title="Medium relevance"
          />
        )}

        {card.event_date && (
          <span
            className="font-mono text-[11px] ml-auto"
            style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
          >
            {formatEventDate(card.event_date, card.event_date_precision)}
          </span>
        )}
      </div>

      {/* Headline */}
      <h4
        className="font-sans font-semibold mb-1"
        style={{
          fontSize: "15px",
          color: "var(--text-primary, #e8e4dc)",
          lineHeight: "1.4",
        }}
      >
        {card.headline}
      </h4>

      {/* Summary with read more */}
      <p
        className="font-sans"
        style={{
          fontSize: "13px",
          color: "var(--text-secondary, rgba(232,228,220,0.7))",
          lineHeight: "1.55",
          ...(expanded ? {} : {
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }),
        }}
      >
        {card.summary}
      </p>
      {card.summary.length > 200 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs mt-0.5 font-sans"
          style={{ color: "var(--gold-primary, #d4af37)" }}
        >
          {expanded ? "read less" : "read more"}
        </button>
      )}

      {/* Exa highlight pull-quote */}
      <ExaHighlightQuote highlights={card.exa_highlights} scores={card.exa_highlight_scores} />

      {/* Source + confidence footer */}
      <div
        className="mt-3 pt-2 flex items-center justify-between gap-2"
        style={{
          borderTop: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {card.source_favicon && (
            <img
              src={card.source_favicon}
              className="w-4 h-4 rounded-sm flex-shrink-0"
              alt=""
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <a
            href={card.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs hover:underline truncate flex items-center gap-1"
            style={{ color: "var(--gold-primary, #d4af37)" }}
          >
            {card.source_name || card.source_url}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
          {card.exa_author && (
            <span
              className="text-[11px] font-sans truncate max-w-[120px]"
              style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
            >
              by {card.exa_author}
            </span>
          )}
        </div>
        {card.confidence_note && (
          <span
            className="text-xs italic font-sans flex-shrink-0 text-right"
            style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
          >
            {card.confidence_note}
          </span>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 mt-2">
        <ResearchPinDropdown
          card={card}
          prospectId={prospectId}
          messageId={messageId}
          isPinned={isPinned}
          onPinSuccess={handlePinSuccess}
        />

        {/* Copy button */}
        <button
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy"}
          className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150"
          style={{
            color: copied
              ? "var(--gold-primary, #d4af37)"
              : "var(--text-tertiary, rgba(232,228,220,0.4))",
            background: "transparent",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.06)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
          }
        >
          <Copy className="w-4 h-4" />
        </button>

        {/* Flag button (UI only — no handler per plan) */}
        <button
          title="Flag as low quality"
          className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150"
          style={{
            color: "var(--text-tertiary, rgba(232,228,220,0.4))",
            background: "transparent",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.06)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
          }
        >
          <Flag className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
