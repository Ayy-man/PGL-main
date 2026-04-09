/**
 * Inngest event type definitions for Phronesis.
 *
 * These events are used to trigger background jobs for enrichment workflows
 * and scheduled aggregation tasks.
 */

export type Events = {
  /**
   * Triggered when a prospect needs enrichment from external APIs
   * (ContactOut, Exa, SEC EDGAR, Market Data, Claude AI).
   */
  "prospect/enrich.requested": {
    data: {
      prospectId: string;
      tenantId: string;
      userId: string;
      email?: string;
      linkedinUrl?: string;
      name: string;
      company: string;
      title: string;
      isPublicCompany: boolean;
      companyCik?: string;
      ticker?: string;
      /**
       * When true, bypass the duplicate-enrichment guard so we can re-run
       * enrichment for a prospect that was previously enriched with broken
       * SEC/Exa/ContactOut logic. Callers must also supply `forceRefreshKey`
       * (a unique nonce) so the Inngest idempotency guard doesn't dedupe
       * the retry as a stale duplicate.
       */
      forceRefresh?: boolean;
      /**
       * Unique nonce appended to the idempotency key when forceRefresh is
       * set. Must be unique per intentional re-run attempt.
       */
      forceRefreshKey?: string;
    };
  };

  /**
   * Triggered by scheduled cron job to aggregate daily usage metrics
   * from activity_log into usage_metrics_daily table.
   */
  "metrics/aggregate.daily": {
    data: {
      date: string; // YYYY-MM-DD format
    };
  };
};
