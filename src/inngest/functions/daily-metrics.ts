import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Inngest function: Aggregate daily usage metrics
 *
 * Runs at 1 AM UTC daily via cron to aggregate the previous day's
 * activity_log entries into the usage_metrics_daily table.
 *
 * This pre-aggregation ensures fast dashboard queries and supports
 * 6-month renewal proof with usage metrics.
 *
 * Metrics aggregated:
 * - total_logins
 * - searches_executed
 * - profiles_viewed
 * - profiles_enriched
 * - csv_exports
 * - lists_created
 *
 * Uses ON CONFLICT for idempotent re-runs.
 * Covers: ANLY-01 (daily aggregation)
 */
export const aggregateDailyMetrics = inngest.createFunction(
  {
    id: "aggregate-daily-metrics",
    retries: 2,
  },
  { cron: "0 1 * * *" }, // Run at 1 AM UTC daily
  async ({ step }) => {
    // Step 1: Compute date range for yesterday
    const { startDate, endDate, dateString } = await step.run(
      "compute-date-range",
      async () => {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);

        // Start: midnight UTC of yesterday
        const start = new Date(yesterday);
        start.setUTCHours(0, 0, 0, 0);

        // End: midnight UTC of today (start of current day)
        const end = new Date(yesterday);
        end.setUTCHours(23, 59, 59, 999);

        return {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          dateString: yesterday.toISOString().split("T")[0], // YYYY-MM-DD
        };
      }
    );

    // Step 2: Aggregate metrics from activity_log into usage_metrics_daily
    const result = await step.run("aggregate-metrics", async () => {
      const supabase = createAdminClient();

      // Fetch all activity log entries for yesterday
      // We'll aggregate them in-memory and then upsert
      const { data: activities, error: fetchError } = await supabase
        .from("activity_log")
        .select("tenant_id, user_id, action_type, created_at")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (fetchError) {
        console.error("[Inngest] Failed to fetch activity logs:", fetchError);
        throw new Error(`Failed to fetch activity logs: ${fetchError.message}`);
      }

      if (!activities || activities.length === 0) {
        console.log(`[Inngest] No activities found for ${dateString}`);
        return { rowsUpserted: 0, date: dateString };
      }

      // Aggregate by (tenant_id, user_id)
      const aggregates = new Map<
        string,
        {
          date: string;
          tenant_id: string;
          user_id: string;
          total_logins: number;
          searches_executed: number;
          profiles_viewed: number;
          profiles_enriched: number;
          csv_exports: number;
          lists_created: number;
        }
      >();

      for (const activity of activities) {
        const key = `${activity.tenant_id}:${activity.user_id}`;

        if (!aggregates.has(key)) {
          aggregates.set(key, {
            date: dateString,
            tenant_id: activity.tenant_id,
            user_id: activity.user_id,
            total_logins: 0,
            searches_executed: 0,
            profiles_viewed: 0,
            profiles_enriched: 0,
            csv_exports: 0,
            lists_created: 0,
          });
        }

        const agg = aggregates.get(key)!;

        // Increment counters based on action_type
        switch (activity.action_type) {
          case "login":
            agg.total_logins++;
            break;
          case "search_executed":
            agg.searches_executed++;
            break;
          case "profile_viewed":
            agg.profiles_viewed++;
            break;
          case "profile_enriched":
            agg.profiles_enriched++;
            break;
          case "csv_exported":
            agg.csv_exports++;
            break;
          // Note: "add_to_list" adds a prospect to an existing list,
          // it does NOT create a new list. No matching metric column exists
          // for list additions, so this action is intentionally not counted.
          // "lists_created" should only be incremented for actual list creation events.
        }
      }

      // Upsert aggregated metrics
      const metricsToUpsert = Array.from(aggregates.values());

      const { error: upsertError } = await supabase
        .from("usage_metrics_daily")
        .upsert(metricsToUpsert, {
          onConflict: "date,tenant_id,user_id",
        });

      if (upsertError) {
        console.error("[Inngest] Failed to upsert metrics:", upsertError);
        throw new Error(`Failed to upsert metrics: ${upsertError.message}`);
      }

      return { rowsUpserted: metricsToUpsert.length, date: dateString };
    });

    // Step 3: Log completion
    await step.run("log-completion", async () => {
      console.log(
        `[Inngest] Daily metrics aggregated for ${result.date}: ${result.rowsUpserted} rows upserted`
      );
      return { logged: true };
    });

    return {
      aggregated: true,
      date: dateString,
      rowsUpserted: result.rowsUpserted,
    };
  }
);
