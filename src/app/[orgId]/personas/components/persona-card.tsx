"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Persona } from "@/lib/personas/types";
import { Badge } from "@/components/ui/badge";
import { Search, Pencil, Trash2, Briefcase, MapPin, Users, Tag, Lock } from "lucide-react";
import { PersonaFormDialog } from "./persona-form-dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface PersonaCardProps {
  persona: Persona;
  onDelete?: (personaId: string) => void;
  onUpdated?: (persona: Persona) => void;
  canEdit?: boolean;
}

interface FilterSection {
  icon: React.ElementType;
  label: string;
  values: string[];
}

export function PersonaCard({ persona, onDelete, onUpdated, canEdit = true }: PersonaCardProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const [cardStyle, setCardStyle] = useState({
    background: "var(--bg-card-gradient)",
    borderColor: "var(--border-default)",
  });

  const handleDelete = () => {
    onDelete?.(persona.id);
  };

  const filterSections = useMemo(() => {
    const sections: FilterSection[] = [];
    const f = persona.filters;
    if (f.titles?.length)
      sections.push({ icon: Briefcase, label: "Titles", values: f.titles });
    if (f.seniorities?.length)
      sections.push({
        icon: Users,
        label: "Seniority",
        values: f.seniorities.map((s) => s.replace(/_/g, " ")),
      });
    if (f.industries?.length)
      sections.push({ icon: Tag, label: "Industries", values: f.industries });
    if (f.locations?.length)
      sections.push({ icon: MapPin, label: "Locations", values: f.locations });
    if (f.companySize?.length)
      sections.push({ icon: Users, label: "Company Size", values: f.companySize });
    return sections;
  }, [persona.filters]);

  const totalFilters = filterSections.reduce((n, s) => n + s.values.length, 0);

  const lastUsedDisplay = persona.last_used_at
    ? new Date(persona.last_used_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Never";

  const searchHref = `/${orgId}/search?persona=${persona.id}`;

  const ghostButtonStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(232,228,220,0.6)",
  };

  return (
    <div
      className="rounded-[14px] flex flex-col h-full transition-all overflow-hidden"
      style={{
        background: cardStyle.background,
        border: `1px solid ${cardStyle.borderColor}`,
      }}
      onMouseEnter={() =>
        setCardStyle({
          background: "var(--bg-card-hover)",
          borderColor: "var(--border-hover)",
        })
      }
      onMouseLeave={() =>
        setCardStyle({
          background: "var(--bg-card-gradient)",
          borderColor: "var(--border-default)",
        })
      }
    >
      {/* Top section */}
      <div className="p-6 pb-4 flex flex-col gap-3">
        {/* Name + badge row */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-serif text-xl sm:text-[24px] font-semibold leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {persona.name}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            {persona.visibility === "personal" && (
              <span
                title="Private — only you and admins"
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-[5px] uppercase tracking-wide"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-ghost)",
                }}
              >
                <Lock className="h-3 w-3" />
                Personal
              </span>
            )}
            {persona.is_starter && (
              <Badge
                variant="gold"
                className="text-[10px] uppercase tracking-wide"
              >
                Suggested
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        {persona.description && (
          <p
            className="text-[13px] leading-relaxed line-clamp-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {persona.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[11px] uppercase tracking-wide"
              style={{ color: "var(--text-tertiary)" }}
            >
              Last Run
            </span>
            <span
              className="text-[12px] font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {lastUsedDisplay}
            </span>
          </div>
          <div
            className="h-3"
            style={{ width: 1, background: "var(--border-subtle)" }}
          />
          <div className="flex items-center gap-1.5">
            <span
              className="text-[11px] uppercase tracking-wide"
              style={{ color: "var(--text-tertiary)" }}
            >
              Filters
            </span>
            <span
              className="text-[12px] font-mono font-medium"
              style={{ color: "var(--gold-primary)" }}
            >
              {totalFilters}
            </span>
          </div>
        </div>
      </div>

      {/* Filter criteria section */}
      {filterSections.length > 0 && (
        <div
          className="px-6 py-4 flex flex-col gap-3"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            background: "rgba(255,255,255,0.015)",
          }}
        >
          {filterSections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.label} className="flex items-start gap-2">
                <Icon
                  className="h-3.5 w-3.5 mt-0.5 shrink-0"
                  style={{ color: "var(--text-tertiary)" }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {section.values.map((val) => (
                    <span
                      key={val}
                      className="text-[11px] px-2 py-0.5 rounded-[5px] capitalize"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {val}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {persona.filters.keywords && (
            <div className="flex items-start gap-2">
              <Search
                className="h-3.5 w-3.5 mt-0.5 shrink-0"
                style={{ color: "var(--text-tertiary)" }}
              />
              <span
                className="text-[11px] italic"
                style={{ color: "var(--text-tertiary)" }}
              >
                &ldquo;{persona.filters.keywords}&rdquo;
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div
        className="mt-auto px-6 py-4 flex items-center gap-2"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <Link
          href={searchHref}
          className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-[8px] cursor-pointer transition-all whitespace-nowrap"
          style={{
            background: "var(--gold-bg)",
            border: "1px solid var(--border-gold)",
            color: "var(--gold-primary)",
          }}
        >
          <Search className="h-3.5 w-3.5" />
          Search Prospects
        </Link>

        {!persona.is_starter && (
          <>
            {canEdit ? (
              <PersonaFormDialog
                mode="edit"
                persona={persona}
                onUpdated={onUpdated}
                trigger={
                  <button
                    className="flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-[8px] cursor-pointer transition-all"
                    style={ghostButtonStyle}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                }
              />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <button
                      disabled
                      className="flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-[8px] opacity-40 cursor-not-allowed"
                      style={ghostButtonStyle}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Assistants cannot edit saved searches.</TooltipContent>
              </Tooltip>
            )}

            {canEdit ? (
              <button
                className="flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-[8px] cursor-pointer transition-all ml-auto"
                style={ghostButtonStyle}
                onClick={handleDelete}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--destructive)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "rgba(232,228,220,0.6)";
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="ml-auto">
                    <button
                      disabled
                      className="flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-[8px] opacity-40 cursor-not-allowed"
                      style={ghostButtonStyle}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Assistants cannot delete saved searches.</TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </div>
  );
}
