-- Phase 44: List & Saved-Search Visibility
-- D-04, D-05, D-06 locked in 44-CONTEXT.md
-- Adds per-user privacy to lists + personas via a `visibility_mode` enum + RLS policies.
-- Mirrors the RLS idiom from 20260412_rls_activity_log_personas.sql.
-- Idempotent: DROP POLICY IF EXISTS before every CREATE POLICY (Pitfall 2 — no CREATE OR REPLACE POLICY in PG).
-- JWT claim path: ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid) — MUST match 20260412 idiom exactly (Pitfall 10).
--
-- Discovery-driven scope additions (see 44-01-SUMMARY.md Deviations):
--   1. DROP NOT NULL on lists.created_by + personas.created_by so ON DELETE SET NULL works (D-04).
--   2. Drop and recreate both FKs — existing ones use NO ACTION instead of SET NULL.
--   3. Preserve is_starter = false delete guard from existing personas_tenant_delete policy (D-05).

-- ─────────────────────────────────────────────────────────────
-- 1. Enum type — duplicate_object safe
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE visibility_mode AS ENUM ('personal', 'team_shared');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Column additions — idempotent (IF EXISTS / IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS lists
  ADD COLUMN IF NOT EXISTS visibility visibility_mode NOT NULL DEFAULT 'team_shared';

-- D-04: lists.created_by must exist and be NULLABLE so ON DELETE SET NULL works (Pitfall 3).
-- Discovery Query 3 confirmed the column already exists as NOT NULL. ADD IF NOT EXISTS is a no-op;
-- the DROP NOT NULL line is required.
ALTER TABLE IF EXISTS lists
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE IF EXISTS lists
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE IF EXISTS personas
  ADD COLUMN IF NOT EXISTS visibility visibility_mode NOT NULL DEFAULT 'team_shared';

-- Discovery Query 2 confirmed personas.created_by is NOT NULL; drop the NOT NULL so the
-- reassign-to-null fallback + ON DELETE SET NULL behavior works (D-04, D-13).
ALTER TABLE IF EXISTS personas
  ALTER COLUMN created_by DROP NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 3. Foreign keys — recreate with ON DELETE SET NULL
--    Discovery Query 4 showed both FKs currently use NO ACTION; D-04 requires SET NULL.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS lists DROP CONSTRAINT IF EXISTS lists_created_by_fkey;
ALTER TABLE IF EXISTS lists
  ADD CONSTRAINT lists_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS personas DROP CONSTRAINT IF EXISTS personas_created_by_fkey;
ALTER TABLE IF EXISTS personas
  ADD CONSTRAINT personas_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────
-- 4. Indexes — idempotent
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lists_tenant_creator ON lists(tenant_id, created_by);
CREATE INDEX IF NOT EXISTS idx_personas_tenant_creator ON personas(tenant_id, created_by);

-- ─────────────────────────────────────────────────────────────
-- 5. Enable RLS — idempotent
-- ─────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saved_search_prospects ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 6. Drop pre-existing policies (enumerated from Task 1 discovery Query 1)
--    These are dashboard-authored policies that would otherwise stack on top of
--    the new visibility-aware policies and leak rows. Pitfall 1.
-- ─────────────────────────────────────────────────────────────

-- list_members (5 existing policies)
DROP POLICY IF EXISTS list_members_delete ON list_members;
DROP POLICY IF EXISTS list_members_insert ON list_members;
DROP POLICY IF EXISTS list_members_select ON list_members;
DROP POLICY IF EXISTS list_members_super_admin_all ON list_members;
DROP POLICY IF EXISTS list_members_update ON list_members;

-- lists (5 existing policies)
DROP POLICY IF EXISTS lists_delete ON lists;
DROP POLICY IF EXISTS lists_insert ON lists;
DROP POLICY IF EXISTS lists_select ON lists;
DROP POLICY IF EXISTS lists_super_admin_all ON lists;
DROP POLICY IF EXISTS lists_update ON lists;

-- personas (9 existing policies — messy: both _tenant_* and unprefixed variants)
DROP POLICY IF EXISTS personas_delete ON personas;
DROP POLICY IF EXISTS personas_insert ON personas;
DROP POLICY IF EXISTS personas_select ON personas;
DROP POLICY IF EXISTS personas_super_admin ON personas;
DROP POLICY IF EXISTS personas_super_admin_all ON personas;
DROP POLICY IF EXISTS personas_tenant_delete ON personas;
DROP POLICY IF EXISTS personas_tenant_insert ON personas;
DROP POLICY IF EXISTS personas_tenant_select ON personas;
DROP POLICY IF EXISTS personas_tenant_update ON personas;
DROP POLICY IF EXISTS personas_update ON personas;

-- saved_search_prospects (4 existing policies)
DROP POLICY IF EXISTS ssp_delete ON saved_search_prospects;
DROP POLICY IF EXISTS ssp_insert ON saved_search_prospects;
DROP POLICY IF EXISTS ssp_select ON saved_search_prospects;
DROP POLICY IF EXISTS ssp_update ON saved_search_prospects;

-- ─────────────────────────────────────────────────────────────
-- 7. lists RLS policies (D-05) — visibility-aware
-- ─────────────────────────────────────────────────────────────
CREATE POLICY lists_select ON lists
  FOR SELECT TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (
         visibility = 'team_shared'
      OR created_by = auth.uid()
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
    )
  );

