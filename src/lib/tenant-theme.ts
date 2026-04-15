// Curated per-tenant color themes — 8 pre-paired palettes
// that override --gold-* CSS variables at the layout level.

export type TenantTheme =
  | "gold"
  | "sapphire"
  | "emerald"
  | "rose"
  | "amber"
  | "slate"
  | "violet"
  | "coral";

export interface ThemeConfig {
  label: string;
  main: string;
  accent: string;
}

export const TENANT_THEMES: Record<TenantTheme, ThemeConfig> = {
  gold: { label: "Gold", main: "#d4af37", accent: "#f0d060" },
  sapphire: { label: "Sapphire", main: "#4A7BF7", accent: "#7BA3FF" },
  emerald: { label: "Emerald", main: "#34D399", accent: "#6EE7B7" },
  rose: { label: "Rose", main: "#F472B6", accent: "#FBCFE8" },
  amber: { label: "Amber", main: "#F59E0B", accent: "#FCD34D" },
  slate: { label: "Slate", main: "#94A3B8", accent: "#CBD5E1" },
  violet: { label: "Violet", main: "#8B5CF6", accent: "#C4B5FD" },
  coral: { label: "Coral", main: "#FB7185", accent: "#FDA4AF" },
};

export const DEFAULT_THEME: TenantTheme = "gold";

const THEME_KEYS = new Set<string>(Object.keys(TENANT_THEMES));

export function isValidTheme(value: string): value is TenantTheme {
  return THEME_KEYS.has(value);
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Returns "r,g,b" triplet (no alpha, no rgba() wrapper) for use with
// --gold-primary-rgb in rgba(var(--gold-primary-rgb), X) patterns.
export function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

export function getThemeCSSVariables(
  theme: TenantTheme
): Record<string, string> {
  const config = TENANT_THEMES[theme];
  return {
    "--gold-primary": config.main,
    // r,g,b triplet — consumers compose arbitrary alpha via
    // rgba(var(--gold-primary-rgb), <alpha>). This replaces 121 hardcoded
    // rgba(212,175,55, X) occurrences across feature components so tenant
    // theme swaps cascade correctly on non-gold tenants.
    "--gold-primary-rgb": hexToRgbTriplet(config.main),
    "--gold-bright": config.accent,
    "--gold-text": hexToRgba(config.main, 0.7),
    "--gold-bg": hexToRgba(config.main, 0.08),
    "--gold-bg-strong": hexToRgba(config.main, 0.15),
    "--border-gold": hexToRgba(config.main, 0.25),
  };
}
