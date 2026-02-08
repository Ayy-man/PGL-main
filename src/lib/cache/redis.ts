import { Redis } from "@upstash/redis";

/**
 * Redis client singleton using Upstash REST API.
 * Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from environment.
 *
 * Usage:
 * ```ts
 * import { redis } from "@/lib/cache/redis";
 * await redis.get("key");
 * ```
 */
const redis = Redis.fromEnv();

export { redis };
