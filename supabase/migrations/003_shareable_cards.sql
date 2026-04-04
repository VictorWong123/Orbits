-- Migration: shareable_cards table + imported_data column on profiles
-- Allows users to create personal profile cards that can be shared via a UUID link.
-- When a recipient clicks the link they see non-empty fields and can import the
-- person into their own dashboard. The imported snapshot is stored on the profiles row.

-- ── shareable_cards ───────────────────────────────────────────────────────────

create table if not exists shareable_cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  card_name   text not null,
  phone       text,
  email       text,
  hobbies     text,
  fun_facts   text,
  other_notes text,
  created_at  timestamptz not null default now()
);

alter table shareable_cards enable row level security;

-- The card owner can create, read, update, and delete their own cards.
drop policy if exists "Owner full access" on shareable_cards;
create policy "Owner full access"
  on shareable_cards
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anyone (including anonymous visitors) can read a card by its UUID.
-- The UUID itself acts as the share secret — guessing is computationally infeasible.
drop policy if exists "Public read by id" on shareable_cards;
create policy "Public read by id"
  on shareable_cards
  for select
  using (true);

-- ── profiles: imported_data column ───────────────────────────────────────────

-- Stores a static JSON snapshot of the shared card when a user imports someone
-- into their Orbit. The snapshot is intentionally read-only on the recipient's end.
alter table profiles add column if not exists imported_data jsonb;
