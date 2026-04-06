-- Migration: add updated_at to profiles
-- Tracks the last time a profile or any of its child records was modified.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill existing rows so updated_at is never NULL.
UPDATE profiles SET updated_at = created_at WHERE updated_at IS NULL;

-- Auto-set updated_at on direct profile row updates (reuses existing function).
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Touch the parent profile's updated_at when a child fact is inserted or deleted.
CREATE OR REPLACE FUNCTION touch_profile_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE profiles SET updated_at = now()
  WHERE id = COALESCE(NEW.profile_id, OLD.profile_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS facts_touch_profile ON facts;
CREATE TRIGGER facts_touch_profile
  AFTER INSERT OR DELETE ON facts
  FOR EACH ROW EXECUTE FUNCTION touch_profile_updated_at();

DROP TRIGGER IF EXISTS events_touch_profile ON events;
CREATE TRIGGER events_touch_profile
  AFTER INSERT OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION touch_profile_updated_at();
