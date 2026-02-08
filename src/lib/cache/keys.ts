import { createHash } from "crypto";
import { redis } from "./redis";

/**
 * Parameters for building tenant-scoped cache keys.
 */
export interface CacheKeyParams {
  tenantId: string;
  resource: string;
  identifier: string | object;
}

/**
 * Builds a tenant-scoped cache key with format: tenant:{tenantId}:{resource}:{identifier}
 *
 * SECURITY: All keys MUST include tenant:{tenantId}: prefix to prevent cross-tenant data leakage.
 *
 * @param params - Cache key parameters
 * @returns Tenant-scoped cache key string
 *
 * @example
 * buildCacheKey({ tenantId: "abc", resource: "persona", identifier: "123" })
 * // => "tenant:abc:persona:123"
 *
 * buildCacheKey({ tenantId: "abc", resource: "search", identifier: { query: "CEO", page: 1 } })
 * // => "tenant:abc:search:a3f2b9c..."
 */
export function buildCacheKey(params: CacheKeyParams): string {
  const { tenantId, resource, identifier } = params;

  // Hash object identifiers for deterministic keys
  let hashedIdentifier: string;
  if (typeof identifier === "string") {
    hashedIdentifier = identifier;
  } else {
    const json = JSON.stringify(identifier);
    hashedIdentifier = createHash("sha256").update(json).digest("hex");
  }

  return `tenant:${tenantId}:${resource}:${hashedIdentifier}`;
}

/**
 * Retrieves cached data for a tenant-scoped resource.
 *
 * @param params - Cache key parameters
 * @returns Cached data or null if not found
 */
export async function getCachedData<T>(
  params: CacheKeyParams
): Promise<T | null> {
  const key = buildCacheKey(params);
  return redis.get<T>(key);
}

/**
 * Stores data in cache with tenant-scoped key.
 *
 * @param params - Cache key parameters
 * @param data - Data to cache
 * @param ttl - Time to live in seconds (default: 86400 = 24 hours)
 */
export async function setCachedData<T>(
  params: CacheKeyParams,
  data: T,
  ttl: number = 86400
): Promise<void> {
  const key = buildCacheKey(params);
  await redis.set(key, JSON.stringify(data), { ex: ttl });
}

/**
 * Invalidates cached data for a tenant-scoped resource.
 *
 * @param params - Cache key parameters
 */
export async function invalidateCache(params: CacheKeyParams): Promise<void> {
  const key = buildCacheKey(params);
  await redis.del(key);
}
