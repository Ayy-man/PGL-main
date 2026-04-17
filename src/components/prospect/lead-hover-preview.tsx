"use client";

import { Mail, Phone, ExternalLink, Loader2, User, Sparkles } from "lucide-react";
import { ProspectAvatar } from "@/components/prospect/prospect-avatar";
import type { ListMember } from "@/lib/lists/types";

const SOURCE_SHORT_LABELS: Array<[string, string]> = [
  ["contactout", "Contact"],
  ["exa", "Web"],
  ["sec", "Filings"],
  ["market", "Market"],
  ["claude", "AI"],
];

/** DB stores enrichment_source_status as either flat strings or {status, at, error?} objects. Normalize. */
function extractStatus(
  raw: string | { status?: string; at?: string; error?: string } | undefined
): string | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") return raw;
  return raw.status;
}

interface LeadHoverPreviewProps {
  prospect: ListMember["prospect"];
}

const ENRICHMENT_LABEL: Record<string, string> = {
  complete: "Enriched",
  enriched: "Enriched",
  in_progress: "Enriching\u2026",
  failed: "Enrichment failed",
  pending: "Pending enrichment",
};

function StatusPill({ status }: { status: string | null }) {
  // Mirror the EnrichmentDot color system (list-member-table.tsx)
  // but render as label+dot so the popup reads at a glance.
  // var(--success) / var(--destructive) tokens with hardcoded fallbacks per existing pattern.
  const label = status ? (ENRICHMENT_LABEL[status] ?? "Not enriched") : "Not enriched";
  const styles = (() => {
    switch (status) {
      case "complete":
      case "enriched":
        return { bg: "rgba(34,197,94,0.12)", color: "var(--success, #22c55e)", dot: "var(--success, #22c55e)" };
      case "in_progress":
        return { bg: "rgba(var(--gold-primary-rgb), 0.10)", color: "var(--gold-primary)", dot: "var(--gold-primary)" };
      case "failed":
        return { bg: "rgba(239,68,68,0.10)", color: "var(--destructive, #ef4444)", dot: "var(--destructive, #ef4444)" };
      case "pending":
        return { bg: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", dot: "rgba(255,255,255,0.4)" };
      default:
        return { bg: "rgba(255,255,255,0.04)", color: "var(--text-tertiary)", dot: "rgba(255,255,255,0.25)" };
    }
  })();
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: styles.bg, color: styles.color }}
    >
      {status === "in_progress" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: styles.dot }} />
      )}
      {label}
    </span>
  );
}

/** Short location: "Boston, MA, United States" → "Boston, MA". Inlined to keep this component self-contained. */
function shortLocation(loc: string): string {
  const parts = loc.split(",").map((s) => s.trim());
  if (parts.length >= 3) {
    const last = parts[parts.length - 1].toLowerCase();
    if (["united states", "usa", "us", "uk", "united kingdom"].includes(last)) {
      return parts.slice(0, -1).join(", ");
    }
  }
  return loc;
}

function sourceDotColor(status: string | undefined): string {
  switch (status) {
    case "complete":
      return "var(--success, #22c55e)";
    case "in_progress":
      return "var(--info, #60a5fa)";
    case "failed":
      return "var(--destructive, #ef4444)";
    case "circuit_open":
      return "var(--warning, #f59e0b)";
    default:
      return "rgba(255,255,255,0.15)";
  }
}

export function LeadHoverPreview({ prospect }: LeadHoverPreviewProps) {
  // Null-guard per CLAUDE.md memory: list_members join can yield missing prospect data.
  // ListMember.prospect.name is non-nullable per the type, but title/company/location may be null.
  const titleLine = [prospect.title, prospect.company].filter(Boolean).join(" at ");
  const hasEmail = !!prospect.email;
  const hasPhone = !!prospect.phone;
  const hasSourceStatus = !!prospect.enrichment_source_status;

  return (
    <div className="space-y-3">
      {/* Header: avatar + name + linkedin */}
      <div className="flex items-start gap-3">
        <ProspectAvatar
          name={prospect.name}
          photoUrl={prospect.photo_url}
          email={prospect.email}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <p
              className="text-[14px] font-semibold truncate"
              style={{ color: "var(--gold-primary)" }}
            >
              {prospect.name}
            </p>
            {prospect.linkedin_url && (
              <a
                href={prospect.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
                style={{ color: "var(--text-tertiary)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {titleLine && (
            <p
              className="text-[12px] truncate mt-0.5"
              style={{ color: "var(--text-secondary, rgba(232,228,220,0.55))" }}
            >
              {titleLine}
            </p>
          )}
          {prospect.location && (
            <p
              className="text-[11px] truncate mt-0.5"
              style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
            >
              {shortLocation(prospect.location)}
            </p>
          )}
        </div>
      </div>

      {/* Status + contact-availability row */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        <StatusPill status={prospect.enrichment_status} />
        <div className="flex items-center gap-2" style={{ color: "var(--text-tertiary)" }}>
          <span
            className="inline-flex items-center gap-1 text-[11px]"
            style={{ color: hasEmail ? "var(--gold-primary)" : "var(--text-tertiary)", opacity: hasEmail ? 1 : 0.4 }}
            title={hasEmail ? "Email available" : "No email"}
          >
            <Mail className="h-3 w-3" />
            {hasEmail ? "Email" : "\u2014"}
          </span>
          <span
            className="inline-flex items-center gap-1 text-[11px]"
            style={{ color: hasPhone ? "var(--gold-primary)" : "var(--text-tertiary)", opacity: hasPhone ? 1 : 0.4 }}
            title={hasPhone ? "Phone available" : "No phone"}
          >
            <Phone className="h-3 w-3" />
            {hasPhone ? "Phone" : "\u2014"}
          </span>
        </div>
      </div>

      {/* Per-source enrichment breakdown — matches the profile page ENRICHMENT STATUS panel */}
      {hasSourceStatus && (
        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          {SOURCE_SHORT_LABELS.map(([key, label]) => {
            const status = extractStatus(prospect.enrichment_source_status?.[key]);
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px]"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary, rgba(232,228,220,0.7))",
                }}
                title={`${label}: ${status ?? "pending"}`}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: sourceDotColor(status) }}
                />
                {label}
              </span>
            );
          })}
        </div>
      )}

      {/* Footer: assignment + wealth tier */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t text-[11px]" style={{ borderColor: "var(--border-subtle)" }}>
        <span
          className="inline-flex items-center gap-1.5"
          style={{
            color: prospect.lead_owner_id ? "var(--gold-primary)" : "var(--text-tertiary, rgba(232,228,220,0.4))",
          }}
          title={prospect.lead_owner_id ? "Assigned to a team member" : "Unassigned"}
        >
          <User className="h-3 w-3" />
          {prospect.lead_owner_id ? "Assigned" : "Unassigned"}
        </span>
        <span
          className="inline-flex items-center gap-1.5"
          style={{
            color: (prospect.manual_wealth_tier ?? prospect.auto_wealth_tier) ? "var(--gold-primary)" : "var(--text-tertiary, rgba(232,228,220,0.4))",
          }}
          title={(prospect.manual_wealth_tier ?? prospect.auto_wealth_tier) ? `Wealth tier: ${prospect.manual_wealth_tier ?? prospect.auto_wealth_tier}` : "Wealth tier not set"}
        >
          <Sparkles className="h-3 w-3" />
          {prospect.manual_wealth_tier ?? prospect.auto_wealth_tier ?? "Tier —"}
        </span>
      </div>
    </div>
  );
}
