-- Performance indexes based on query pattern audit
-- Targets: prospects, lists, list_members, users, usage_metrics_daily, tenants, personas

-- ============================================================
-- prospects — most queried table, zero composite indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_prospects_tenant_created
  ON prospects(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prospects_tenant_status
  ON prospects(tenant_id, enrichment_status);

-- Dedup lookups used in upsertProspect (3 sequential queries)
CREATE INDEX IF NOT EXISTS idx_prospects_work_email
  ON prospects(tenant_id, work_email) WHERE work_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_linkedin_url
  ON prospects(tenant_id, linkedin_url) WHERE linkedin_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_apollo_id
  ON prospects(tenant_id, apollo_id) WHERE apollo_id IS NOT NULL;

-- ============================================================
-- lists — queried on every page load, sorted by name or updated_at
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_lists_tenant_updated
  ON lists(tenant_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_lists_tenant_name
  ON lists(tenant_id, name ASC);

-- ============================================================
-- list_members — join table, queried by list_id and prospect_id
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_list_members_list_tenant
  ON list_members(list_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_list_members_prospect_tenant
  ON list_members(prospect_id, tenant_id);

-- ============================================================
-- users — filtered by tenant + active status
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_tenant_active
  ON users(tenant_id, is_active);

-- ============================================================
-- usage_metrics_daily — dashboard date-range queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_usage_metrics_tenant_date
  ON usage_metrics_daily(tenant_id, date DESC);

-- ============================================================
-- tenants — slug lookup in middleware on every request
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug
  ON tenants(slug);

-- ============================================================
-- personas — filtered by tenant on personas page
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_personas_tenant
  ON personas(tenant_id);

-- ============================================================
-- RPC: atomic JSONB merge for enrichment_source_status
-- Eliminates read-modify-write cycle (N+1) in enrich-prospect
-- ============================================================
CREATE OR REPLACE FUNCTION merge_enrichment_source_status(
  p_prospect_id UUID,
  p_source TEXT,
  p_payload JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE prospects
  SET enrichment_source_status = COALESCE(enrichment_source_status, '{}'::jsonb) || jsonb_build_object(p_source, p_payload)
  WHERE id = p_prospect_id;
END;
$$;
