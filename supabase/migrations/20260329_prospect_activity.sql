-- Phase 24: Activity Log Full Build — prospect_activity table

-- 1. CREATE TABLE prospect_activity
CREATE TABLE IF NOT EXISTS prospect_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- nullable for system events
  category TEXT NOT NULL CHECK (category IN ('outreach', 'data', 'team', 'custom')),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  metadata JSONB DEFAULT '{}',
  event_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- when it happened (allows backdating)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  triggers_status_change BOOLEAN DEFAULT false
);

-- 2. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_prospect_activity_prospect_event
  ON prospect_activity (prospect_id, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_prospect_activity_tenant
  ON prospect_activity (tenant_id);

CREATE INDEX IF NOT EXISTS idx_prospect_activity_prospect_category
  ON prospect_activity (prospect_id, category);

-- 3. ENABLE RLS
ALTER TABLE prospect_activity ENABLE ROW LEVEL SECURITY;
-- NOTE: RLS policies are configured in the Supabase dashboard (per project convention)

-- 4. MIGRATE existing activity_log data into prospect_activity
-- Only migrate rows where target_type='prospect' and target_id is a valid UUID
INSERT INTO prospect_activity (
  prospect_id,
  tenant_id,
  user_id,
  category,
  event_type,
  title,
  metadata,
  event_at,
  created_at,
  triggers_status_change
)
SELECT
  al.target_id::uuid AS prospect_id,
  al.tenant_id,
  al.user_id,
  CASE al.action_type
    WHEN 'profile_enriched' THEN 'data'
    ELSE 'team'
  END AS category,
  CASE al.action_type
    WHEN 'profile_viewed'       THEN 'profile_viewed'
    WHEN 'profile_enriched'     THEN 'enrichment_complete'
    WHEN 'note_added'           THEN 'note_added'
    WHEN 'add_to_list'          THEN 'added_to_list'
    WHEN 'remove_from_list'     THEN 'removed_from_list'
    WHEN 'status_updated'       THEN 'status_changed'
    WHEN 'csv_exported'         THEN 'exported_csv'
    WHEN 'tag_added'            THEN 'tag_added'
    WHEN 'tag_removed'          THEN 'tag_removed'
    WHEN 'profile_edited'       THEN 'profile_edited'
    WHEN 'lead_owner_assigned'  THEN 'assigned_to'
    WHEN 'photo_uploaded'       THEN 'photo_uploaded'
    ELSE al.action_type
  END AS event_type,
  CASE al.action_type
    WHEN 'profile_viewed'       THEN 'Viewed profile'
    WHEN 'profile_enriched'     THEN 'Enrichment completed'
    WHEN 'note_added'           THEN 'Note added'
    WHEN 'add_to_list'          THEN 'Added to list'
    WHEN 'remove_from_list'     THEN 'Removed from list'
    WHEN 'status_updated'       THEN 'Status changed'
    WHEN 'csv_exported'         THEN 'Exported to CSV'
    WHEN 'tag_added'            THEN 'Tag added'
    WHEN 'tag_removed'          THEN 'Tag removed'
    WHEN 'profile_edited'       THEN 'Profile edited'
    WHEN 'lead_owner_assigned'  THEN 'Assigned to team member'
    WHEN 'photo_uploaded'       THEN 'Photo uploaded'
    ELSE al.action_type
  END AS title,
  COALESCE(al.metadata, '{}'::jsonb) AS metadata,
  al.created_at AS event_at,
  al.created_at,
  false AS triggers_status_change
FROM activity_log al
WHERE
  al.target_type = 'prospect'
  AND al.target_id IS NOT NULL
  -- Only migrate rows where target_id is a valid UUID (prevents cast errors)
  AND al.target_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  -- Only migrate known prospect action types
  AND al.action_type IN (
    'profile_viewed', 'profile_enriched', 'note_added',
    'add_to_list', 'remove_from_list', 'status_updated',
    'csv_exported', 'tag_added', 'tag_removed', 'profile_edited',
    'lead_owner_assigned', 'photo_uploaded'
  )
  -- Avoid duplicate inserts if migration is run multiple times
  AND NOT EXISTS (
    SELECT 1
    FROM prospect_activity pa
    WHERE pa.prospect_id = al.target_id::uuid
      AND pa.tenant_id = al.tenant_id
      AND pa.event_at = al.created_at
      AND pa.event_type = CASE al.action_type
        WHEN 'profile_viewed'       THEN 'profile_viewed'
        WHEN 'profile_enriched'     THEN 'enrichment_complete'
        WHEN 'note_added'           THEN 'note_added'
        WHEN 'add_to_list'          THEN 'added_to_list'
        WHEN 'remove_from_list'     THEN 'removed_from_list'
        WHEN 'status_updated'       THEN 'status_changed'
        WHEN 'csv_exported'         THEN 'exported_csv'
        WHEN 'tag_added'            THEN 'tag_added'
        WHEN 'tag_removed'          THEN 'tag_removed'
        WHEN 'profile_edited'       THEN 'profile_edited'
        WHEN 'lead_owner_assigned'  THEN 'assigned_to'
        WHEN 'photo_uploaded'       THEN 'photo_uploaded'
        ELSE al.action_type
      END
  );
