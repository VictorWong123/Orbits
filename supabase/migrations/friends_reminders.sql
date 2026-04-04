-- ============================================================
-- Friends & Reminders migration
-- Run this entire file in your Supabase SQL editor:
--   Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- ── friendships ─────────────────────────────────────────────
-- Tracks bidirectional friend relationships between users.
-- Only the receiver can accept; either party can remove.

CREATE TABLE IF NOT EXISTS public.friendships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- Prevent duplicate friendship rows in either direction.
  CONSTRAINT friendships_no_self_loop CHECK (requester_id <> receiver_id),
  CONSTRAINT friendships_unique_pair  UNIQUE (requester_id, receiver_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships_select" ON public.friendships;
CREATE POLICY "friendships_select"
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "friendships_insert" ON public.friendships;
CREATE POLICY "friendships_insert"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "friendships_update" ON public.friendships;
CREATE POLICY "friendships_update"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "friendships_delete" ON public.friendships;
CREATE POLICY "friendships_delete"
  ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);


-- ── reminders ───────────────────────────────────────────────
-- Event-based notifications sent between accepted friends.

CREATE TABLE IF NOT EXISTS public.reminders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Cascade-delete reminders when the underlying event is removed.
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  message     text NOT NULL,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminders_select" ON public.reminders;
CREATE POLICY "reminders_select"
  ON public.reminders FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "reminders_insert" ON public.reminders;
CREATE POLICY "reminders_insert"
  ON public.reminders FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "reminders_update" ON public.reminders;
CREATE POLICY "reminders_update"
  ON public.reminders FOR UPDATE
  USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "reminders_delete" ON public.reminders;
CREATE POLICY "reminders_delete"
  ON public.reminders FOR DELETE
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);


-- ── Secure RPC: look up a user UUID by exact email ──────────
-- SECURITY DEFINER runs as the function owner (superuser context),
-- allowing a read from auth.users without exposing the table
-- to regular clients. Returns NULL when no match is found so
-- callers cannot tell whether an email exists without an exact hit.

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  found_id uuid;
BEGIN
  SELECT id INTO found_id
  FROM auth.users
  WHERE email = email_input;

  RETURN found_id;
END;
$$;

-- Grant execute to authenticated users only.
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO authenticated;


-- ── Secure RPC: look up an email by user UUID ───────────────
-- Symmetric helper used when displaying friend emails in the UI.
-- Also SECURITY DEFINER for the same reason.

CREATE OR REPLACE FUNCTION public.get_user_email_by_id(user_id_input uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  found_email text;
BEGIN
  SELECT email INTO found_email
  FROM auth.users
  WHERE id = user_id_input;

  RETURN found_email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_email_by_id(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_email_by_id(uuid) TO authenticated;
