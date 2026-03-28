-- Research Scrapbook: sessions, messages, pins
-- Phase 25: Exa Research Scrapbook

CREATE TABLE IF NOT EXISTS research_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS research_sessions_prospect ON research_sessions (prospect_id, updated_at DESC);
ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
-- NOTE: RLS policy configured in Supabase dashboard per project convention

CREATE TABLE IF NOT EXISTS research_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text,
  metadata jsonb DEFAULT '{}',
  result_cards jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS research_messages_session ON research_messages (session_id, created_at ASC);
ALTER TABLE research_messages ENABLE ROW LEVEL SECURITY;
-- NOTE: RLS policy configured in Supabase dashboard per project convention

CREATE TABLE IF NOT EXISTS research_pins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES research_messages(id) ON DELETE SET NULL,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  card_index integer NOT NULL,
  pin_target text NOT NULL CHECK (pin_target IN ('signal', 'dossier_hook', 'note')),
  edited_headline text,
  edited_summary text,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS research_pins_prospect ON research_pins (prospect_id, tenant_id);
ALTER TABLE research_pins ENABLE ROW LEVEL SECURITY;
-- NOTE: RLS policy configured in Supabase dashboard per project convention
