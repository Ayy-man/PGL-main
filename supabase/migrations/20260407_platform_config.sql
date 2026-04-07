-- Phase 30: Platform-wide runtime configuration table
-- Key/value store for feature flags that need to flip without a redeploy.
-- Super-admin write-only (RLS configured in Supabase dashboard).

CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
-- NOTE: RLS policies configured in Supabase dashboard per project convention
-- Required policies:
--   SELECT: auth.jwt() ->> 'role' = 'super_admin'
--   INSERT/UPDATE/DELETE: auth.jwt() ->> 'role' = 'super_admin'

-- Seed the Apollo mock mode flag with default value (false)
INSERT INTO platform_config (key, value, description)
VALUES (
  'apollo_mock_enrichment',
  'false'::jsonb,
  'When true, Apollo bulk-enrich returns fake data and does NOT consume credits.'
)
ON CONFLICT (key) DO NOTHING;
