-- Migration: add custom_fields column to shareable_cards
-- Idempotent: ADD COLUMN IF NOT EXISTS is safe to re-run.
-- custom_fields stores an ordered array of {label, value} objects,
-- e.g. [{"label":"LinkedIn","value":"https://linkedin.com/in/..."}].
ALTER TABLE shareable_cards
  ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '[]'::jsonb;
