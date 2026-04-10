-- Plan 34-01: Fix activity_log CHECK constraint
--
-- The activity_log table (and its monthly partitions) was originally created manually
-- in the Supabase dashboard with a CHECK constraint on action_type that only allowed
-- 11 values. The application now has 24 valid action types defined in
-- src/lib/activity-logger.ts, but the constraint silently rejects the 13 newer ones
-- because logActivity() catches errors and returns null.
--
-- Fix: Drop the CHECK constraint on the parent table and all known partitions.
-- Validation is handled at the application layer via the ActionType union type.
--
-- Constraint name used in Supabase auto-generated tables:
-- activity_log_action_type_check
--
-- NOTE: IF EXISTS guards make this migration safe to run multiple times.
-- Partitions that don't exist yet are silently skipped.

-- Drop constraint on parent table
ALTER TABLE activity_log
  DROP CONSTRAINT IF EXISTS activity_log_action_type_check;

-- Drop constraint on monthly partition tables (2026-02 through 2026-06)
-- These partitions were created manually alongside the parent table.
-- The partition constraint is inherited from the parent, but named per-partition.
ALTER TABLE IF EXISTS activity_log_2026_02
  DROP CONSTRAINT IF EXISTS activity_log_2026_02_action_type_check;

ALTER TABLE IF EXISTS activity_log_2026_03
  DROP CONSTRAINT IF EXISTS activity_log_2026_03_action_type_check;

ALTER TABLE IF EXISTS activity_log_2026_04
  DROP CONSTRAINT IF EXISTS activity_log_2026_04_action_type_check;

ALTER TABLE IF EXISTS activity_log_2026_05
  DROP CONSTRAINT IF EXISTS activity_log_2026_05_action_type_check;

ALTER TABLE IF EXISTS activity_log_2026_06
  DROP CONSTRAINT IF EXISTS activity_log_2026_06_action_type_check;

-- Verification: After running this migration, inserting any of the 24 action types
-- defined in src/lib/activity-logger.ts should succeed without a CHECK violation.
-- The 11 original types (login, search_executed, profile_viewed, profile_enriched,
-- add_to_list, remove_from_list, status_updated, note_added, csv_exported,
-- persona_created, lookalike_search) and the 13 newer types (tenant_created,
-- user_invited, user_invite_accepted, tenant_confirmed, tenant_renamed,
-- tenant_settings_updated, metrics_aggregated, profile_edited, tag_added,
-- tag_removed, photo_uploaded, lead_owner_assigned, issue_reported) will all
-- be accepted.
