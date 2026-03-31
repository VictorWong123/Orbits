# Project: Orbit (Personal Relationship Manager)

**Core Concept:** A private "digital brain" to track facts, preferences, and upcoming plans for the people in your life.

---

## 1. Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database & Auth:** Supabase (PostgreSQL)
- **Validation:** Zod (for type-safe forms)
- **Icons:** Lucide React
- **Styling:** Tailwind CSS

---

## 2. Database Schema (SQL)
Run this in your Supabase SQL Editor to set up the foundation:

```sql
-- 1. Profiles Table (The People)
create table profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  full_name text not null,
  birthday date,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Facts Table (Tidbits & Info)
create table facts (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  content text not null,
  category text default 'general', -- e.g., 'food', 'work', 'hobby'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Events Table (Calendar/Plans)
create table events (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  title text not null,
  event_date timestamp with time zone not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table facts enable row level security;
alter table events enable row level security;

-- 5. Create Policies (Users only see THEIR own data)
create policy "Users can manage their own profiles" on profiles
  for all using (auth.uid() = user_id);

create policy "Users can manage their own facts" on facts
  for all using (auth.uid() = user_id);

create policy "Users can manage their own events" on events
  for all using (auth.uid() = user_id);

```

3. Best Practices Checklist
Security
RLS is Mandatory: Never disable Row Level Security. Every row must be tied to a user_id.

Middleware: Use Supabase Middleware to protect routes. If a user isn't logged in, redirect them to /login.

Validation: Use Zod schemas for every Server Action to prevent malicious or malformed data injections.

Backend (Server-Side)
Server Actions: Perform all "Writes" (Create/Update/Delete) via Server Actions located in @/app/actions.ts.

Data Fetching: Fetch "Read" data in Server Components to keep the API keys and database logic off the client.

Frontend (UI/UX)
Loading States: Use Next.js loading.tsx files or React Suspense for a smooth "Orbit" feel.

Optimistic UI: When adding a fact or event, use useOptimistic to show the change instantly before the server confirms.

4. Prompt for Claude (Copy/Paste this to Claude)
"I am building 'Orbit,' a personal relationship manager using Next.js (App Router), TypeScript, and Supabase.

Please generate the following:

A folder structure for the app (including an 'actions' folder for Server Actions).

The Supabase client configuration for both Server and Client components.

A Dashboard page (/dashboard) that lists all profiles from the 'profiles' table.

A Profile Detail page (/profile/[id]) that shows:

The person's name and details.

A list of 'Facts' with a form to add a new fact.

A list of 'Events' with a form to add a new event.

Server Actions for adding a Profile, Fact, and Event using Zod for validation.

Follow these rules:

Use Tailwind CSS for a clean, minimal look (don't worry about complex styling, just layout).

Use Lucide React for icons.

Ensure all database calls are handled via Server Actions or Server Components.

Include the proper TypeScript types for the database tables."