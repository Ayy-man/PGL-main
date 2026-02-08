-- =====================================================
-- Phronesis Growth Labs - Initial Database Schema
-- Migration: 00001_initial_schema.sql
--
-- This migration creates the complete multi-tenant database
-- schema with RLS-enforced tenant isolation.
--
-- CRITICAL: Every table has RLS enabled. Getting RLS wrong
-- means data breaches across tenant boundaries.
-- =====================================================

-- =====================================================
-- SECTION 1: ENUMS
-- =====================================================

-- User role hierarchy: super_admin > tenant_admin > agent > assistant
CREATE TYPE user_role AS ENUM ('super_admin', 'tenant_admin', 'agent', 'assistant');

-- Enrichment pipeline status tracking
CREATE TYPE enrichment_status AS ENUM ('none', 'pending', 'in_progress', 'complete', 'failed');

-- List member lifecycle states
CREATE TYPE list_member_status AS ENUM ('new', 'contacted', 'responded', 'not_interested');

-- Activity logging action types (11 total for usage metrics)
CREATE TYPE activity_action_type AS ENUM (
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
);

-- =====================================================
-- SECTION 2: TABLES (in dependency order)
-- =====================================================

-- -----------------------------------------------------
-- Table: tenants
-- Root entity for multi-tenant architecture
-- -----------------------------------------------------
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE, -- Used in URL: /[orgId]/
  logo_url text,
  primary_color text NOT NULL DEFAULT '#d4af37', -- Gold
  secondary_color text NOT NULL DEFAULT '#f4d47f', -- Light gold
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenants IS 'Root tenant entity - real estate teams that license the platform';
COMMENT ON COLUMN tenants.slug IS 'URL-safe identifier used in routing: /[slug]/dashboard';
COMMENT ON COLUMN tenants.primary_color IS 'Tenant brand primary color for white-label theming';

-- -----------------------------------------------------
-- Table: users
-- References auth.users (Supabase Auth) and tenants
-- -----------------------------------------------------
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for super_admin
  email text NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'assistant',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS 'User profiles linked to Supabase Auth with tenant association';
COMMENT ON COLUMN users.tenant_id IS 'NULL for super_admin (cross-tenant access), set for all other roles';
COMMENT ON COLUMN users.role IS 'Determines RLS access and feature permissions';

-- -----------------------------------------------------
-- Table: personas
-- Reusable search filter combinations (persona builder)
-- -----------------------------------------------------
CREATE TABLE personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  filters jsonb NOT NULL DEFAULT '{}', -- Apollo.io filter criteria
  is_starter boolean NOT NULL DEFAULT false, -- Seeded starter personas
  created_by uuid NOT NULL REFERENCES users(id),
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE personas IS 'Reusable search filter combinations for prospect discovery';
COMMENT ON COLUMN personas.filters IS 'JSON object containing Apollo.io filter criteria';
COMMENT ON COLUMN personas.is_starter IS 'True for seeded personas (Finance Elite, Tech Execs, etc.)';

-- -----------------------------------------------------
-- Table: prospects
-- Core prospect data from Apollo.io and enrichment
-- -----------------------------------------------------
CREATE TABLE prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  apollo_id text, -- External ID from Apollo.io
  first_name text NOT NULL,
  last_name text NOT NULL,
  full_name text NOT NULL GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  title text,
  company text,
  location text,
  work_email text,
  work_phone text,
  personal_email text, -- From ContactOut enrichment
  personal_phone text, -- From ContactOut enrichment
  linkedin_url text,
  enrichment_status enrichment_status NOT NULL DEFAULT 'none',
  enriched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Uniqueness constraints: per-tenant deduplication
  CONSTRAINT unique_tenant_work_email UNIQUE(tenant_id, work_email) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT unique_tenant_linkedin UNIQUE(tenant_id, linkedin_url) DEFERRABLE INITIALLY DEFERRED
);

-- Add explicit check to allow NULL values to coexist
ALTER TABLE prospects DROP CONSTRAINT IF EXISTS unique_tenant_work_email;
ALTER TABLE prospects ADD CONSTRAINT unique_tenant_work_email
  UNIQUE NULLS NOT DISTINCT (tenant_id, work_email);

ALTER TABLE prospects DROP CONSTRAINT IF EXISTS unique_tenant_linkedin;
ALTER TABLE prospects ADD CONSTRAINT unique_tenant_linkedin
  UNIQUE NULLS NOT DISTINCT (tenant_id, linkedin_url);

