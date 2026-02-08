import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/cache/redis";

/**
 * Apollo API rate limiter - 100 calls per hour per tenant
 *
 * Usage:
 * ```ts
 * const result = await apolloRateLimiter.limit(`tenant:${tenantId}`);
 * if (!result.success) {
 *   return new Response("Rate limit exceeded", { status: 429 });
 * }
 * ```
 */
export const apolloRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 h"),
  analytics: true,
  prefix: "ratelimit:apollo",
});
