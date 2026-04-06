-- Migration: add avatar_url to user_profiles
-- Allows users to store a link to their uploaded profile photo.

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Storage bucket and policies must be created manually in the Supabase dashboard:
--   1. Create a public bucket named "avatars"
--   2. Add an INSERT policy: auth.uid()::text = (storage.foldername(name))[1]
--   3. Add an UPDATE policy: auth.uid()::text = (storage.foldername(name))[1]
--   4. Add a DELETE policy: auth.uid()::text = (storage.foldername(name))[1]
--   5. Add a SELECT policy: true  (public read)
