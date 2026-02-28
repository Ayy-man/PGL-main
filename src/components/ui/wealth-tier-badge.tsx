import { Shield } from "lucide-react";

type WealthTier = "$500M+" | "$100M+" | "$50M+" | "$30M+" | string;

interface WealthTierBadgeProps {
  tier: WealthTier | null | undefined;
  className?: string;
}

const TIER_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  "$500M+": {
    bg: "rgba(212,175,55,0.25)",
    border: "rgba(212,175,55,0.6)",
    text: "#f0d060",
  },
  "$100M+": {
    bg: "rgba(212,175,55,0.15)",
    border: "rgba(212,175,55,0.4)",
    text: "#d4af37",
  },
  "$50M+": {
    bg: "rgba(212,175,55,0.08)",
    border: "rgba(212,175,55,0.25)",
    text: "#c4a030",
  },
  "$30M+": {
    bg: "rgba(212,175,55,0.05)",
    border: "rgba(212,175,55,0.15)",
    text: "#a08828",
  },
};

const DEFAULT_STYLE = {
  bg: "rgba(212,175,55,0.05)",
  border: "rgba(212,175,55,0.15)",
  text: "#a08828",
};

export function WealthTierBadge({ tier, className }: WealthTierBadgeProps) {
  if (!tier) return null;

  const style = TIER_STYLES[tier] ?? DEFAULT_STYLE;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${className ?? ""}`}
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
      }}
    >
      <Shield className="h-3 w-3 shrink-0" />
      {tier}
    </span>
  );
}
