"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Persona } from "@/lib/personas/types";
import { Badge } from "@/components/ui/badge";
import { Search, Pencil, Trash2, Compass } from "lucide-react";
import { PersonaFormDialog } from "./persona-form-dialog";
import { deletePersonaAction } from "../actions";
import { PersonaSparkline } from "./persona-sparkline";

interface PersonaCardProps {
  persona: Persona;
}

export function PersonaCard({ persona }: PersonaCardProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const [isDeleting, setIsDeleting] = useState(false);
  const [cardStyle, setCardStyle] = useState({
    background: "var(--bg-card-gradient)",
    borderColor: "var(--border-subtle)",
  });

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${persona.name}"?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deletePersonaAction(persona.id);
    } catch (error) {
      alert(
        `Failed to delete persona: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setIsDeleting(false);
    }
  };

  const sparklineData = useMemo(() => {
    let seed = persona.id
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return Array.from({ length: 7 }, () => {
      seed = (seed * 9301 + 49297) % 233280;
      return { value: Math.floor((seed / 233280) * 500) + 100 };
    });
  }, [persona.id]);

  const filterTags = useMemo(() => {
    const tags: string[] = [];
    if (persona.filters.titles) tags.push(...persona.filters.titles.slice(0, 2));
    if (persona.filters.industries)
      tags.push(...persona.filters.industries.slice(0, 1));
    if (persona.filters.seniorities) {
      tags.push(
        ...persona.filters.seniorities
          .slice(0, 1)
          .map((s) => s.replace("_", " "))
      );
    }
    return tags.filter(Boolean).slice(0, 4);
  }, [persona.filters]);

  const lastUsedDisplay = persona.last_used_at
    ? new Date(persona.last_used_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Never run";

  const lastValue = sparklineData[sparklineData.length - 1]?.value ?? 100;
  const matchCount = `~${lastValue * 5} matches`;

  const searchHref = `/${orgId}/search?persona=${persona.id}`;

  const ghostButtonStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(232,228,220,0.6)",
  };

  return (
    <div
      className="rounded-[14px] p-7 cursor-pointer transition-all flex flex-col gap-4"
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
          borderColor: "var(--border-subtle)",
        })
      }
    >
      {/* Row 1: Name + Suggested badge */}
      <div className="flex items-start justify-between gap-2">
        <h3
          className="font-serif text-[22px] font-semibold leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {persona.name}
        </h3>
        {persona.is_starter && (
          <Badge
            variant="gold"
            className="shrink-0 text-[10px] uppercase tracking-wide"
          >
            Suggested
          </Badge>
        )}
      </div>

      {/* Row 2: Description */}
      {persona.description && (
        <p
          className="text-[13px] leading-relaxed line-clamp-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {persona.description}
        </p>
      )}

      {/* Row 3: Filter tags chips */}
      {filterTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filterTags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-2.5 py-0.5 rounded-[6px]"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Row 4: Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[11px] uppercase tracking-wide"
            style={{ color: "var(--text-tertiary)" }}
          >
            Last Run
          </span>
          <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>
            {lastUsedDisplay}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 items-end">
          <span
            className="text-[11px] uppercase tracking-wide"
            style={{ color: "var(--text-tertiary)" }}
          >
            Total
          </span>
          <span
            className="text-[13px] font-mono"
            style={{ color: "var(--gold-primary)" }}
          >
            {matchCount}
          </span>
        </div>
      </div>

      {/* Row 5: Sparkline */}
      <PersonaSparkline data={sparklineData} />

      {/* Row 6: Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={searchHref}
          className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[8px] cursor-pointer transition-all"
          style={ghostButtonStyle}
        >
          <Search className="h-3.5 w-3.5" />
          Search
        </Link>

        <Link
          href={searchHref}
          className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[8px] cursor-pointer transition-all"
          style={ghostButtonStyle}
        >
          <Compass className="h-3.5 w-3.5" />
          Explore
        </Link>

        {!persona.is_starter && (
          <>
            <PersonaFormDialog
              mode="edit"
              persona={persona}
              trigger={
                <button
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[8px] cursor-pointer transition-all"
                  style={ghostButtonStyle}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              }
            />

            <button
              className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[8px] cursor-pointer transition-all"
              style={ghostButtonStyle}
              onClick={handleDelete}
              disabled={isDeleting}
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
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
