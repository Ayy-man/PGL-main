import { Shield } from "lucide-react";

type WealthTier = "$500M+" | "$100M+" | "$50M+" | "$30M+" | string;

interface WealthTierBadgeProps {
  tier: WealthTier | null | undefined;
  className?: string;
}

const TIER_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  // Tier 1 ($500M+): theme-aware — uses var(--gold-*) tokens
  "$500M+": {
    bg: "var(--gold-bg-strong)",
    border: "var(--gold-primary)", // tier-1: using fully opaque gold (theme-aware), no token for 0.6 opacity
    text: "var(--gold-bright)",
  },
  // Tier 2 ($100M+): theme-aware — uses var(--gold-*) tokens
  "$100M+": {
    bg: "var(--gold-bg-strong)",
    border: "var(--border-gold)",
    text: "var(--gold-primary)",
  },
  // Tier 3 ($50M+): bespoke tier shade — intentional value-signal color, NOT theme-aware by design
  "$50M+": {
    bg: "var(--gold-bg)",
    border: "var(--border-gold)",
    text: "#c4a030", // tier-3 bespoke shade — darker gold value signal, preserved intentionally
  },
  // Tier 4 ($30M+): bespoke tier shade — intentional value-signal color, NOT theme-aware by design
  "$30M+": {
    bg: "var(--gold-bg)",
    border: "var(--border-gold)",
    text: "#a08828", // tier-4 bespoke shade — darkest gold value signal, preserved intentionally
  },
};

const DEFAULT_STYLE = {
  bg: "var(--gold-bg)",
  border: "var(--border-gold)",
  text: "#a08828", // tier-4 bespoke shade — intentional fallback matching lowest tier
};

export function WealthTierBadge({ tier, className }: WealthTierBadgeProps) {
  if (!tier) return null;

  const style = TIER_STYLES[tier] ?? DEFAULT_STYLE;

  return (
    <span
      className={`relative inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold animate-in fade-in zoom-in-95 duration-300 ${className ?? ""}`}
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
      }}
    >
      <Shield className="h-3 w-3 shrink-0" />
      {tier}
      <span
        className="absolute inset-0 rounded-[inherit] animate-pulse pointer-events-none"
        style={{
          boxShadow: `0 0 0 2px ${style.border}`,
          animationIterationCount: 1,
          animationDuration: "1s",
        }}
        aria-hidden
      />
    </span>
  );
}
