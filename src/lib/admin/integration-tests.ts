import { redis } from "@/lib/cache/redis";
import { createAdminClient } from "@/lib/supabase/admin";
import type { IntegrationId } from "@/types/admin-api-keys";

export interface IntegrationTestResult {
  id: IntegrationId;
  ok: boolean;
  latencyMs: number;
  status: number | null; // HTTP status when applicable
  error?: string;
  skipped?: boolean;
  detail?: string; // short human-readable hint (e.g. "PONG", "1 model listed")
}

const TIMEOUT_MS = 10_000;

async function fetchWithTimeout(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Per-integration probes ----------

async function testApollo(): Promise<Partial<IntegrationTestResult>> {
  const key = process.env.APOLLO_API_KEY;
  if (!key) return { ok: false, error: "APOLLO_API_KEY missing", status: null };

  const res = await fetchWithTimeout(
    "https://api.apollo.io/api/v1/mixed_people/api_search",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": key,
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({ per_page: 1, page: 1 }),
    }
  );
  return {
    ok: res.ok,
    status: res.status,
    error: res.ok ? undefined : `HTTP ${res.status}`,
    detail: res.ok ? "search endpoint reachable (0 credits)" : undefined,
  };
}

async function testContactOut(): Promise<Partial<IntegrationTestResult>> {
  // Sandbox key is known-broken; do not make real calls.
  return {
    ok: false,
    skipped: true,
    status: null,
    error:
      "Sandbox key — test not supported. Contact sales for production access.",
  };
}

async function testExa(): Promise<Partial<IntegrationTestResult>> {
  const key = process.env.EXA_API_KEY;
  if (!key) return { ok: false, error: "EXA_API_KEY missing", status: null };

  const res = await fetchWithTimeout("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({ query: "test", numResults: 1 }),
  });
  return {
    ok: res.ok,
    status: res.status,
    error: res.ok ? undefined : `HTTP ${res.status}`,
    detail: res.ok ? "search endpoint reachable" : undefined,
  };
}

async function testSecEdgar(): Promise<Partial<IntegrationTestResult>> {
  const ua = process.env.SEC_EDGAR_USER_AGENT;
  if (!ua)
    return { ok: false, error: "SEC_EDGAR_USER_AGENT missing", status: null };

  // HEAD the tickers file — cheap, no rate-limit concerns at 1 call
  const res = await fetchWithTimeout(
    "https://www.sec.gov/files/company_tickers.json",
    {
      method: "HEAD",
      headers: { "User-Agent": ua },
    }
  );
  return {
    ok: res.ok,
    status: res.status,
    error: res.ok ? undefined : `HTTP ${res.status}`,
    detail: res.ok ? "tickers endpoint reachable" : undefined,
  };
}

async function testFinnhub(): Promise<Partial<IntegrationTestResult>> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return { ok: false, error: "FINNHUB_API_KEY missing", status: null };

  const res = await fetchWithTimeout(
    `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${encodeURIComponent(key)}`
  );
  if (!res.ok) {
    return { ok: false, status: res.status, error: `HTTP ${res.status}` };
  }
  const data = (await res.json().catch(() => null)) as { c?: number } | null;
  const hasQuote = typeof data?.c === "number";
  return {
    ok: hasQuote,
    status: res.status,
    detail: hasQuote ? `AAPL quote returned (c=${data!.c})` : undefined,
    error: hasQuote ? undefined : "Malformed response",
  };
}

async function testOpenRouter(): Promise<Partial<IntegrationTestResult>> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key)
    return { ok: false, error: "OPENROUTER_API_KEY missing", status: null };

  const res = await fetchWithTimeout("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok)
    return { ok: false, status: res.status, error: `HTTP ${res.status}` };
  const data = (await res.json().catch(() => null)) as {
    data?: unknown[];
  } | null;
  const count = Array.isArray(data?.data) ? data!.data!.length : 0;
  return {
    ok: count > 0,
    status: res.status,
    detail: `${count} models listed`,
  };
}

async function testInngest(): Promise<Partial<IntegrationTestResult>> {
  return {
    ok: false,
    skipped: true,
    status: null,
    error:
      "No cheap health endpoint — check /admin/automations for function runs.",
  };
}

async function testSupabase(): Promise<Partial<IntegrationTestResult>> {
  const start = Date.now();
  try {
    const admin = createAdminClient();
    // Lightweight read — table was created in Plan 30-01
    const { error } = await admin
      .from("platform_config")
      .select("key")
      .limit(1);
    if (error) return { ok: false, status: null, error: error.message };
    return {
      ok: true,
      status: 200,
      detail: `select returned in ${Date.now() - start}ms`,
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function testUpstashRedis(): Promise<Partial<IntegrationTestResult>> {
  try {
    const pong = await redis.ping();
    return {
      ok: pong === "PONG",
      status: 200,
      detail: String(pong),
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------- Dispatcher ----------

const PROBES: Record<
  IntegrationId,
  () => Promise<Partial<IntegrationTestResult>>
> = {
  apollo: testApollo,
  contactout: testContactOut,
  exa: testExa,
  sec_edgar: testSecEdgar,
  finnhub: testFinnhub,
  openrouter: testOpenRouter,
  inngest: testInngest,
  supabase: testSupabase,
  upstash_redis: testUpstashRedis,
};

export async function runIntegrationTest(
  id: IntegrationId
): Promise<IntegrationTestResult> {
  const probe = PROBES[id];
  if (!probe) {
    return {
      id,
      ok: false,
      latencyMs: 0,
      status: null,
      error: `Unknown integration: ${id}`,
    };
  }

  const start = Date.now();
  try {
    const partial = await probe();
    return {
      id,
      ok: partial.ok ?? false,
      latencyMs: Date.now() - start,
      status: partial.status ?? null,
      error: partial.error,
      skipped: partial.skipped,
      detail: partial.detail,
    };
  } catch (err) {
    return {
      id,
      ok: false,
      latencyMs: Date.now() - start,
      status: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
