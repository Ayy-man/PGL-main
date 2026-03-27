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