COMMENT ON TABLE prospects IS 'Core prospect data from Apollo + enrichment (ContactOut, Exa, SEC)';
COMMENT ON COLUMN prospects.full_name IS 'Generated column for search/display efficiency';
COMMENT ON COLUMN prospects.enrichment_status IS 'Tracks lazy enrichment pipeline progress';

-- -----------------------------------------------------
-- Table: sec_transactions
-- Insider trading data from SEC EDGAR (Form 4)
-- -----------------------------------------------------
CREATE TABLE sec_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  security_title text NOT NULL,
  transaction_type text NOT NULL, -- Buy, Sell, Grant, etc.
  transaction_shares numeric NOT NULL,
  price_per_share numeric NOT NULL,
  transaction_value numeric NOT NULL,
  filing_url text, -- Link to SEC EDGAR filing
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE sec_transactions IS 'SEC Form 4 insider transaction data (wealth signal)';
COMMENT ON COLUMN sec_transactions.transaction_value IS 'Total transaction value (shares * price)';

-- -----------------------------------------------------
-- Table: prospect_summaries
-- AI-generated prospect summaries (Claude Haiku)
-- -----------------------------------------------------
CREATE TABLE prospect_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  summary_text text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  model_used text NOT NULL DEFAULT 'claude-3-haiku',
  token_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE prospect_summaries IS 'AI-generated "Why Recommended" summaries for prospects';
COMMENT ON COLUMN prospect_summaries.model_used IS 'Claude model used for generation (cost tracking)';

-- -----------------------------------------------------
-- Table: lists
-- Named lists for prospect organization
-- -----------------------------------------------------
CREATE TABLE lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL REFERENCES users(id),
  member_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE lists IS 'Named prospect lists for organization and outreach tracking';
COMMENT ON COLUMN lists.member_count IS 'Cached count of list_members for performance';

-- -----------------------------------------------------
-- Table: list_members
-- Junction table: lists <-> prospects with status tracking
-- -----------------------------------------------------
CREATE TABLE list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status list_member_status NOT NULL DEFAULT 'new',
  notes text,
  added_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Uniqueness: one prospect per list
  CONSTRAINT unique_list_prospect UNIQUE(list_id, prospect_id)
);

COMMENT ON TABLE list_members IS 'Junction table linking prospects to lists with status tracking';
COMMENT ON COLUMN list_members.status IS 'Outreach lifecycle: new -> contacted -> responded/not_interested';

-- -----------------------------------------------------
-- Table: activity_log
-- Audit trail for all user actions
-- -----------------------------------------------------
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  action_type activity_action_type NOT NULL,
  target_type text, -- 'prospect', 'list', 'persona', etc.
  target_id uuid,
  metadata jsonb, -- Additional context (search filters, export count, etc.)
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE activity_log IS 'Audit trail for usage metrics and activity tracking';
COMMENT ON COLUMN activity_log.metadata IS 'Flexible JSON storage for action-specific context';

-- -----------------------------------------------------
-- Table: usage_metrics_daily
-- Daily aggregated usage metrics per user
-- -----------------------------------------------------
CREATE TABLE usage_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  date date NOT NULL,
  logins integer NOT NULL DEFAULT 0,
  searches integer NOT NULL DEFAULT 0,
  profiles_viewed integer NOT NULL DEFAULT 0,
  profiles_enriched integer NOT NULL DEFAULT 0,
  csv_exports integer NOT NULL DEFAULT 0,
  lists_created integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Uniqueness: one record per user per day
  CONSTRAINT unique_tenant_user_date UNIQUE(tenant_id, user_id, date)
);

COMMENT ON TABLE usage_metrics_daily IS 'Daily aggregated usage metrics for analytics dashboard';
COMMENT ON COLUMN usage_metrics_daily.date IS 'Partition key for daily metrics aggregation';

-- =====================================================
-- SECTION 3: ROW LEVEL SECURITY (RLS)
-- CRITICAL: Enable RLS on EVERY table
-- =====================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sec_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics_daily ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECTION 4: INDEXES
-- Performance indexes on tenant_id and foreign keys
-- =====================================================

-- Tenant isolation indexes (CRITICAL for RLS performance)
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_personas_tenant_id ON personas(tenant_id);
CREATE INDEX idx_prospects_tenant_id ON prospects(tenant_id);
CREATE INDEX idx_sec_transactions_tenant_id ON sec_transactions(tenant_id);
CREATE INDEX idx_prospect_summaries_tenant_id ON prospect_summaries(tenant_id);
CREATE INDEX idx_lists_tenant_id ON lists(tenant_id);
CREATE INDEX idx_list_members_tenant_id ON list_members(tenant_id);
CREATE INDEX idx_activity_log_tenant_id ON activity_log(tenant_id);
CREATE INDEX idx_usage_metrics_daily_tenant_id ON usage_metrics_daily(tenant_id);

