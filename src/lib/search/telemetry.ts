import { redis } from "@/lib/cache/redis";
import type { ChannelId } from "./channels";
import type { IntentClassification } from "./intent-classifier";

// ---------------------------------------------------------------------------
// Research telemetry — granular per-query stats stored in Redis
// ---------------------------------------------------------------------------

/** Telemetry event recorded after each executeResearch call */
export interface ResearchTelemetryEvent {
  /** ISO timestamp */
  ts: string;
  tenantId: string;
  prospectId: string;
  query: string;
  /** Total pipeline latency ms */
  totalLatencyMs: number;
  /** Intent classification result */
  entityType: IntentClassification["entityType"];
  channelsUsed: ChannelId[];
  /** Per-channel breakdown */
  channels: Array<{
    channelId: ChannelId;
    resultCount: number;
    latencyMs: number;
    cached: boolean;
    error?: string;
  }>;
}

// Redis key patterns:
//   research:telemetry:events:{YYYY-MM-DD}  — list of JSON events (TTL 90 days)
//   research:telemetry:daily:{YYYY-MM-DD}   — hash of daily rollup counters

const TTL_DAYS = 90;
const TTL_SECONDS = TTL_DAYS * 24 * 60 * 60;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Record a telemetry event after a research query completes.
 * Fire-and-forget — never throws, never blocks the caller.
 */
export async function recordResearchTelemetry(
  event: ResearchTelemetryEvent
): Promise<void> {
  try {
    const day = todayKey();
    const eventsKey = `research:telemetry:events:${day}`;
    const dailyKey = `research:telemetry:daily:${day}`;

    const pipeline = redis.pipeline();

    // Append event to daily list
    pipeline.rpush(eventsKey, JSON.stringify(event));
    pipeline.expire(eventsKey, TTL_SECONDS);

    // Increment daily rollup counters
    pipeline.hincrby(dailyKey, "total_queries", 1);
    pipeline.hincrby(dailyKey, "total_latency_ms", event.totalLatencyMs);
    pipeline.hincrby(dailyKey, `entity:${event.entityType}`, 1);

    for (const ch of event.channels) {
      pipeline.hincrby(dailyKey, `ch:${ch.channelId}:queries`, 1);
      pipeline.hincrby(dailyKey, `ch:${ch.channelId}:results`, ch.resultCount);
      pipeline.hincrby(dailyKey, `ch:${ch.channelId}:latency_ms`, ch.latencyMs);
      if (ch.cached) {
        pipeline.hincrby(dailyKey, `ch:${ch.channelId}:cache_hits`, 1);
      }
      if (ch.error) {
        pipeline.hincrby(dailyKey, `ch:${ch.channelId}:errors`, 1);
      }
    }

    pipeline.expire(dailyKey, TTL_SECONDS);
    await pipeline.exec();
  } catch {
    // Non-critical — telemetry must never block or throw
  }
}

// ---------------------------------------------------------------------------
// Aggregation — read daily rollups for the admin stats endpoint
// ---------------------------------------------------------------------------

export interface DailyResearchStats {
  date: string;
  totalQueries: number;
  avgLatencyMs: number;
  entityBreakdown: Record<string, number>;
  channels: Record<
    string,
    {
      queries: number;
      results: number;
      avgLatencyMs: number;
      cacheHitRate: number;
      errorCount: number;
    }
  >;
}

/**
 * Read aggregated research stats for the last N days.
 */
