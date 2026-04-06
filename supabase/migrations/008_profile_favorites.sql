-- Migration: add is_favorite to profiles
-- Allows users to pin frequently-accessed profiles to the top of the dashboard.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;