-- Foreign key relationship indexes
CREATE INDEX idx_personas_created_by ON personas(created_by);
CREATE INDEX idx_sec_transactions_prospect_id ON sec_transactions(prospect_id);
CREATE INDEX idx_prospect_summaries_prospect_id ON prospect_summaries(prospect_id);
CREATE INDEX idx_lists_created_by ON lists(created_by);
CREATE INDEX idx_list_members_list_id ON list_members(list_id);
CREATE INDEX idx_list_members_prospect_id ON list_members(prospect_id);
CREATE INDEX idx_list_members_added_by ON list_members(added_by);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_usage_metrics_daily_user_id ON usage_metrics_daily(user_id);

-- Query optimization indexes
CREATE INDEX idx_activity_log_action_type ON activity_log(action_type);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX idx_usage_metrics_daily_date ON usage_metrics_daily(date);
CREATE INDEX idx_prospects_enrichment_status ON prospects(enrichment_status);

-- =====================================================
-- SECTION 5: RLS POLICIES
-- Enforce tenant isolation via JWT app_metadata
-- =====================================================

-- -----------------------------------------------------
-- RLS Policies: tenants
-- Regular users can SELECT their own tenant only
-- Super admins can access all tenants
-- -----------------------------------------------------

CREATE POLICY "tenants_select_own" ON tenants
  FOR SELECT USING (
    id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY "tenants_super_admin_all" ON tenants
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  );

-- -----------------------------------------------------
-- RLS Policies: users
-- Users can SELECT their own row always
-- Users can SELECT other users in their tenant
-- Super admins can access all users
-- -----------------------------------------------------

CREATE POLICY "users_select_self" ON users
  FOR SELECT USING (
    id = auth.uid()
  );

CREATE POLICY "users_select_tenant" ON users
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY "users_super_admin_all" ON users
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  );

-- -----------------------------------------------------
-- RLS Policies: personas
-- Tenant isolation + assistant read-only enforcement
-- -----------------------------------------------------

CREATE POLICY "personas_select" ON personas
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY "personas_insert" ON personas
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text != 'assistant'
  );

CREATE POLICY "personas_update" ON personas
  FOR UPDATE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text != 'assistant'
  );

CREATE POLICY "personas_delete" ON personas
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text IN ('tenant_admin', 'super_admin')
  );

CREATE POLICY "personas_super_admin_all" ON personas
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  );

-- -----------------------------------------------------
-- RLS Policies: prospects
-- Tenant isolation + assistant read-only enforcement
-- -----------------------------------------------------

CREATE POLICY "prospects_select" ON prospects
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY "prospects_insert" ON prospects
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text != 'assistant'
  );

CREATE POLICY "prospects_update" ON prospects
  FOR UPDATE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text != 'assistant'
  );

CREATE POLICY "prospects_delete" ON prospects
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text IN ('tenant_admin', 'super_admin')
  );

CREATE POLICY "prospects_super_admin_all" ON prospects
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  );

-- -----------------------------------------------------
-- RLS Policies: sec_transactions
-- Tenant isolation + assistant read-only enforcement
-- -----------------------------------------------------

CREATE POLICY "sec_transactions_select" ON sec_transactions
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY "sec_transactions_insert" ON sec_transactions
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text != 'assistant'
  );

CREATE POLICY "sec_transactions_update" ON sec_transactions
  FOR UPDATE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text != 'assistant'
  );

CREATE POLICY "sec_transactions_delete" ON sec_transactions
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text IN ('tenant_admin', 'super_admin')
  );

CREATE POLICY "sec_transactions_super_admin_all" ON sec_transactions
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  );

-- -----------------------------------------------------
-- RLS Policies: prospect_summaries
-- Tenant isolation + assistant read-only enforcement
-- -----------------------------------------------------

CREATE POLICY "prospect_summaries_select" ON prospect_summaries
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY "prospect_summaries_insert" ON prospect_summaries
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text != 'assistant'
  );

CREATE POLICY "prospect_summaries_update" ON prospect_summaries
  FOR UPDATE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text != 'assistant'
  );

