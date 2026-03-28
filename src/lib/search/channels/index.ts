import type { SignalCategory } from "@/types/database";

/**
 * Supported channel identifiers for the multi-source search system.
 */
export type ChannelId =
  | "exa"
  | "edgar-efts"
  | "gnews"
  | "opencorporates"
  | "crunchbase"
  | "attom";

/**
 * Unified result shape returned by every channel adapter.
 */
export type ChannelResult = {
  channelId: ChannelId;
  headline: string;
  summary: string;
  source_url: string;
  source_name: string;
  event_date: string | null;
  category: SignalCategory | "news" | "corporate" | "property";
  relevance: "high" | "medium" | "low";
  raw_snippet: string;
  confidence_note?: string;
};

/**
 * Wrapper returned by each channel function.
 */
export type ChannelOutput = {
  channelId: ChannelId;
  results: ChannelResult[];
  cached: boolean;
  latencyMs: number;
  error?: string;
};

/**
 * Input parameters passed to every channel function.
 */
export type ChannelParams = {
  query: string;
  prospect: {
    id: string;
    full_name: string;
    company: string | null;
    title: string | null;
    publicly_traded_symbol: string | null;
    company_cik: string | null;
    location: string | null;
  };
  tenantId: string;
};

/**
 * Function signature all channel adapters implement.
 */
export type ChannelFn = (params: ChannelParams) => Promise<ChannelOutput>;

/**
 * Per-channel cache TTL in seconds.
 */
export const CHANNEL_TTLS: Record<ChannelId, number> = {
  exa: 3600,             // 1 hour
  gnews: 3600,           // 1 hour
  "edgar-efts": 86400,   // 24 hours
  crunchbase: 86400,     // 24 hours
  opencorporates: 86400, // 24 hours
  attom: 604800,         // 7 days
};

/**
 * Human-readable labels for UI badges.
 */
export const CHANNEL_DISPLAY_NAMES: Record<ChannelId, string> = {
  exa: "Exa",
  "edgar-efts": "SEC EDGAR",
  gnews: "GNews",
  opencorporates: "OpenCorporates",
  crunchbase: "Crunchbase",
  attom: "ATTOM Property",
};

/**
 * Mutable registry populated by channel modules at import time via registerChannel().
 */
export const CHANNEL_REGISTRY = new Map<ChannelId, ChannelFn>();

export function registerChannel(id: ChannelId, fn: ChannelFn): void {
  CHANNEL_REGISTRY.set(id, fn);
}

export function getChannel(id: ChannelId): ChannelFn | undefined {
  return CHANNEL_REGISTRY.get(id);
}
