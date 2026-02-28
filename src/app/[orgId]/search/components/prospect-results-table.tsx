"use client";

import type { ApolloPerson } from "@/lib/apollo/types";
import { WealthTierBadge } from "@/components/ui/wealth-tier-badge";
import { MapPin, Eye, Search } from "lucide-react";

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

function getWealthTier(
  person: ApolloPerson
): "$500M+" | "$100M+" | "$50M+" | "$30M+" | null {
  const title = (person.title || "").toLowerCase();
  if (
    title.includes("founder") ||
    title.includes("chairman") ||
    title.includes("billionaire")
  )
    return "$500M+";
  if (title.includes("ceo") || title.includes("chief executive"))
    return "$100M+";
  if (
    title.includes("managing director") ||
    title.includes("president") ||
    title.includes("partner")
  )
    return "$50M+";
  if (
    title.includes("vp") ||
    title.includes("vice president") ||
    title.includes("director")
  )
    return "$30M+";
  return null;
}

interface ProspectResultsTableProps {
  results: ApolloPerson[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onProspectClick: (id: string) => void;
}

export function ProspectResultsTable({
  results,
  selectedIds,
  onSelect,
  onSelectAll,
  onProspectClick,
}: ProspectResultsTableProps) {
  const allSelected = selectedIds.size === results.length && results.length > 0;

  return (
    <div
      className="overflow-auto rounded-xl"
      style={{
        border: "1px solid var(--border-default)",
        background: "var(--bg-card-gradient)",
      }}
    >
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
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="h-4 w-4 rounded border-border accent-[var(--gold-primary)] cursor-pointer"
                aria-label="Select all"
              />
            </th>
            <th
              className="py-3.5 pl-4 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
              scope="col"
            >
              Prospect
            </th>
            <th
              className="px-3 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
              scope="col"
            >
              Wealth Tier
            </th>
            <th
              className="px-3 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
              scope="col"
            >
              Title &amp; Company
            </th>
            <th
              className="px-3 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
              scope="col"
            >
              Enrichment
            </th>
            <th
              className="px-3 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
              scope="col"
            >
              Actions
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
            const wealthTier = getWealthTier(prospect);
            const isSelected = selectedIds.has(prospect.id);

            return (
              <tr
                key={prospect.id}
                onClick={() => onProspectClick(prospect.id)}
                className="group transition-colors duration-150 cursor-pointer"
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  borderLeft: "4px solid transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    "rgba(212,175,55,0.03)";
                  (e.currentTarget as HTMLTableRowElement).style.borderLeftColor =
                    "var(--gold-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    isSelected ? "rgba(212,175,55,0.05)" : "transparent";
                  (e.currentTarget as HTMLTableRowElement).style.borderLeftColor =
                    isSelected ? "var(--gold-primary)" : "transparent";
                }}
              >
                {/* Checkbox */}
                <td className="whitespace-nowrap py-4 pl-5 pr-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      onSelect(prospect.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-border accent-[var(--gold-primary)] cursor-pointer"
                    aria-label={`Select ${name}`}
                  />
                </td>

                {/* Prospect: Avatar + Name + Location */}
                <td className="whitespace-nowrap px-3 py-4">
                  <div className="flex items-center">
                    <div
                      className="h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center"
                      style={{ background: avatarGradient }}
                    >
                      <span className="font-serif text-[14px] text-white/80">
                        {initials}
                      </span>
                    </div>
                    <div className="ml-3">
                      <div
                        className="text-[14px] font-medium transition-colors duration-150 group-hover:text-[var(--gold-primary)]"
                        style={{ color: "var(--text-primary-ds)" }}
                      >
                        {name}
                      </div>
                      {location && (
                        <div
                          className="text-[12px] flex items-center gap-1 mt-0.5"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          <MapPin className="h-3 w-3" />
                          {location}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Wealth Tier */}
                <td className="whitespace-nowrap px-3 py-4">
                  {wealthTier ? (
                    <WealthTierBadge tier={wealthTier} />
                  ) : (
                    <span
                      className="text-[12px]"
                      style={{ color: "var(--text-ghost)" }}
                    >
                      —
                    </span>
                  )}
                </td>

                {/* Title & Company */}
                <td className="whitespace-nowrap px-3 py-4">
                  <div className="flex flex-col">
                    <span
                      className="text-[13px] font-medium"
                      style={{ color: "var(--text-secondary-ds)" }}
                    >
                      {prospect.title || "—"}
                    </span>
                    <span
                      className="text-[12px] mt-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {prospect.organization_name ||
                        prospect.organization?.name ||
                        ""}
                    </span>
                  </div>
                </td>

                {/* Enrichment status dots */}
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.15)" }}
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.15)" }}
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.15)" }}
                      />
                    </div>
                    <span
                      className="text-[11px] ml-1"
                      style={{ color: "var(--text-ghost)" }}
                    >
                      Not enriched
                    </span>
                  </div>
                </td>

                {/* Actions — visible on hover */}
                <td className="relative whitespace-nowrap py-4 pl-3 pr-5 text-right">
                  <div
                    className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="p-1.5 rounded transition-colors duration-150 cursor-pointer"
                      title="Find Lookalikes"
                      style={{ color: "var(--text-tertiary)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "var(--gold-primary)";
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "rgba(212,175,55,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "var(--text-tertiary)";
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "transparent";
                      }}
                    >
                      <Search className="h-[18px] w-[18px]" />
                    </button>
                    <button
                      className="p-1.5 rounded transition-colors duration-150 cursor-pointer"
                      title="View Profile"
                      style={{ color: "var(--text-tertiary)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "var(--gold-primary)";
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "rgba(212,175,55,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "var(--text-tertiary)";
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "transparent";
                      }}
                    >
                      <Eye className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
