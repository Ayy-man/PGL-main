"use client";

import type { ApolloPerson } from "@/lib/apollo/types";
import { MapPin } from "lucide-react";

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
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="h-4 w-4 rounded border-border accent-[var(--gold-primary)] cursor-pointer"
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

              return (
                <tr
                  key={prospect.id}
                  onClick={() => onProspectClick(prospect.id)}
                  className="row-hover-gold group transition-colors duration-150 cursor-pointer"
                  data-selected={isSelected || undefined}
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  {/* Checkbox */}
                  <td className="whitespace-nowrap py-5 pl-5 pr-3">
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
                          className="text-[15px] font-medium transition-colors duration-150 group-hover:text-[var(--gold-primary)]"
                          style={{ color: "var(--text-primary-ds)" }}
                        >
                          {name}
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
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-ghost)" }}
                    >
                      —
                    </span>
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

                  {/* Enrichment status dots */}
                  <td className="whitespace-nowrap px-3 py-5 text-sm">
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
                    ) : (
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
                          className="text-xs ml-1"
                          style={{ color: "var(--text-ghost)" }}
                        >
                          Not enriched
                        </span>
                      </div>
                    )}
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

          return (
            <div
              key={prospect.id}
              className="p-4 space-y-2 cursor-pointer"
              onClick={() => onProspectClick(prospect.id)}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded accent-[var(--gold-primary)] cursor-pointer"
                  checked={isSelected}
                  onChange={() => onSelect(prospect.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${name}`}
                />
                {/* Name + details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary-ds)" }}>
                    {name}
                  </p>
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
