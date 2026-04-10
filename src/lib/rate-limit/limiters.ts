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

/**
 * SEC EDGAR rate limiter - 10 requests per second (SEC policy)
 *
 * Uses Redis-backed sliding window so the limit persists across
 * Vercel cold starts, unlike the previous in-memory approach.
 *
 * Usage:
 * ```ts
 * const result = await edgarRateLimiter.limit('sec-edgar:global');
 * if (!result.success) { /* wait or bail *\/ }
 * ```
 */
export const edgarRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 s"),
  analytics: true,
  prefix: "ratelimit:edgar",
});

/**
 * NLP parse-query rate limiter — 20 requests per minute per tenant
 *
 * Prevents cost amplification via unlimited LLM calls (H4).
 *
 * Usage:
 * ```ts
 * const { success, reset } = await parseQueryRateLimiter.limit(`tenant:${tenantId}`);
 * if (!success) {
 *   return new Response("Rate limit exceeded", { status: 429 });
 * }
 * ```
 */
export const parseQueryRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  analytics: true,
  prefix: "ratelimit:parse-query",
});
