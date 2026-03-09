import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
    }
    redis = Redis.fromEnv();
  }
  return redis;
}
