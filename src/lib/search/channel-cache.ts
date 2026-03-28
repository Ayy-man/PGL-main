import { getCachedData, setCachedData } from "@/lib/cache/keys";
import type { ChannelOutput, ChannelId } from "./channels";
import { CHANNEL_TTLS } from "./channels";

/**
 * Retrieve cached channel output for a given query + prospect + tenant.
 * Returns null if cache miss. Sets cached: true on the returned object.
 */
export async function getChannelCache(
  channelId: ChannelId,
  query: string,
  prospectId: string,
  tenantId: string
): Promise<ChannelOutput | null> {
  const data = await getCachedData<ChannelOutput>({
    tenantId,
    resource: `research-channel:${channelId}`,
    identifier: { query, prospectId },
  });

  if (data) {
    return { ...data, cached: true };
  }

  return null;
}

/**
 * Store channel output in cache using the channel's configured TTL.
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
