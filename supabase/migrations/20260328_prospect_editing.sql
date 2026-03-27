-- Phase 22: Lead Profile Editing — manual override columns + prospect_tags

-- 1. Add manual_* override columns to prospects table
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS manual_display_name text,
  ADD COLUMN IF NOT EXISTS manual_title text,
  ADD COLUMN IF NOT EXISTS manual_company text,
  ADD COLUMN IF NOT EXISTS manual_email text,
  ADD COLUMN IF NOT EXISTS manual_email_secondary text,
  ADD COLUMN IF NOT EXISTS manual_phone text,
  ADD COLUMN IF NOT EXISTS manual_phone_label text,
  ADD COLUMN IF NOT EXISTS manual_linkedin_url text,
  ADD COLUMN IF NOT EXISTS manual_city text,
  ADD COLUMN IF NOT EXISTS manual_state text,
  ADD COLUMN IF NOT EXISTS manual_country text,
  ADD COLUMN IF NOT EXISTS manual_wealth_tier text,
  ADD COLUMN IF NOT EXISTS manual_photo_url text,
  ADD COLUMN IF NOT EXISTS pinned_note text,
  ADD COLUMN IF NOT EXISTS lead_owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id) ON DELETE SET NULL;

-- 2. Create prospect_tags table
CREATE TABLE IF NOT EXISTS prospect_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tag text NOT NULL CHECK (char_length(tag) > 0 AND char_length(tag) <= 100),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS prospect_tags_prospect_tenant_tag
  ON prospect_tags (prospect_id, tenant_id, lower(tag));
CREATE INDEX IF NOT EXISTS prospect_tags_tenant_id ON prospect_tags (tenant_id);
CREATE INDEX IF NOT EXISTS prospect_tags_prospect_id ON prospect_tags (prospect_id);

ALTER TABLE prospect_tags ENABLE ROW LEVEL SECURITY;

-- 3. Create prospect_custom_fields table (table only, no UI in Phase 22)
CREATE TABLE IF NOT EXISTS prospect_custom_fields (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  field_name text NOT NULL CHECK (char_length(field_name) > 0 AND char_length(field_name) <= 100),
  field_value text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS prospect_custom_fields_unique
  ON prospect_custom_fields (prospect_id, tenant_id, lower(field_name));

ALTER TABLE prospect_custom_fields ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS policies for prospect_tags and prospect_custom_fields are configured
-- in the Supabase dashboard (per project convention), not in this migration file.