CREATE POLICY "prospect_summaries_delete" ON prospect_summaries
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text IN ('tenant_admin', 'super_admin')
  );

CREATE POLICY "prospect_summaries_super_admin_all" ON prospect_summaries
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  );

-- -----------------------------------------------------
-- RLS Policies: lists
-- Tenant isolation + assistant read-only enforcement
-- -----------------------------------------------------

CREATE POLICY "lists_select" ON lists
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY "lists_insert" ON lists
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text != 'assistant'
  );

CREATE POLICY "lists_update" ON lists
  FOR UPDATE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text != 'assistant'
  );

CREATE POLICY "lists_delete" ON lists
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text IN ('tenant_admin', 'super_admin')
  );

CREATE POLICY "lists_super_admin_all" ON lists
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  );

-- -----------------------------------------------------
-- RLS Policies: list_members
-- Tenant isolation + assistant read-only enforcement
-- -----------------------------------------------------

CREATE POLICY "list_members_select" ON list_members
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY "list_members_insert" ON list_members
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text != 'assistant'
  );

CREATE POLICY "list_members_update" ON list_members
  FOR UPDATE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text != 'assistant'
  );

CREATE POLICY "list_members_delete" ON list_members
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role')::text IN ('tenant_admin', 'super_admin')
  );

CREATE POLICY "list_members_super_admin_all" ON list_members
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  );

-- -----------------------------------------------------
-- RLS Policies: activity_log
-- Tenant isolation (read-only for all users)
-- -----------------------------------------------------

CREATE POLICY "activity_log_select" ON activity_log
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY "activity_log_insert" ON activity_log
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY "activity_log_super_admin_all" ON activity_log
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  );

-- -----------------------------------------------------
-- RLS Policies: usage_metrics_daily
-- Tenant isolation (read-only for all users)
-- -----------------------------------------------------

CREATE POLICY "usage_metrics_daily_select" ON usage_metrics_daily
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY "usage_metrics_daily_insert" ON usage_metrics_daily
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY "usage_metrics_daily_update" ON usage_metrics_daily
  FOR UPDATE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY "usage_metrics_daily_super_admin_all" ON usage_metrics_daily
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  );

-- =====================================================
-- SECTION 6: AUTH HOOK FUNCTION
-- Injects role and tenant_id into JWT app_metadata
-- =====================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_tenant_id uuid;
  user_role text;
BEGIN
  -- Fetch user role and tenant_id from public.users
  SELECT u.role::text, u.tenant_id
  INTO user_role, user_tenant_id
  FROM public.users u
  WHERE u.id = (event->>'user_id')::uuid;

  -- Get existing claims
  claims := event->'claims';

  -- Set custom claims in app_metadata
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata}',
      COALESCE(claims->'app_metadata', '{}'::jsonb) ||
      jsonb_build_object(
        'role', user_role,
        'tenant_id', user_tenant_id
      )
    );
  END IF;

  -- Return modified event
  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

COMMENT ON FUNCTION public.custom_access_token_hook IS 'Auth Hook to inject role and tenant_id into JWT app_metadata. MUST be registered in Supabase Dashboard > Authentication > Hooks to activate.';

-- Grant necessary permissions for the hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON public.users TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke function access from public/anon (security)
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- =====================================================
-- SECTION 7: HELPER FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- Function: authorize
-- Role-based authorization helper for server-side code
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.authorize(required_role user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT
      CASE
        WHEN required_role = 'assistant' THEN true
        WHEN required_role = 'agent' THEN u.role IN ('agent', 'tenant_admin', 'super_admin')
        WHEN required_role = 'tenant_admin' THEN u.role IN ('tenant_admin', 'super_admin')
        WHEN required_role = 'super_admin' THEN u.role = 'super_admin'
        ELSE false
      END
    FROM public.users u
    WHERE u.id = auth.uid()
  );
END;
$$;

COMMENT ON FUNCTION public.authorize IS 'Role-based authorization helper. Example: SELECT authorize(''tenant_admin'');';

-- =====================================================
-- SECTION 8: TRIGGERS
-- Automatic updated_at timestamp maintenance
-- =====================================================

-- Reusable trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON list_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON usage_metrics_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor or via CLI
-- 2. Register Auth Hook in Supabase Dashboard:
--    Authentication > Hooks > Custom Access Token > select public.custom_access_token_hook
-- 3. Enable Connection Pooling in Transaction mode:
--    Project Settings > Database > Connection Pooling > Enable > Transaction mode
-- =====================================================
