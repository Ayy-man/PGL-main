"use client";

import type { ApolloPerson } from "@/lib/apollo/types";
import { MapPin, X, CheckCircle2 } from "lucide-react";
import { EnrichmentStatusDots } from "@/components/ui/enrichment-status-dots";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { WealthTierBadge } from "@/components/ui/wealth-tier-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function formatRelativeDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getAvatarGradient(name: string): string {
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 40%, 30%), hsl(${hue}, 50%, 20%))`;
}

type SavedSearchMeta = {
  status: string;
  is_new: boolean;
  prospect_id: string | null;
  last_seen_at: string;
  wealth_tier?: string | null;
};

type ApolloPersonWithMeta = ApolloPerson & { _savedSearchMeta?: SavedSearchMeta };

interface ProspectResultsTableProps {
  results: ApolloPersonWithMeta[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onProspectClick: (id: string) => void;
  savedSearchMode?: boolean;
  onDismiss?: (id: string) => void;
  onUndoDismiss?: (id: string) => void;
  lastRefreshedAt?: string | null;
}

export function ProspectResultsTable({
  results,
  selectedIds,
  onSelect,
  onSelectAll,
  onProspectClick,
  savedSearchMode,
  onDismiss,
  onUndoDismiss,
  lastRefreshedAt,
}: ProspectResultsTableProps) {
  const allSelected = selectedIds.size === results.length && results.length > 0;
  const someSelected = selectedIds.size > 0 && selectedIds.size < results.length;

  return (
    <div
      className="rounded-xl"
      style={{
        border: "1px solid var(--border-default)",
        background: "var(--bg-card-gradient)",
      }}
    >
      {/* Desktop table */}
      <div className="hidden md:block overflow-auto">
        <table className="min-w-full">
          {/* Sticky header */}
          <thead
            className="sticky top-0 z-10"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <tr
              style={{
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <th className="py-3.5 pl-5 pr-3 text-left w-12" scope="col">
                <Checkbox
                  checked={someSelected ? "indeterminate" : allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th
                className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
                scope="col"
              >
                Prospect
              </th>
              <th
                className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
                scope="col"
              >
                Wealth Tier
              </th>
              <th
                className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
                scope="col"
              >
                Title &amp; Company
              </th>
              <th
                className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
                scope="col"
              >
                Added
              </th>
              <th
                className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
                scope="col"
              >
                Enrichment
              </th>
            </tr>
          </thead>

          <tbody>
            {results.map((prospect) => {
              const name =
                prospect.name ||
                `${prospect.first_name} ${prospect.last_name}`;
              const initials = getInitials(name);
              const avatarGradient = getAvatarGradient(name);
              const location = [prospect.city, prospect.state, prospect.country]
                .filter(Boolean)
                .join(", ");
              const isSelected = selectedIds.has(prospect.id);
              const isDismissed = prospect._savedSearchMeta?.status === 'dismissed';
              const isEnriched = prospect._savedSearchMeta?.status === 'enriched';
              const isNew = savedSearchMode && prospect._savedSearchMeta?.is_new;
              const notInLatest = savedSearchMode && lastRefreshedAt && prospect._savedSearchMeta?.last_seen_at
                && new Date(prospect._savedSearchMeta.last_seen_at) < new Date(lastRefreshedAt);

              return (
                <tr
                  key={prospect.id}
                  onClick={() => onProspectClick(prospect.id)}
                  className="row-hover-gold group transition-colors duration-150 cursor-pointer active:bg-[var(--gold-bg)]"
                  data-selected={isSelected || undefined}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    opacity: isDismissed ? 0.4 : 1,
                  }}
                >
                  {/* Checkbox — hidden for enriched prospects in saved search mode */}
                  <td className="whitespace-nowrap py-5 pl-5 pr-3">
                    {savedSearchMode && isEnriched ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--gold-bg)] text-[var(--gold-text)] border border-[var(--border-gold)]"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Enriched
                      </span>
                    ) : (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (typeof checked === "boolean") {
                            onSelect(prospect.id);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${name}`}
                      />
                    )}
                  </td>

                  {/* Prospect: Avatar + Name + Location */}
                  <td className="whitespace-nowrap px-3 py-5">
                    <div className="flex items-center">
                      <div
                        className="h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center"
                        style={{ background: avatarGradient }}
                      >
                        <span className="font-serif text-[15px] text-white/80">
                          {initials}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div
                          className="text-[15px] font-medium transition-colors duration-150 group-hover:text-[var(--gold-primary)] flex items-center gap-1.5"
                          style={{ color: "var(--text-primary-ds)" }}
                        >
                          {name}
                          {isNew && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                              style={{
                                background: "rgba(212, 175, 55, 0.15)",
                                color: "var(--gold-text, #f4d47f)",
                                border: "1px solid rgba(212, 175, 55, 0.3)",
                              }}
                            >
                              NEW
                            </span>
                          )}
                          {notInLatest && (
                            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                              Not in latest results
                            </span>
                          )}
                        </div>
                        {location && (
                          <div
                            className="text-[13px] flex items-center gap-1 mt-0.5"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            <MapPin className="h-3 w-3" />
                            {location}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Wealth Tier — shown after enrichment */}
                  <td className="whitespace-nowrap px-3 py-5">
                    {prospect._savedSearchMeta?.wealth_tier ? (
                      <WealthTierBadge tier={prospect._savedSearchMeta.wealth_tier} />
                    ) : prospect._enriched === true ? (
                      <Skeleton className="h-5 w-12 rounded" />
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm" style={{ color: "var(--text-ghost)" }}>Locked</span>
                        </TooltipTrigger>
                        <TooltipContent>Enrich to reveal wealth tier</TooltipContent>
                      </Tooltip>
                    )}
                  </td>

                  {/* Title & Company */}
                  <td className="whitespace-nowrap px-3 py-5">
                    <div className="flex flex-col">
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--text-secondary-ds)" }}
                      >
                        {prospect.title || "—"}
                      </span>
                      <span
                        className="text-[13px] mt-0.5"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {prospect.organization_name ||
                          prospect.organization?.name ||
                          ""}
                      </span>
                    </div>
                  </td>

                  {/* Added */}
                  <td className="whitespace-nowrap px-3 py-5">
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {formatRelativeDate(prospect.first_seen_at)}
                    </span>
                  </td>

                  {/* Enrichment status dots + Undo button for dismissed */}
                  <td className="whitespace-nowrap px-3 py-5 text-sm">
                    <div className="flex items-center gap-2">
                      {prospect._enriched === false ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            background: "rgba(245,158,11,0.15)",
                            color: "rgb(245,158,11)",
                            border: "1px solid rgba(245,158,11,0.3)",
                          }}
                        >
                          Preview Only
                        </span>
                      ) : (() => {
                        const sourceStatus = (prospect as ApolloPerson & { enrichment_source_status?: Record<string, string> | null }).enrichment_source_status ?? null;
                        return sourceStatus
                          ? <EnrichmentStatusDots sourceStatus={sourceStatus as Record<string, "pending" | "in_progress" | "complete" | "failed" | "skipped" | "circuit_open" | "no_data">} />
                          : <span className="text-xs" style={{ color: "var(--text-ghost)" }}>Not enriched</span>;
                      })()}
                      {savedSearchMode && isDismissed && onUndoDismiss && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onUndoDismiss(prospect.id); }}
                          className="text-[12px] px-2 py-1 rounded transition-colors"
                          style={{ color: "var(--gold-text)", background: "rgba(212, 175, 55, 0.1)" }}
                        >
                          Undo
                        </button>
                      )}
                      {savedSearchMode && !isDismissed && onDismiss && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDismiss(prospect.id); }}
                          title="Dismiss prospect"
                          className="flex items-center justify-center h-5 w-5 rounded transition-colors hover:text-foreground"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden divide-y" style={{ borderColor: "var(--border-subtle)" }}>
        {results.map((prospect) => {
          const name =
            prospect.name ||
            `${prospect.first_name} ${prospect.last_name}`;
          const location = [prospect.city, prospect.state]
            .filter(Boolean)
            .join(", ");
          const isSelected = selectedIds.has(prospect.id);
          const isDismissed = prospect._savedSearchMeta?.status === 'dismissed';
          const isEnriched = prospect._savedSearchMeta?.status === 'enriched';
          const isNew = savedSearchMode && prospect._savedSearchMeta?.is_new;

          return (
            <div
              key={prospect.id}
              className="p-4 space-y-2 cursor-pointer"
              onClick={() => onProspectClick(prospect.id)}
              style={{ opacity: isDismissed ? 0.4 : 1 }}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox — hidden for enriched prospects in saved search mode (matches desktop) */}
                {savedSearchMode && isEnriched ? (
                  <span
                    className="mt-1 inline-flex items-center gap-1 shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-[var(--gold-bg)] text-[var(--gold-text)] border border-[var(--border-gold)]"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Enriched
                  </span>
                ) : (
                  <Checkbox
                    className="mt-1 h-5 w-5"
                    checked={isSelected}
                    onCheckedChange={() => onSelect(prospect.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${name}`}
                  />
                )}
                {/* Name + details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary-ds)" }}>
                      {name}
                    </p>
                    {isNew && (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          background: "rgba(212, 175, 55, 0.15)",
                          color: "var(--gold-text, #f4d47f)",
                          border: "1px solid rgba(212, 175, 55, 0.3)",
                        }}
                      >
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                    {prospect.title || "—"}
                    {(prospect.organization_name || prospect.organization?.name) &&
                      ` at ${prospect.organization_name || prospect.organization?.name}`}
                  </p>
                  {location && (
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
                      <MapPin className="h-3 w-3 shrink-0" />
                      {location}
                    </p>
                  )}
                  {prospect._enriched === false && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium mt-1"
                      style={{
                        background: "rgba(245,158,11,0.15)",
                        color: "rgb(245,158,11)",
                        border: "1px solid rgba(245,158,11,0.3)",
                      }}
                    >
                      Preview Only
                    </span>
                  )}
                  {savedSearchMode && isDismissed && onUndoDismiss && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onUndoDismiss(prospect.id); }}
                      className="text-[12px] px-2 py-1 rounded mt-1 transition-colors"
                      style={{ color: "var(--gold-text)", background: "rgba(212, 175, 55, 0.1)" }}
                    >
                      Undo
                    </button>
                  )}
                </div>
                <span className="text-[11px] shrink-0" style={{ color: "var(--text-ghost)" }}>—</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
