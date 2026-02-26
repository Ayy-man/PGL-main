type WealthTier = "$500M+" | "$100M+" | "$50M+" | "$30M+";

const TIER_STYLES: Record<WealthTier, { bg: string; border: string; text: string }> = {
  "$500M+": { bg: "rgba(212,175,55,0.25)", border: "rgba(212,175,55,0.6)", text: "#f0d060" },
  "$100M+": { bg: "rgba(212,175,55,0.15)", border: "rgba(212,175,55,0.4)", text: "#d4af37" },
  "$50M+":  { bg: "rgba(212,175,55,0.08)", border: "rgba(212,175,55,0.25)", text: "#c4a030" },
  "$30M+":  { bg: "rgba(212,175,55,0.05)", border: "rgba(212,175,55,0.15)", text: "#a08828" },
};

export function WealthTierBadge({ tier }: { tier: WealthTier }) {
  const s = TIER_STYLES[tier];
  if (!s) return null;
  return (
    <span
      className="inline-flex items-center rounded-full text-[11px] font-semibold px-2.5 py-0.5"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      {tier}
    </span>
  );
}
