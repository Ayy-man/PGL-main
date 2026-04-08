-- Phase 29: Track how deep into Apollo's result set each saved search has pulled.
-- Enables "Load 500 more leads" action beyond the default 5-page (500-result) refresh cap.
ALTER TABLE personas ADD COLUMN IF NOT EXISTS apollo_pages_fetched INTEGER DEFAULT 0;

COMMENT ON COLUMN personas.apollo_pages_fetched IS
  'Highest Apollo page number fetched for this saved search. Incremented by extendSavedSearchProspects when user clicks "Load more". Refresh resets to max(5, current).';
