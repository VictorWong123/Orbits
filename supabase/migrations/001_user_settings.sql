-- Migration: user_settings table
-- Stores per-user app preferences. Each row is locked to the owning user via RLS.

create table if not exists user_settings (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  palette_id text not null default 'sage',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

create policy "Users manage their own settings"
  on user_settings
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at current automatically.
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_settings_updated_at
  before update on user_settings
  for each row execute function update_updated_at_column();
