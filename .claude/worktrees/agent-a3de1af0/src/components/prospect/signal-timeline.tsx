"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  DollarSign,
  Mic2,
  Gem,
  Building2,
  Trophy,
  Diamond,
  Landmark,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import type { ProspectSignal, SignalCategory } from "@/types/database";

interface SignalTimelineProps {
  prospectId: string;
  orgId: string;
  initialSignals: Array<ProspectSignal & { is_seen: boolean }>;
  totalCount: number;
}

function getCategoryIcon(category: SignalCategory) {
  switch (category) {
    case "career_move": return Briefcase;
    case "funding": return DollarSign;
    case "media": return Mic2;
    case "wealth_signal": return Gem;
    case "company_intel": return Building2;
    case "recognition": return Trophy;
    case "sec_filing": return Landmark;
    case "market_event": return TrendingUp;
    default: return Diamond;
  }
}

function getCategoryLabel(category: SignalCategory): string {
  switch (category) {
    case "career_move": return "Career Move";
    case "funding": return "Funding";
    case "media": return "Media";
    case "wealth_signal": return "Wealth Signal";
    case "company_intel": return "Company Intel";
    case "recognition": return "Recognition";
    case "sec_filing": return "SEC Filing";
    case "market_event": return "Market Event";
    default: return "Signal";
  }
}

function getCategoryColor(category: string): { bg: string; text: string; border: string } {
  switch (category) {
    case "sec_filing": return { bg: "rgba(59,130,246,0.1)", text: "#3b82f6", border: "rgba(59,130,246,0.2)" };
    case "career_move": return { bg: "rgba(34,197,94,0.1)", text: "#22c55e", border: "rgba(34,197,94,0.2)" };
    case "wealth_signal": return { bg: "rgba(212,175,55,0.08)", text: "var(--gold-primary)", border: "rgba(212,175,55,0.15)" };
    case "funding": return { bg: "rgba(16,185,129,0.1)", text: "#10b981", border: "rgba(16,185,129,0.2)" };
    case "media": return { bg: "rgba(168,85,247,0.1)", text: "#a855f7", border: "rgba(168,85,247,0.2)" };
    case "company_intel": return { bg: "rgba(6,182,212,0.1)", text: "#06b6d4", border: "rgba(6,182,212,0.2)" };
    case "recognition": return { bg: "rgba(245,158,11,0.1)", text: "#f59e0b", border: "rgba(245,158,11,0.2)" };
    case "market_event": return { bg: "rgba(59,130,246,0.1)", text: "#3b82f6", border: "rgba(59,130,246,0.2)" };
    default: return { bg: "rgba(212,175,55,0.08)", text: "var(--gold-primary)", border: "rgba(212,175,55,0.15)" };
  }
}

const ALL_CATEGORIES: SignalCategory[] = [
  "career_move",
  "funding",
  "media",
  "wealth_signal",
  "company_intel",
  "recognition",
  "sec_filing",
  "market_event",
];

