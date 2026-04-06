-- Quick task 260407-02n: activity_log table migration
-- Creates the activity_log table if it doesn't already exist.
-- The table was originally created manually in Supabase dashboard; this migration
-- documents it formally so the schema is version-controlled and reproducible.
-- Uses CREATE TABLE IF NOT EXISTS so it is safe to run against an existing DB.

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_tenant ON activity_log (tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log (tenant_id, action_type);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
-- NOTE: RLS policies configured in Supabase dashboard per project convention
