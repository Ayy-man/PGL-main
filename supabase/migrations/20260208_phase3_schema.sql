-- Phase 3 Database Schema
-- Activity logging, usage metrics aggregation, and enrichment data storage

-- ============================================================================
-- 1. ACTIVITY_LOG TABLE (Partitioned by created_at)
-- ============================================================================

-- Create partitioned activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'login',
    'search_executed',
    'profile_viewed',
    'profile_enriched',
    'add_to_list',
    'remove_from_list',
    'status_updated',
    'note_added',
    'csv_exported',
    'persona_created',
    'lookalike_search'
  )),
  target_type TEXT,
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions (2026-02 through 2026-06)
CREATE TABLE IF NOT EXISTS activity_log_2026_02 PARTITION OF activity_log
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE IF NOT EXISTS activity_log_2026_03 PARTITION OF activity_log
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE IF NOT EXISTS activity_log_2026_04 PARTITION OF activity_log
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE IF NOT EXISTS activity_log_2026_05 PARTITION OF activity_log
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE IF NOT EXISTS activity_log_2026_06 PARTITION OF activity_log
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- Add indexes to each partition
-- BRIN index on created_at (efficient for time-series data)
CREATE INDEX IF NOT EXISTS activity_log_2026_02_created_at_idx ON activity_log_2026_02 USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS activity_log_2026_03_created_at_idx ON activity_log_2026_03 USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS activity_log_2026_04_created_at_idx ON activity_log_2026_04 USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS activity_log_2026_05_created_at_idx ON activity_log_2026_05 USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS activity_log_2026_06_created_at_idx ON activity_log_2026_06 USING BRIN (created_at);

-- B-tree composite index on (tenant_id, action_type, created_at DESC) for filtered queries
CREATE INDEX IF NOT EXISTS activity_log_2026_02_tenant_action_idx ON activity_log_2026_02 (tenant_id, action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_2026_03_tenant_action_idx ON activity_log_2026_03 (tenant_id, action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_2026_04_tenant_action_idx ON activity_log_2026_04 (tenant_id, action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_2026_05_tenant_action_idx ON activity_log_2026_05 (tenant_id, action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_2026_06_tenant_action_idx ON activity_log_2026_06 (tenant_id, action_type, created_at DESC);

-- B-tree index on (user_id, created_at DESC) for user-specific queries
CREATE INDEX IF NOT EXISTS activity_log_2026_02_user_idx ON activity_log_2026_02 (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_2026_03_user_idx ON activity_log_2026_03 (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_2026_04_user_idx ON activity_log_2026_04 (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_2026_05_user_idx ON activity_log_2026_05 (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_2026_06_user_idx ON activity_log_2026_06 (user_id, created_at DESC);

-- GIN index on metadata JSONB for flexible queries
CREATE INDEX IF NOT EXISTS activity_log_2026_02_metadata_idx ON activity_log_2026_02 USING GIN (metadata);
CREATE INDEX IF NOT EXISTS activity_log_2026_03_metadata_idx ON activity_log_2026_03 USING GIN (metadata);
CREATE INDEX IF NOT EXISTS activity_log_2026_04_metadata_idx ON activity_log_2026_04 USING GIN (metadata);
CREATE INDEX IF NOT EXISTS activity_log_2026_05_metadata_idx ON activity_log_2026_05 USING GIN (metadata);
CREATE INDEX IF NOT EXISTS activity_log_2026_06_metadata_idx ON activity_log_2026_06 USING GIN (metadata);

-- Enable RLS on activity_log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policy: tenant isolation
CREATE POLICY activity_log_tenant_isolation ON activity_log
  FOR ALL USING (tenant_id = (current_setting('app.current_tenant_id', true))::UUID);

-- ============================================================================
-- 2. USAGE_METRICS_DAILY TABLE (Daily aggregation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  total_logins INTEGER DEFAULT 0,
  searches_executed INTEGER DEFAULT 0,
  profiles_viewed INTEGER DEFAULT 0,
  profiles_enriched INTEGER DEFAULT 0,
  csv_exports INTEGER DEFAULT 0,
  lists_created INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (date, tenant_id, user_id)
);

-- Indexes for usage_metrics_daily
CREATE INDEX IF NOT EXISTS usage_metrics_daily_tenant_date_idx ON usage_metrics_daily (tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS usage_metrics_daily_date_idx ON usage_metrics_daily (date DESC);

-- Enable RLS on usage_metrics_daily
ALTER TABLE usage_metrics_daily ENABLE ROW LEVEL SECURITY;

-- RLS policy: tenant isolation
CREATE POLICY usage_metrics_daily_tenant_isolation ON usage_metrics_daily
  FOR ALL USING (tenant_id = (current_setting('app.current_tenant_id', true))::UUID);

-- ============================================================================
-- 3. PROSPECTS TABLE ENRICHMENT COLUMNS
-- ============================================================================

-- Check if prospects table exists, if not create it with basic fields
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  location TEXT,
  work_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add enrichment columns (IF NOT EXISTS pattern for idempotency)
DO $$
BEGIN
  -- enrichment_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prospects' AND column_name = 'enrichment_status'
  ) THEN
    ALTER TABLE prospects ADD COLUMN enrichment_status TEXT DEFAULT 'pending'
      CHECK (enrichment_status IN ('pending', 'in_progress', 'complete', 'failed'));
  END IF;

  -- last_enriched_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prospects' AND column_name = 'last_enriched_at'
  ) THEN
    ALTER TABLE prospects ADD COLUMN last_enriched_at TIMESTAMPTZ;
  END IF;

  -- contact_data (ContactOut results)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prospects' AND column_name = 'contact_data'
  ) THEN
    ALTER TABLE prospects ADD COLUMN contact_data JSONB;
  END IF;

  -- web_data (Exa results)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prospects' AND column_name = 'web_data'
  ) THEN
    ALTER TABLE prospects ADD COLUMN web_data JSONB;
  END IF;

  -- insider_data (SEC EDGAR Form 4 transactions)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prospects' AND column_name = 'insider_data'
  ) THEN
    ALTER TABLE prospects ADD COLUMN insider_data JSONB;
  END IF;

  -- ai_summary (Claude-generated summary)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prospects' AND column_name = 'ai_summary'
  ) THEN
    ALTER TABLE prospects ADD COLUMN ai_summary TEXT;
  END IF;

  -- enrichment_source_status (per-source status tracking)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prospects' AND column_name = 'enrichment_source_status'
  ) THEN
    ALTER TABLE prospects ADD COLUMN enrichment_source_status JSONB DEFAULT '{}';
  END IF;
END $$;

-- Add index on enrichment_status for filtering
CREATE INDEX IF NOT EXISTS prospects_enrichment_status_idx ON prospects (enrichment_status);

-- Enable RLS on prospects (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'prospects' AND rowsecurity = true
  ) THEN
    ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'prospects' AND policyname = 'prospects_tenant_isolation'
  ) THEN
    EXECUTE 'CREATE POLICY prospects_tenant_isolation ON prospects
      FOR ALL USING (tenant_id = (current_setting(''app.current_tenant_id'', true))::UUID)';
  END IF;
END $$;