CREATE POLICY lists_insert ON lists
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND created_by = auth.uid()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') <> 'assistant'
  );

CREATE POLICY lists_update ON lists
  FOR UPDATE TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (
         visibility = 'team_shared'
      OR created_by = auth.uid()
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  );

CREATE POLICY lists_delete ON lists
  FOR DELETE TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (
         created_by = auth.uid()
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
    )
  );

CREATE POLICY lists_super_admin_all ON lists
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- ─────────────────────────────────────────────────────────────
-- 8. list_members RLS policies (D-06) — EXISTS-on-parent defers to list visibility
-- ─────────────────────────────────────────────────────────────
CREATE POLICY list_members_select ON list_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists l
      WHERE l.id = list_members.list_id
        AND l.tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
        AND (
             l.visibility = 'team_shared'
          OR l.created_by = auth.uid()
          OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
        )
    )
  );

CREATE POLICY list_members_insert ON list_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists l
      WHERE l.id = list_members.list_id
        AND l.tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
        AND (
             l.visibility = 'team_shared'
          OR l.created_by = auth.uid()
          OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
        )
    )
    AND (auth.jwt() -> 'app_metadata' ->> 'role') <> 'assistant'
  );

CREATE POLICY list_members_update ON list_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists l
      WHERE l.id = list_members.list_id
        AND l.tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
        AND (
             l.visibility = 'team_shared'
          OR l.created_by = auth.uid()
          OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
        )
    )
    AND (auth.jwt() -> 'app_metadata' ->> 'role') <> 'assistant'
  );

CREATE POLICY list_members_delete ON list_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists l
      WHERE l.id = list_members.list_id
        AND l.tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
        AND (
             l.created_by = auth.uid()
          OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
        )
    )
  );

CREATE POLICY list_members_super_admin_all ON list_members
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- ─────────────────────────────────────────────────────────────
-- 9. personas RLS policies (D-05) — visibility-aware + preserve is_starter=false delete guard
-- ─────────────────────────────────────────────────────────────
CREATE POLICY personas_select ON personas
  FOR SELECT TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (
         visibility = 'team_shared'
      OR created_by = auth.uid()
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
    )
  );

CREATE POLICY personas_insert ON personas
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND created_by = auth.uid()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') <> 'assistant'
  );

CREATE POLICY personas_update ON personas
  FOR UPDATE TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (
         visibility = 'team_shared'
      OR created_by = auth.uid()
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  );

-- Preserve is_starter = false guard from existing personas_tenant_delete (D-05)
CREATE POLICY personas_delete ON personas
  FOR DELETE TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND is_starter = false
    AND (
         created_by = auth.uid()
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
    )
  );

CREATE POLICY personas_super_admin_all ON personas
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- ─────────────────────────────────────────────────────────────
-- 10. saved_search_prospects RLS policies (D-06) — EXISTS-on-parent personas
--     Parent FK column is `saved_search_id` per 20260405 migration (NOT persona_id).
-- ─────────────────────────────────────────────────────────────
CREATE POLICY ssp_select ON saved_search_prospects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personas p
      WHERE p.id = saved_search_prospects.saved_search_id
        AND p.tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
        AND (
             p.visibility = 'team_shared'
          OR p.created_by = auth.uid()
          OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
        )
    )
  );

CREATE POLICY ssp_insert ON saved_search_prospects
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personas p
      WHERE p.id = saved_search_prospects.saved_search_id
        AND p.tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
        AND (
             p.visibility = 'team_shared'
          OR p.created_by = auth.uid()
          OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
        )
    )
  );

CREATE POLICY ssp_update ON saved_search_prospects
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personas p
      WHERE p.id = saved_search_prospects.saved_search_id
        AND p.tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
        AND (
             p.visibility = 'team_shared'
          OR p.created_by = auth.uid()
          OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personas p
      WHERE p.id = saved_search_prospects.saved_search_id
        AND p.tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    )
  );

CREATE POLICY ssp_delete ON saved_search_prospects
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personas p
      WHERE p.id = saved_search_prospects.saved_search_id
        AND p.tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
        AND (
             p.created_by = auth.uid()
          OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('tenant_admin', 'super_admin')
        )
    )
  );
