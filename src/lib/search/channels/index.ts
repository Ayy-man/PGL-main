/**
 * Channel type contracts, registry, and constants for multi-source search.
 *
 * All channel implementations must conform to the types defined here.
 * Channels self-register via registerChannel() at module import time.
 */

import type { SignalCategory } from "@/types/database";

// ─── Channel Identifiers ────────────────────────────────────────────────────

/** Union of all supported search channel IDs */
export type ChannelId =
  | "exa"
  | "edgar-efts"
  | "gnews"
  | "opencorporates"
  | "crunchbase"
  | "attom";

// ─── Core Types ──────────────────────────────────────────────────────────────

/**
 * Unified result shape returned by every channel.
 * All channels must normalize their raw API responses into this shape.
 */
export type ChannelResult = {
  channelId: ChannelId;
  headline: string;
  summary: string;
  source_url: string;
  source_name: string; // e.g. "GNews", "SEC EDGAR", "Crunchbase"
  event_date: string | null; // ISO date string
  category: SignalCategory | "news" | "corporate" | "property";
  relevance: "high" | "medium" | "low";
  raw_snippet: string;
  confidence_note?: string;
};

/**
 * Wrapper returned by each channel function.
 * Includes timing, cache status, and error info alongside results.
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
 * Contains the reformulated query, prospect context, and tenant ID.
 */
export type ChannelParams = {
  query: string; // reformulated query from classifier
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
 * Function signature all channel implementations must satisfy.
 */
export type ChannelFn = (params: ChannelParams) => Promise<ChannelOutput>;

// ─── Per-Channel Cache TTLs ──────────────────────────────────────────────────

/**
 * Cache TTL in seconds for each channel.
 * News channels refresh hourly; regulatory/property data is stable for days.
 */
export const CHANNEL_TTLS: Record<ChannelId, number> = {
  exa: 3600, // 1 hour
  gnews: 3600, // 1 hour
  "edgar-efts": 86400, // 24 hours
  crunchbase: 86400, // 24 hours
  opencorporates: 86400, // 24 hours
  attom: 604800, // 7 days
};

// ─── Human-Readable Display Names ────────────────────────────────────────────

/**
 * Display labels used in UI badges and source attributions.
 */
export const CHANNEL_DISPLAY_NAMES: Record<ChannelId, string> = {
  exa: "Exa",
  "edgar-efts": "SEC EDGAR",
  gnews: "GNews",
  opencorporates: "OpenCorporates",
  crunchbase: "Crunchbase",
  attom: "ATTOM Property",
};

// ─── Channel Registry ─────────────────────────────────────────────────────────

/**
 * Mutable map of channel ID to channel function.
 * Channel modules self-register by calling registerChannel() at import time.
 */
export const CHANNEL_REGISTRY = new Map<ChannelId, ChannelFn>();

/**
 * Register a channel implementation.
 * Call this at the top level of each channel module so it's wired at import time.
 */
export function registerChannel(id: ChannelId, fn: ChannelFn): void {
  CHANNEL_REGISTRY.set(id, fn);
}

/**
 * Retrieve a registered channel function by ID.
 * Returns undefined if the channel is not registered.
 */
export function getChannel(id: ChannelId): ChannelFn | undefined {
  return CHANNEL_REGISTRY.get(id);
}