export function SignalTimeline({
  prospectId,
  orgId: _orgId,
  initialSignals,
  totalCount,
}: SignalTimelineProps) {
  const [signals, setSignals] = useState<Array<ProspectSignal & { is_seen: boolean }>>(initialSignals);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(totalCount);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Mark unseen signals as seen on mount
  useEffect(() => {
    const unseenIds = initialSignals.filter((s) => !s.is_seen).map((s) => s.id);
    if (unseenIds.length === 0) return;

    fetch(`/api/prospects/${prospectId}/signals/mark-seen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signalIds: unseenIds }),
    }).catch(() => {
      // Fire-and-forget — mark-seen failures are non-critical
    });
  }, [prospectId, initialSignals]);

  // Client-side filter for initial signals
  const filteredSignals =
    categoryFilter === "all"
      ? signals
      : signals.filter((s) => s.category === categoryFilter);

  const hasMore = signals.length < total;

  async function loadMore() {
    if (loading) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const url = new URL(`/api/prospects/${prospectId}/signals`, window.location.origin);
      url.searchParams.set("page", String(nextPage));
      url.searchParams.set("limit", "10");
      if (categoryFilter !== "all") {
        url.searchParams.set("category", categoryFilter);
      }

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      setSignals((prev) => [...prev, ...(data.signals || [])]);
      setTotal(data.total || total);
      setPage(nextPage);

      // Mark newly fetched unseen signals as seen
      const unseenIds = (data.signals || [])
        .filter((s: ProspectSignal & { is_seen: boolean }) => !s.is_seen)
        .map((s: ProspectSignal) => s.id);
      if (unseenIds.length > 0) {
        fetch(`/api/prospects/${prospectId}/signals/mark-seen`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signalIds: unseenIds }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error("[SignalTimeline] Load more error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="surface-card rounded-[14px] p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h3 className="text-foreground text-xl font-bold font-serif flex items-center gap-2">
          <Diamond className="h-5 w-5 shrink-0" style={{ color: "var(--gold-primary)" }} />
          Wealth Signal Timeline
        </h3>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs rounded-md px-2 py-1.5 border outline-none"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: "var(--border-default, rgba(255,255,255,0.08))",
            color: "var(--text-secondary, rgba(232,228,220,0.7))",
          }}
        >
          <option value="all">All Categories</option>
          {ALL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {getCategoryLabel(cat)}
            </option>
          ))}
        </select>
      </div>

      {/* Empty state */}
      {filteredSignals.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No signals yet. Will appear after enrichment.
        </p>
      )}

      {/* Timeline */}
      {filteredSignals.length > 0 && (
        <div className="relative">
          {/* Vertical rail */}
          <div
            className="absolute left-[11px] top-0 bottom-0 w-px"
            style={{ background: "var(--border-default, rgba(255,255,255,0.06))" }}
          />

          {filteredSignals.map((signal) => {
            const color = getCategoryColor(signal.category);
            const CategoryIcon = getCategoryIcon(signal.category);
            return (
              <div key={signal.id} className="relative pl-8 pb-6 last:pb-0">
                {/* Dot on rail */}
                <div
                  className="absolute left-1.5 top-1 w-3 h-3 rounded-full border-2"
                  style={{ borderColor: color.text, background: color.bg }}
                />

                {/* Badge row */}
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}
                  >
                    <CategoryIcon className="h-3 w-3" />
                    {getCategoryLabel(signal.category)}
                  </span>

                  {/* NEW badge */}
                  {!signal.is_seen && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded animate-pulse"
                      style={{
                        background: "var(--gold-bg-strong, rgba(212,175,55,0.15))",
                        color: "var(--gold-primary)",
                        border: "1px solid var(--border-gold, rgba(212,175,55,0.3))",
                      }}
                    >
                      NEW
                    </span>
                  )}

                  {/* Date */}
                  {(signal.event_date || signal.created_at) && (
                    <span
                      className="text-[11px] ml-auto"
                      style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
                    >
                      {new Date(signal.event_date || signal.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>

                {/* Headline */}
                <h4 className="text-sm font-semibold text-foreground mb-1 leading-snug">
                  {signal.headline}
                </h4>

                {/* Summary */}
                <p
                  className="text-xs leading-relaxed mb-1.5"
                  style={{ color: "var(--text-secondary, rgba(232,228,220,0.6))" }}
                >
                  {signal.summary}
                </p>

                {/* Source link */}
                {signal.source_url && (
                  <a
                    href={signal.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] transition-opacity hover:opacity-70"
                    style={{ color: "var(--gold-primary)" }}
                  >
                    View Source <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="mt-5 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="text-xs px-4 py-2 rounded-md transition-opacity disabled:opacity-50"
            style={{
              background: "rgba(212,175,55,0.08)",
              color: "var(--gold-primary)",
              border: "1px solid rgba(212,175,55,0.2)",
            }}
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
