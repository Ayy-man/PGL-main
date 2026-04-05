-- Phase 28: Saved Search Incremental Refresh — join table + personas columns

-- New join table: tracks which Apollo prospects belong to which saved search
CREATE TABLE IF NOT EXISTS saved_search_prospects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  saved_search_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  apollo_person_id TEXT NOT NULL,
  apollo_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'enriched')),
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID,
  is_new BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_search_prospect UNIQUE (saved_search_id, apollo_person_id)
);

CREATE INDEX IF NOT EXISTS idx_ssp_search_id ON saved_search_prospects(saved_search_id);
CREATE INDEX IF NOT EXISTS idx_ssp_search_status ON saved_search_prospects(saved_search_id, status);
CREATE INDEX IF NOT EXISTS idx_ssp_apollo_id ON saved_search_prospects(apollo_person_id);
CREATE INDEX IF NOT EXISTS idx_ssp_tenant_id ON saved_search_prospects(tenant_id);

ALTER TABLE saved_search_prospects ENABLE ROW LEVEL SECURITY;
-- NOTE: RLS policies configured in Supabase dashboard per project convention
-- Required policies:
--   SELECT: tenant_id = auth.jwt() ->> 'tenant_id'
--   INSERT (WITH CHECK): tenant_id = auth.jwt() ->> 'tenant_id'
--   UPDATE (USING + WITH CHECK): tenant_id = auth.jwt() ->> 'tenant_id'
--   DELETE (USING): tenant_id = auth.jwt() ->> 'tenant_id'

-- Add refresh tracking columns to personas table
ALTER TABLE personas ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS total_apollo_results INTEGER;
