import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";

/**
 * Inngest serve endpoint for Next.js App Router.
 *
 * This endpoint allows Inngest to discover and invoke background functions.
 * Functions will be registered in later plans (04, 06).
 *
 * Exports GET, POST, PUT as required by Inngest.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Functions will be added in Plan 04 (enrichment workflow)
    // and Plan 06 (daily metrics aggregation)
  ],
});
