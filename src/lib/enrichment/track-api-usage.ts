import { redis } from "@/lib/cache/redis";

/**
 * Increment daily API usage counter for a provider.
 * Fire-and-forget — never throws, never blocks the caller.
 * Key pattern: api_usage:{provider}:{YYYY-MM-DD}
 * TTL: 90 days
 */
export async function trackApiUsage(
  provider: "apollo" | "contactout" | "exa" | "edgar" | "claude"
): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = `api_usage:${provider}:${today}`;
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 60 * 60 * 24 * 90); // 90-day TTL
    await pipeline.exec();
  } catch {
    // Non-critical — quota tracking must never block or throw
  }
}
