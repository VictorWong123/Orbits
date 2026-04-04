-- Migration: user_profiles table
-- Stores optional personal bio/info for authenticated users.
-- This data is shared with friends via a security-definer RPC,
-- following the same pattern as get_user_email_by_id in friends_reminders.sql.

create table if not exists user_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  birthday     text,   -- YYYY-MM-DD text, matching existing profiles.birthday convention
  hobbies      text,
  bio          text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table user_profiles enable row level security;

drop policy if exists "Users manage their own profile" on user_profiles;
create policy "Users manage their own profile"
  on user_profiles
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Any authenticated user can look up another user's profile by UUID.
-- SECURITY DEFINER bypasses RLS so the caller's own RLS policy is not applied.
-- Restricted to the `authenticated` role to prevent anonymous enumeration.
create or replace function get_user_profile_by_id(user_id_input uuid)
returns table (display_name text, birthday text, hobbies text, bio text)
language plpgsql security definer as $$
begin
  return query
    select p.display_name, p.birthday, p.hobbies, p.bio
    from user_profiles p
    where p.user_id = user_id_input;
end;
$$;

revoke execute on function get_user_profile_by_id(uuid) from public;
grant  execute on function get_user_profile_by_id(uuid) to authenticated;

-- Resolves a user's full UUID from their 8-character short code (first 8 hex
-- chars of their UUID). SECURITY DEFINER to read auth.users without exposing
-- the table. Returns NULL when no match is found.
create or replace function get_user_id_by_short_code(code text)
returns uuid
language plpgsql security definer
set search_path = auth, public
as $$
declare
  found_id uuid;
begin
  select id into found_id
  from auth.users
  where id::text like lower(code) || '%'
  limit 1;
  return found_id;
end;
$$;

revoke execute on function get_user_id_by_short_code(text) from public;
grant  execute on function get_user_id_by_short_code(text) to authenticated;

-- Reuses update_updated_at_column() already created in 001_user_settings.sql.
drop trigger if exists user_profiles_updated_at on user_profiles;
create trigger user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at_column();