export async function getResearchStats(
  days: number = 14
): Promise<{
  daily: DailyResearchStats[];
  totals: {
    totalQueries: number;
    avgLatencyMs: number;
    totalResults: number;
    cacheHitRate: number;
    errorRate: number;
    entityBreakdown: Record<string, number>;
    channelBreakdown: Record<
      string,
      {
        queries: number;
        results: number;
        avgLatencyMs: number;
        cacheHitRate: number;
        errorCount: number;
      }
    >;
  };
}> {
  const today = new Date();
  const dayKeys: string[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }

  // Fetch all daily hashes in parallel
  const pipeline = redis.pipeline();
  for (const day of dayKeys) {
    pipeline.hgetall(`research:telemetry:daily:${day}`);
  }
  const results = await pipeline.exec();

  const knownChannels: ChannelId[] = ["exa", "edgar-efts"];
  const entityTypes = ["person", "company", "property", "general"];

  const daily: DailyResearchStats[] = [];

  // Accumulators for totals
  let grandTotalQueries = 0;
  let grandTotalLatency = 0;
  let grandTotalResults = 0;
  let grandTotalCacheHits = 0;
  let grandTotalChannelQueries = 0;
  let grandTotalErrors = 0;
  const grandEntityBreakdown: Record<string, number> = {};
  const grandChannelBreakdown: Record<string, { queries: number; results: number; latency: number; cacheHits: number; errors: number }> = {};

  for (let i = 0; i < dayKeys.length; i++) {
    const hash = (results[i] as Record<string, string> | null) ?? {};
    const date = dayKeys[i];

    const totalQueries = parseInt(hash["total_queries"] ?? "0", 10);
    const totalLatency = parseInt(hash["total_latency_ms"] ?? "0", 10);
    const avgLatency = totalQueries > 0 ? Math.round(totalLatency / totalQueries) : 0;

    const entityBreakdown: Record<string, number> = {};
    for (const et of entityTypes) {
      const val = parseInt(hash[`entity:${et}`] ?? "0", 10);
      if (val > 0) entityBreakdown[et] = val;
    }

    const channels: DailyResearchStats["channels"] = {};
    for (const ch of knownChannels) {
      const chQueries = parseInt(hash[`ch:${ch}:queries`] ?? "0", 10);
      const chResults = parseInt(hash[`ch:${ch}:results`] ?? "0", 10);
      const chLatency = parseInt(hash[`ch:${ch}:latency_ms`] ?? "0", 10);
      const chCacheHits = parseInt(hash[`ch:${ch}:cache_hits`] ?? "0", 10);
      const chErrors = parseInt(hash[`ch:${ch}:errors`] ?? "0", 10);

      if (chQueries > 0) {
        channels[ch] = {
          queries: chQueries,
          results: chResults,
          avgLatencyMs: Math.round(chLatency / chQueries),
          cacheHitRate: Math.round((chCacheHits / chQueries) * 100),
          errorCount: chErrors,
        };

        // Accumulate totals
        if (!grandChannelBreakdown[ch]) {
          grandChannelBreakdown[ch] = { queries: 0, results: 0, latency: 0, cacheHits: 0, errors: 0 };
        }
        grandChannelBreakdown[ch].queries += chQueries;
        grandChannelBreakdown[ch].results += chResults;
        grandChannelBreakdown[ch].latency += chLatency;
        grandChannelBreakdown[ch].cacheHits += chCacheHits;
        grandChannelBreakdown[ch].errors += chErrors;

        grandTotalResults += chResults;
        grandTotalCacheHits += chCacheHits;
        grandTotalChannelQueries += chQueries;
        grandTotalErrors += chErrors;
      }
    }

    daily.push({ date, totalQueries, avgLatencyMs: avgLatency, entityBreakdown, channels });

    grandTotalQueries += totalQueries;
    grandTotalLatency += totalLatency;
    for (const [k, v] of Object.entries(entityBreakdown)) {
      grandEntityBreakdown[k] = (grandEntityBreakdown[k] ?? 0) + v;
    }
  }

  const channelBreakdown: Record<string, { queries: number; results: number; avgLatencyMs: number; cacheHitRate: number; errorCount: number }> = {};
  for (const [ch, acc] of Object.entries(grandChannelBreakdown)) {
    channelBreakdown[ch] = {
      queries: acc.queries,
      results: acc.results,
      avgLatencyMs: acc.queries > 0 ? Math.round(acc.latency / acc.queries) : 0,
      cacheHitRate: acc.queries > 0 ? Math.round((acc.cacheHits / acc.queries) * 100) : 0,
      errorCount: acc.errors,
    };
  }

  return {
    daily,
    totals: {
      totalQueries: grandTotalQueries,
      avgLatencyMs: grandTotalQueries > 0 ? Math.round(grandTotalLatency / grandTotalQueries) : 0,
      totalResults: grandTotalResults,
      cacheHitRate: grandTotalChannelQueries > 0 ? Math.round((grandTotalCacheHits / grandTotalChannelQueries) * 100) : 0,
      errorRate: grandTotalChannelQueries > 0 ? Math.round((grandTotalErrors / grandTotalChannelQueries) * 100) : 0,
      entityBreakdown: grandEntityBreakdown,
      channelBreakdown,
    },
  };
}
