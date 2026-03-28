/**
 * Per-channel cache helpers for multi-source search.
 *
 * Wraps the shared getCachedData/setCachedData infrastructure with
 * channel-specific TTLs and tenant-scoped cache keys.
 */

import { getCachedData, setCachedData } from "@/lib/cache/keys";
import type { ChannelOutput, ChannelId } from "./channels";
import { CHANNEL_TTLS } from "./channels";

// ─── Cache Helpers ────────────────────────────────────────────────────────────

/**
 * Retrieve a cached ChannelOutput for the given channel, query, and prospect.
 *
 * Returns null on cache miss. On cache hit, sets `cached: true` on the result.
 *
 * @param channelId - The channel to look up
 * @param query - The reformulated search query
 * @param prospectId - Prospect ID (part of cache key)
 * @param tenantId - Tenant ID for key scoping
 */
export async function getChannelCache(
  channelId: ChannelId,
  query: string,
  prospectId: string,
  tenantId: string
): Promise<ChannelOutput | null> {
  const cached = await getCachedData<ChannelOutput>({
    tenantId,
    resource: `research-channel:${channelId}`,
    identifier: { query, prospectId },
  });

  if (!cached) {
    return null;
  }

  return { ...cached, cached: true };
}

/**
 * Store a ChannelOutput in cache using the per-channel TTL from CHANNEL_TTLS.
 *
 * @param channelId - The channel that produced the output
 * @param query - The reformulated search query
 * @param prospectId - Prospect ID (part of cache key)
 * @param tenantId - Tenant ID for key scoping
 * @param output - The ChannelOutput to cache
 */
export async function setChannelCache(
  channelId: ChannelId,
  query: string,
  prospectId: string,
  tenantId: string,
  output: ChannelOutput
): Promise<void> {
  await setCachedData(
    {
      tenantId,
      resource: `research-channel:${channelId}`,
      identifier: { query, prospectId },
    },
    output,
    CHANNEL_TTLS[channelId]
  );
}
