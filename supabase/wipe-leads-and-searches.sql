-- =========================================================================
-- WIPE LEADS AND SAVED SEARCHES
-- =========================================================================
-- Deletes all prospects (leads), all lists, all saved searches, and
-- everything that cascades from them (activity, signals, tags, research,
-- custom fields, saved search refresh results).
--
-- Preserves:
--   - tenants, users, platform_config
--   - starter personas (is_starter = true)
--   - error_log, activity_log (diagnostic/audit data)
--
-- Run in the Supabase SQL editor against the PGL project. The whole
-- script is wrapped in a transaction — if the verification counts at
-- the bottom look wrong, change `COMMIT` to `ROLLBACK` before running.
-- =========================================================================

BEGIN;

-- ---------- BEFORE ----------
SELECT 'BEFORE' AS phase, 'prospects'              AS table_name, COUNT(*) FROM prospects
UNION ALL
SELECT 'BEFORE', 'lists',                          COUNT(*) FROM lists
UNION ALL
SELECT 'BEFORE', 'list_members',                   COUNT(*) FROM list_members
UNION ALL
SELECT 'BEFORE', 'saved_search_prospects',         COUNT(*) FROM saved_search_prospects
UNION ALL
SELECT 'BEFORE', 'personas (all)',                 COUNT(*) FROM personas
UNION ALL
SELECT 'BEFORE', 'personas (starter, preserved)',  COUNT(*) FROM personas WHERE is_starter = true
UNION ALL
SELECT 'BEFORE', 'personas (user, to delete)',     COUNT(*) FROM personas WHERE is_starter = false;

-- ---------- WIPE ----------
-- Single TRUNCATE handles FK dependencies between these tables via CASCADE.
-- `prospects` cascades to: prospect_activity, prospect_signals,
-- prospect_tags, prospect_custom_fields, research_sessions,
-- research_messages, research_pins. It also nulls
-- saved_search_prospects.prospect_id (ON DELETE SET NULL) but we wipe
-- that table explicitly below anyway.
TRUNCATE TABLE
  prospects,
  lists,
  list_members,
  saved_search_prospects
RESTART IDENTITY CASCADE;

-- Delete user-created saved searches but keep the seed starter personas.
-- To also wipe starters, replace this DELETE with:
--   TRUNCATE TABLE personas RESTART IDENTITY CASCADE;
DELETE FROM personas WHERE is_starter = false;

-- ---------- AFTER ----------
SELECT 'AFTER' AS phase, 'prospects'              AS table_name, COUNT(*) FROM prospects
UNION ALL
SELECT 'AFTER', 'lists',                          COUNT(*) FROM lists
UNION ALL
SELECT 'AFTER', 'list_members',                   COUNT(*) FROM list_members
UNION ALL
SELECT 'AFTER', 'saved_search_prospects',         COUNT(*) FROM saved_search_prospects
UNION ALL
SELECT 'AFTER', 'personas (all)',                 COUNT(*) FROM personas
UNION ALL
SELECT 'AFTER', 'personas (starter, preserved)',  COUNT(*) FROM personas WHERE is_starter = true;

-- If the AFTER counts look right (everything 0 except starter personas),
-- COMMIT will be executed. Otherwise change to ROLLBACK before running.
COMMIT;
