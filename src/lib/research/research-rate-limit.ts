import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/cache/redis";

/**
 * Rate limiter for Research Scrapbook searches.
 * 100 searches per day per tenant, fixed window.
 * Key format: "research:{tenant_id}"
 *
 * Usage:
 *   const { success } = await researchRateLimiter.limit(`research:${tenantId}`);
 */
export const researchRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(100, "1 d"),
  analytics: true,
  prefix: "ratelimit:research",
});
