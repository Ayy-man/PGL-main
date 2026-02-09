-- Add is_generated flag to personas table
-- This allows distinguishing AI-generated lookalike personas from manually created ones

ALTER TABLE personas
ADD COLUMN is_generated boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN personas.is_generated IS 'True for AI-generated lookalike personas, false for manually created';
