-- Phase 33: Tenant Issue Reporting System
-- Adds issue_reports table for in-product tenant bug/data-quality reports.
-- RLS policies are configured in the Supabase dashboard (per project convention), NOT here.
-- See .planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md for full policy spec.

-- Shared trigger function used to bump updated_at on UPDATE.
-- Defined here as CREATE OR REPLACE so re-running is idempotent; if a later
-- migration promotes this to a global helper, this definition remains safe.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Core table
CREATE TABLE issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id   UUID          REFERENCES users(id)   ON DELETE SET NULL,

  category TEXT NOT NULL CHECK (category IN (
    'incorrect_data','missing_data','bad_source','bug','other'
  )),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),

  page_url    TEXT NOT NULL,
  page_path   TEXT NOT NULL,
  user_agent  TEXT,
  viewport    JSONB,

  target_type     TEXT CHECK (target_type IN ('prospect','list','persona','search','none')),
  target_id       UUID,
  target_snapshot JSONB,

  screenshot_path TEXT,

  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open','investigating','resolved','wontfix','duplicate'
  )),
  admin_notes  TEXT,
  resolved_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at  TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_issue_reports_tenant_created ON issue_reports(tenant_id, created_at DESC);
CREATE INDEX idx_issue_reports_status_created ON issue_reports(status, created_at DESC);
CREATE INDEX idx_issue_reports_target ON issue_reports(target_type, target_id)
  WHERE target_id IS NOT NULL;

ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER issue_reports_updated_at
  BEFORE UPDATE ON issue_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS policies configured in Supabase dashboard:
-- 1. INSERT allowed where tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
-- 2. NO SELECT policy for tenants (cannot read); admin uses service-role client
-- 3. NO UPDATE / DELETE policy for tenants; admin uses service-role client
