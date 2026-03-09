import { Redis } from "@upstash/redis";

/**
 * Redis client singleton using Upstash REST API.
 * Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from environment.
 * Trims whitespace/newlines from env vars to prevent Vercel build failures.
 *
 * Usage:
 * ```ts
 * import { redis } from "@/lib/cache/redis";
 * await redis.get("key");
 * ```
 */
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (!url || !token) {
      throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
    }
    _redis = new Redis({ url, token });
  }
  return _redis;
}

export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    return (getRedis() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
