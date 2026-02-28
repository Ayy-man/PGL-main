"use client";

import { useState } from "react";
import type { ApolloPerson } from "@/lib/apollo/types";
import type { List } from "@/lib/lists/types";
import { WealthTierBadge } from "@/components/ui/wealth-tier-badge";
import { AddToListDialog } from "./add-to-list-dialog";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Linkedin } from "lucide-react";

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

function getLocation(person: ApolloPerson): string {
  const parts = [person.city, person.state, person.country].filter(Boolean);
  return parts.join(", ");
}

// Derive a rough wealth tier from job title / seniority signals
function getWealthTier(
  person: ApolloPerson
): "$500M+" | "$100M+" | "$50M+" | "$30M+" | null {
  const title = (person.title || "").toLowerCase();
  if (
    title.includes("founder") ||
    title.includes("chairman") ||
    title.includes("billionaire")
  ) {
    return "$500M+";
  }
  if (title.includes("ceo") || title.includes("chief executive")) {
    return "$100M+";
  }
  if (
    title.includes("managing director") ||
    title.includes("president") ||
    title.includes("partner")
  ) {
    return "$50M+";
  }
  if (
    title.includes("vp") ||
    title.includes("vice president") ||
    title.includes("director")
  ) {
    return "$30M+";
  }
  return null;
}

interface ProspectResultCardProps {
  prospect: ApolloPerson;
  lists: List[];
  orgId: string;
  onClick: () => void;
  selected?: boolean;
  onSelect?: () => void;
}

export function ProspectResultCard({
  prospect,
  lists,
  orgId,
  onClick,
  selected,
  onSelect,
}: ProspectResultCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const name = prospect.name || `${prospect.first_name} ${prospect.last_name}`;
  const initials = getInitials(name);
  const avatarGradient = getAvatarGradient(name);
  const location = getLocation(prospect);
  const wealthTier = getWealthTier(prospect);

  const hasEmail =
    Boolean(prospect.email) ||
    prospect.email_status === "verified" ||
    prospect.email_status === "guessed";
  const hasPhone = Boolean(prospect.phone_numbers?.length);
  const hasLinkedin = Boolean(prospect.linkedin_url);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="rounded-[12px] p-6 px-7 flex items-start justify-between transition-all duration-200 cursor-pointer"
      style={{
        background: selected
          ? "var(--gold-bg)"
          : isHovered
          ? "var(--bg-card-hover)"
          : "var(--bg-card-gradient)",
        border: selected
          ? "1px solid var(--border-gold)"
          : isHovered
          ? "1px solid var(--border-hover)"
          : "1px solid var(--border-subtle)",
      }}
    >
      {/* Left section */}
      <div className="flex items-start gap-[18px] flex-1 min-w-0">
        {/* Checkbox — conditionally rendered when onSelect is provided */}
        {onSelect && (
          <div className="flex items-center pt-1">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-border accent-[var(--gold-primary)] cursor-pointer"
              aria-label={`Select ${name}`}
            />
          </div>
        )}

        {/* Avatar */}
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full"
          style={{
            width: "48px",
            height: "48px",
            background: avatarGradient,
          }}
        >
          <span className="font-serif text-[18px] text-white/80">{initials}</span>
        </div>

        {/* Info block */}
        <div className="flex-1 min-w-0">
          {/* Name + wealth badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-serif text-[20px] font-semibold text-foreground">
              {name}
            </span>
            {wealthTier && <WealthTierBadge tier={wealthTier} />}
          </div>

          {/* Title + Company */}
          {(prospect.title || prospect.organization_name) && (
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {[prospect.title, prospect.organization_name]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {/* Location */}
          {location && (
            <p className="text-xs text-muted-foreground/60 mt-0.5">{location}</p>
          )}

          {/* AI Insight block — shown when headline is available */}
          {prospect.headline && (
            <div
              className="mt-3 pl-3 py-2"
              style={{
                borderLeft: "2px solid var(--border-gold)",
                background: "var(--gold-bg)",
              }}
            >
              <span
                className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: "var(--gold-text)" }}
              >
                AI Insight
              </span>
              <p className="text-xs text-foreground/80 mt-1">{prospect.headline}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right section — stop propagation so card click doesn't fire */}
      <div
        className="flex flex-col items-end gap-3 ml-6 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Contact icons */}
        <div className="flex items-center gap-2">
          {/* Email */}
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center"
            style={
              hasEmail
                ? {
                    background: "var(--gold-bg)",
                    border: "1px solid var(--border-gold)",
                  }
                : {
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }
            }
          >
            <Mail
              className="h-3.5 w-3.5"
              style={{
                color: hasEmail
                  ? "var(--gold-primary)"
                  : "rgba(255,255,255,0.25)",
              }}
            />
          </div>

          {/* Phone */}
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center"
            style={
              hasPhone
                ? {
                    background: "var(--gold-bg)",
                    border: "1px solid var(--border-gold)",
                  }
                : {
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }
            }
          >
            <Phone
              className="h-3.5 w-3.5"
              style={{
                color: hasPhone
                  ? "var(--gold-primary)"
                  : "rgba(255,255,255,0.25)",
              }}
            />
          </div>

          {/* LinkedIn */}
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center"
            style={
              hasLinkedin
                ? {
                    background: "var(--gold-bg)",
                    border: "1px solid var(--border-gold)",
                  }
                : {
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }
            }
          >
            <Linkedin
              className="h-3.5 w-3.5"
              style={{
                color: hasLinkedin
                  ? "var(--gold-primary)"
                  : "rgba(255,255,255,0.25)",
              }}
            />
          </div>
        </div>

        {/* Add to List dialog — trigger is the gold button */}
        <AddToListDialog
          prospect={prospect}
          lists={lists}
          orgId={orgId}
          trigger={
            <Button variant="gold" size="sm">
              + Add to List
            </Button>
          }
        />
      </div>
    </div>
  );
}
