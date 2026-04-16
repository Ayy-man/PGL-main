-- Phase 43: Wealth Tier Auto-Estimation
-- Adds 4 columns for LLM-estimated wealth tier, stored alongside the existing
-- manual_wealth_tier. Display precedence: manual_wealth_tier > auto_wealth_tier.
-- No CHECK constraint — validation happens at the application layer via the
-- TypeScript union in src/types/database.ts (same pattern as manual_wealth_tier).
-- No RLS migration — RLS policies are configured in the Supabase dashboard.

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS auto_wealth_tier text,
  ADD COLUMN IF NOT EXISTS auto_wealth_tier_confidence text,
  ADD COLUMN IF NOT EXISTS auto_wealth_tier_reasoning text,
  ADD COLUMN IF NOT EXISTS auto_wealth_tier_estimated_at timestamptz;

-- Partial index for future "filter prospects by auto tier" queries.
-- Scoped by tenant_id to match existing RLS query pattern.
CREATE INDEX IF NOT EXISTS prospects_auto_wealth_tier_idx
  ON prospects (tenant_id, auto_wealth_tier)
  WHERE auto_wealth_tier IS NOT NULL;
