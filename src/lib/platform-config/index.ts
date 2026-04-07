import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformConfigKey, PlatformConfigMap } from "@/types/platform-config";

/**
 * In-memory cache with 30s TTL to avoid hammering the DB on hot paths.
 * Reset on setPlatformConfig() writes.
 */
let cache: { data: Partial<PlatformConfigMap>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

async function loadAll(): Promise<Partial<PlatformConfigMap>> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_config")
    .select("key, value");

  if (error) {
    console.error("[platform-config] load failed:", error.message);
    return cache?.data ?? {};
  }

  const map: Partial<PlatformConfigMap> = {};
  for (const row of data ?? []) {
    (map as Record<string, unknown>)[row.key] = row.value;
  }
  cache = { data: map, expiresAt: Date.now() + CACHE_TTL_MS };
  return map;
}

export async function getPlatformConfig<K extends PlatformConfigKey>(
  key: K
): Promise<PlatformConfigMap[K] | undefined> {
  const all = await loadAll();
  return all[key];
}

export async function setPlatformConfig<K extends PlatformConfigKey>(
  key: K,
  value: PlatformConfigMap[K],
  updatedBy?: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_config")
    .upsert({
      key,
      value: value as unknown as object,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null,
    }, { onConflict: "key" });

  if (error) throw new Error(`platform_config upsert failed: ${error.message}`);
  cache = null; // bust cache
}

/**
 * Apollo mock mode check — consults DB first, falls back to env var.
 * DB value takes precedence so admins can flip it without a redeploy.
 */
export async function isApolloMockMode(): Promise<boolean> {
  try {
    const dbValue = await getPlatformConfig("apollo_mock_enrichment");
    if (typeof dbValue === "boolean") return dbValue;
  } catch (err) {
    console.warn("[platform-config] isApolloMockMode DB read failed, falling back to env:", err);
  }
  return process.env.APOLLO_MOCK_ENRICHMENT === "true";
}
