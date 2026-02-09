import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { enrichProspect } from "@/inngest/functions/enrich-prospect";
import { aggregateDailyMetrics } from "@/inngest/functions/daily-metrics";

/**
 * Inngest serve endpoint for Next.js App Router.
 *
 * This endpoint allows Inngest to discover and invoke background functions.
 *
 * Registered functions:
 * - enrichProspect (Plan 04): Multi-step enrichment workflow
 * - aggregateDailyMetrics (Plan 06): Daily usage metrics aggregation
 *
 * Exports GET, POST, PUT as required by Inngest.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    enrichProspect,
    aggregateDailyMetrics,
  ],
});
