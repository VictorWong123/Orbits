# Orbit — Personal Relationship Manager

Orbit is a private "digital brain" for keeping track of the people in your life. For each person you add, you can record facts (preferences, interests, notes) and upcoming events (plans, appointments, reminders).

## Features

- **People dashboard** — add and browse everyone in your orbit
- **Profile pages** — per-person view with facts and upcoming events
- **Facts** — categorised free-form notes (e.g. food, work, hobby)
- **Events** — date/time entries with optional notes
- **Auth** — email/password sign-up and sign-in via Supabase Auth
- **Privacy** — Row Level Security ensures every user sees only their own data

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| Validation | Zod |
| Styling | Tailwind CSS |
| Icons | Lucide React |

## Project Structure

```
app/                    # Next.js App Router pages & server actions
  actions.ts            # Re-export barrel for all server actions
  dashboard/            # Lists all profiles (Server Component)
  login/                # Email/password auth (sign-in & sign-up)
  profile/[id]/         # Profile detail: facts + events

backend/
  actions/index.ts      # All server actions (create/delete)
  lib/supabase/         # Supabase server client
  types/database.ts     # TypeScript types for DB rows

frontend/
  components/           # Shared UI components (forms, buttons)
  hooks/useFormAction.ts
  lib/supabase/         # Supabase browser client

middleware.ts           # Route protection — redirects to /login if unauthenticated
```

Path aliases: `@backend/*` → `./backend/*`, `@frontend/*` → `./frontend/*`

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine)

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd orbits
npm install
```

### 2. Create the database schema

In the Supabase dashboard, open the **SQL Editor** and run:

```sql
-- Profiles table
create table profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  full_name text not null,
  birthday date,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- Facts table
create table facts (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  content text not null,
  category text default 'general',
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- Events table
create table events (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  title text not null,
  event_date timestamp with time zone not null,
  notes text,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table facts enable row level security;
alter table events enable row level security;

-- Policies: users can only access their own rows
create policy "Users can manage their own profiles"
  on profiles for all using (auth.uid() = user_id);

create policy "Users can manage their own facts"
  on facts for all using (auth.uid() = user_id);

create policy "Users can manage their own events"
  on events for all using (auth.uid() = user_id);
```

### 3. Configure environment variables

Create a `.env.local` file at the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are available in your Supabase project under **Project Settings → API**.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login` — create an account and start adding people.

## Available Scripts

```bash
npm run dev      # Development server with hot reload
npm run build    # Production build
npm run start    # Run production build locally
npm run lint     # ESLint
```

## Security Notes

- **RLS is always on.** Never disable Row Level Security on any table.
- All writes go through server actions in `backend/actions/index.ts`, which validate input with Zod and verify user ownership before touching the database.
- Middleware (`middleware.ts`) redirects unauthenticated requests to `/login` for all non-static routes.
# Orbits
