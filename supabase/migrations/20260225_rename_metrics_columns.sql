-- Rename usage_metrics_daily columns to match Phase 3 convention
-- Initial migration used: logins, searches
-- Phase 3 migration + all TypeScript code uses: total_logins, searches_executed

ALTER TABLE usage_metrics_daily RENAME COLUMN logins TO total_logins;
ALTER TABLE usage_metrics_daily RENAME COLUMN searches TO searches_executed;
