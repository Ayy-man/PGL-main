-- Phase: Broken Actions Audit — Group A (Missing RLS Policies)
-- Adds RLS policies for activity_log and personas tables.
-- Both tables had RLS enabled but no policies defined in migrations.
-- Uses DROP IF EXISTS + CREATE for idempotency (PG < 15 compat).

-- ============================================================
-- activity_log — currently accessed only via admin client, but
-- adding policies as a safety net for future code.
-- ============================================================

DROP POLICY IF EXISTS activity_log_tenant_select ON activity_log;
CREATE POLICY activity_log_tenant_select ON activity_log
  FOR SELECT TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  );

DROP POLICY IF EXISTS activity_log_tenant_insert ON activity_log;
CREATE POLICY activity_log_tenant_insert ON activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  );

DROP POLICY IF EXISTS activity_log_super_admin ON activity_log;
CREATE POLICY activity_log_super_admin ON activity_log
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- ============================================================
-- personas — table exists (created in dashboard) but has no
-- RLS policies in migrations. Application-level .eq() checks
-- are the only current guard.
-- ============================================================

ALTER TABLE IF EXISTS personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS personas_tenant_select ON personas;
CREATE POLICY personas_tenant_select ON personas
  FOR SELECT TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  );

DROP POLICY IF EXISTS personas_tenant_insert ON personas;
CREATE POLICY personas_tenant_insert ON personas
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  );

DROP POLICY IF EXISTS personas_tenant_update ON personas;
CREATE POLICY personas_tenant_update ON personas
  FOR UPDATE TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  )
  WITH CHECK (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  );

DROP POLICY IF EXISTS personas_tenant_delete ON personas;
CREATE POLICY personas_tenant_delete ON personas
  FOR DELETE TO authenticated
  USING (
    tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND is_starter = false
  );

DROP POLICY IF EXISTS personas_super_admin ON personas;
CREATE POLICY personas_super_admin ON personas
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );
