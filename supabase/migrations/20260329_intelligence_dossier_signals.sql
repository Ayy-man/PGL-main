-- Phase 23: Intelligence Dossier & Wealth Signal Timeline — new tables + prospect column additions

-- 1. Add columns to prospects table
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS intelligence_dossier jsonb,
  ADD COLUMN IF NOT EXISTS dossier_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS dossier_model text;

-- 2. Create prospect_signals table
CREATE TABLE IF NOT EXISTS prospect_signals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category text NOT NULL,
  headline text NOT NULL,
  summary text NOT NULL,
  source_url text,
  event_date date,
  raw_source text NOT NULL,
  is_new boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Create indexes on prospect_signals
CREATE UNIQUE INDEX IF NOT EXISTS prospect_signals_exa_dedup
  ON prospect_signals (prospect_id, source_url)
  WHERE source_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS prospect_signals_prospect_tenant
  ON prospect_signals (prospect_id, tenant_id, created_at DESC);

-- 4. Enable RLS on prospect_signals
ALTER TABLE prospect_signals ENABLE ROW LEVEL SECURITY;
-- NOTE: RLS policy configured in Supabase dashboard per project convention

-- 5. Create signal_views table
CREATE TABLE IF NOT EXISTS signal_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id uuid NOT NULL REFERENCES prospect_signals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now() NOT NULL
);

-- 6. Create indexes on signal_views
CREATE UNIQUE INDEX IF NOT EXISTS signal_views_user_signal
  ON signal_views (user_id, signal_id);

CREATE INDEX IF NOT EXISTS signal_views_user_tenant
  ON signal_views (user_id, tenant_id);

-- 7. Enable RLS on signal_views
ALTER TABLE signal_views ENABLE ROW LEVEL SECURITY;
-- NOTE: RLS policy configured in Supabase dashboard per project convention
