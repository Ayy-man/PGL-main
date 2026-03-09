-- Add theme column to tenants (replaces primary_color + secondary_color)
-- Valid values: gold, sapphire, emerald, rose, amber, slate, violet, coral

ALTER TABLE tenants ADD COLUMN theme text NOT NULL DEFAULT 'gold';

-- Backfill existing tenants
UPDATE tenants SET theme = 'gold' WHERE theme = 'gold';

-- Drop legacy color columns
ALTER TABLE tenants DROP COLUMN IF EXISTS primary_color;
ALTER TABLE tenants DROP COLUMN IF EXISTS secondary_color;
