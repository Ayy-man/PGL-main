import "./channels/register-all"; // Side-effect: populates CHANNEL_REGISTRY

import type { ChannelId, ChannelOutput, ChannelResult, ChannelParams } from "./channels";
import { getChannel, CHANNEL_DISPLAY_NAMES } from "./channels";
import { classifyIntent, type IntentClassification } from "./intent-classifier";
import { mergeAndRank } from "./merge-results";
import { recordResearchTelemetry } from "./telemetry";

/**
 * Unified result returned by executeResearch.
 */
export type ResearchResult = {
  results: ChannelResult[];
  classification: IntentClassification;
  channelStatuses: Array<{
    channelId: ChannelId;
    displayName: string;
    resultCount: number;
    cached: boolean;
    latencyMs: number;
    error?: string;
  }>;
  totalLatencyMs: number;
};

/**
 * Input parameters for the research orchestrator.
 */
export type ResearchParams = {
  query: string;
  prospect: ChannelParams["prospect"];
  tenantId: string;
};

/**
 * Orchestrates the full multi-source search pipeline:
 * 1. Fires Exa immediately in parallel with intent classification (latency optimization)
 * 2. After classification, fans out to additional recommended channels in parallel
 * 3. Collects all results via Promise.allSettled (failed channels do not break the pipeline)
 * 4. Deduplicates and ranks results via heuristic mergeAndRank
 *
 * @returns ResearchResult with merged results, classification, and per-channel statuses
 */
export async function executeResearch(
  params: ResearchParams
): Promise<ResearchResult> {
  const startMs = Date.now();

  // Latency optimization: fire Exa immediately in parallel with intent classification.
  // Exa is always included, so there is no need to wait for the classifier to start it.
  const exaChannel = getChannel("exa");
  const exaPromise: Promise<ChannelOutput> = exaChannel
    ? exaChannel({
        query: params.query,
        prospect: params.prospect,
        tenantId: params.tenantId,
      })
    : Promise.resolve({
        channelId: "exa" as ChannelId,
        results: [],
        cached: false,
        latencyMs: 0,
        error: "Exa not registered",
      });

  const classifyPromise = classifyIntent(params.query, {
    name: params.prospect.full_name,
    company: params.prospect.company,
    title: params.prospect.title,
    publicly_traded_symbol: params.prospect.publicly_traded_symbol,
  });

  // Wait for classification (Exa continues in background)
  const classification = await classifyPromise;

  // Fan out to additional channels recommended by the classifier (excluding Exa, already started)
  const additionalChannelIds = classification.channels.filter(
    (id) => id !== "exa"
  );

  const additionalPromises: Promise<ChannelOutput>[] = additionalChannelIds.map(
    (id) => {
      const fn = getChannel(id);
      if (!fn) {
        return Promise.resolve({
          channelId: id,
          results: [],
          cached: false,
          latencyMs: 0,
          error: `Channel ${id} not registered`,
        } as ChannelOutput);
      }
      return fn({
        query: classification.reformulatedQuery,
        prospect: params.prospect,
        tenantId: params.tenantId,
      });
    }
  );

  // Collect all results — failed channels produce a rejected promise but do not
  // break the pipeline; successful channels' results are still returned.
  const settled = await Promise.allSettled([exaPromise, ...additionalPromises]);

  const allResults: ChannelResult[] = [];
  const channelStatuses: ResearchResult["channelStatuses"] = [];

  // Map settled position → channelId for error reporting
  const channelOrder: ChannelId[] = ["exa", ...additionalChannelIds];

  for (let i = 0; i < settled.length; i++) {
    const item = settled[i];
    const expectedChannelId = channelOrder[i];

    if (item.status === "fulfilled") {
      const output = item.value;
      allResults.push(...output.results);
      channelStatuses.push({
        channelId: output.channelId,
        displayName: CHANNEL_DISPLAY_NAMES[output.channelId] ?? output.channelId,
        resultCount: output.results.length,
        cached: output.cached,
        latencyMs: output.latencyMs,
        error: output.error,
      });
    } else {
      // Rejected promise — create a synthetic failure status
      channelStatuses.push({
        channelId: expectedChannelId,
        displayName:
          CHANNEL_DISPLAY_NAMES[expectedChannelId] ?? expectedChannelId,
        resultCount: 0,
        cached: false,
        latencyMs: 0,
        error:
          item.reason instanceof Error
            ? item.reason.message
            : String(item.reason),
      });
    }
  }

  const mergedResults = mergeAndRank(allResults, params.query);
  const totalLatencyMs = Date.now() - startMs;

  // Fire-and-forget telemetry
  recordResearchTelemetry({
    ts: new Date().toISOString(),
    tenantId: params.tenantId,
    prospectId: params.prospect.id,
    query: params.query,
    totalLatencyMs,
    entityType: classification.entityType,
    channelsUsed: classification.channels,
    channels: channelStatuses.map((s) => ({
      channelId: s.channelId,
      resultCount: s.resultCount,
      latencyMs: s.latencyMs,
      cached: s.cached,
      error: s.error,
    })),
  }).catch(() => {});

  return {
    results: mergedResults,
    classification,
    channelStatuses,
    totalLatencyMs,
  };
}
