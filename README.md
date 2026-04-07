# Orbit — Personal Relationship Manager

Orbit is a private "digital brain" for keeping track of the people in your life. For each person you add, you can record facts (preferences, interests, notes) and upcoming events (plans, appointments, reminders). Works offline with localStorage and syncs to the cloud when you sign in.

## Features

- **People dashboard** — add and browse everyone in your orbit; pin favourites to the top
- **Profile pages** — per-person view with facts and upcoming events
- **User profiles** — set your own display name, birthday, bio, hobbies, and avatar
- **Facts** — categorised free-form notes (e.g. food, work, hobby)
- **Events** — date/time entries with optional notes
- **Event email reminders** — configurable lead-time; a daily Vercel cron job sends SMTP emails for upcoming events
- **Friends** — add other Orbit users as friends by email or short code; view their profile info
- **Reminders** — send event-based reminders to accepted friends
- **Shareable cards** — create personal profile cards with contact info, hobbies, and custom fields; share via link or QR code; recipients can import the card into their own dashboard
- **Swipe to delete** — swipe facts and events to delete on mobile
- **Theme customisation** — six color palettes (sage, ocean, lavender, rose, amber, slate) persisted to DB, cookie, or localStorage
- **Local-first mode** — works without authentication; all data stored in localStorage
- **Data migration** — migrate local data to Supabase when you create an account
- **Auth** — email/password sign-up and sign-in via Supabase Auth
- **Privacy** — Row Level Security ensures every user sees only their own data

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI | React 19 |
| Database & Auth | Supabase (PostgreSQL + Auth + Storage) |
| Validation | Zod |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Email | Nodemailer (SMTP) |
| QR Codes | react-qr-code |
| Calendar | react-day-picker |
| Unit Testing | Vitest |
| E2E Testing | Playwright |

## Project Structure

```
app/
  actions.ts              # Re-exports all server actions from backend/actions/
  layout.tsx              # Root layout: theme from DB/cookie, StoreProvider + ThemeProvider
  page.tsx                # Root route — redirects to /dashboard
  account/                # Auth & account management page
  dashboard/              # Profile list (Server Component shell)
  login/                  # Legacy route — 301 redirects to /account
  profile/[id]/           # Profile detail: facts + events
  share/[id]/             # Public shareable card view + import
  api/
    cron/
      event-email-reminders/  # Secured cron endpoint for sending reminder emails

backend/
  actions/
    index.ts              # Barrel export for all server actions
    auth.ts               # signIn, signUp, signOut
    profiles.ts           # createProfile, deleteProfile
    facts.ts              # createFact, deleteFact
    events.ts             # createEvent, deleteEvent
    settings.ts           # getSettings, updateSettings, avatar upload, user profile
    migration.ts          # migrateLocalData (local→Supabase sync)
    friends.ts            # sendFriendRequest, acceptFriendRequest, removeFriend, etc.
    reminders.ts          # sendReminder, getReminders, markReminderRead, etc.
    cards.ts              # createCard, updateCard, deleteCard, importSharedCard
  lib/
    supabase/
      config.ts           # SUPABASE_URL & SUPABASE_ANON_KEY constants
      server.ts           # createClient() for Server Components/Actions
      service-role.ts     # createServiceRoleClient() for cron jobs (bypasses RLS)
    email/
      smtp-event-reminder.ts  # Sends reminder emails via Nodemailer SMTP
    auth-helpers.ts       # getAuthenticatedSupabase() — shared auth check
    validators.ts         # parseOrError() — Zod safeParse wrapper
    cache.ts              # invalidateProfileCache(), invalidateDashboardCache()
    event-reminder-constants.ts    # Min/max lead-time constants
    event-reminder-eligibility.ts  # Determines which events need a reminder
    process-event-email-reminders.ts  # Cron job logic: query + send
  types/
    database.ts           # Profile, Fact, Event, UserSettings, ShareableCard interfaces

frontend/
  components/
    DashboardClient.tsx   # Profile list with add-profile form
    ProfileClient.tsx     # Profile detail view — header, delete, tabs
    AccountForm.tsx       # Sign-in / Sign-up sliding pill form
    AccountManagement.tsx # Authenticated user email, settings, sign-out
    AddProfileForm.tsx    # Create new profile; detects duplicates
    AddFactForm.tsx       # Create a fact/note with optional category
    AddEventForm.tsx      # Create an event with DateTimePicker
    AddFriendForm.tsx     # Send friend request by email or short code
    AddPersonPanel.tsx    # Unified panel for adding profiles/importing cards
    AddByCardForm.tsx     # Add a person by pasting a share link
    FriendsManager.tsx    # Friend list, pending requests, accept/reject
    ImportCardForm.tsx    # Import a shared card into your dashboard
    LandingPage.tsx       # Marketing / landing page for unauthenticated visitors
    ProfileTabs.tsx       # Notes / Info tabs; optimistic delete for facts/events
    ProfileList.tsx       # Searchable, card-based list with initials avatars
    ReminderDropdown.tsx  # Reminder notification dropdown
    SendReminderModal.tsx # Send a reminder to a friend
    ShareableCardsManager.tsx  # Create, edit, share profile cards + QR codes
    UserAvatar.tsx        # Avatar dropdown (settings, sign-out, create account)
    UserProfileForm.tsx   # Edit personal profile (display name, bio, avatar)
    ui/
      PillInput.tsx       # Reusable pill-shaped text input
      DateTimePicker.tsx  # Calendar + time input (react-day-picker)
      FormError.tsx       # Error message display
      SwipeToDelete.tsx   # Swipe-to-delete gesture wrapper (mobile)
      ThemeProvider.tsx   # Context: manages palette ID, syncs CSS vars to <html>
      SettingsModal.tsx   # Palette color-picker modal
      MigrationModal.tsx  # Local→Supabase migration offer after sign-in
      ConfirmDialog.tsx   # Reusable confirmation dialog
      DeleteButton.tsx    # Inline trash icon button with async state
      DeleteProfileButton.tsx  # Profile delete with confirmation
      SubmitButton.tsx    # Button with pending state
      InfoField.tsx       # Label-value pair display
      PaletteSwatch.tsx   # Color palette preview selector
      DropdownItem.tsx    # Dropdown menu item with icon + label
  lib/
    store/
      types.ts            # DataStore interface + input types
      LocalDataStore.ts   # localStorage-backed store (unauthenticated)
      SupabaseDataStore.ts # Supabase browser client store (authenticated)
      StoreProvider.tsx   # Context: selects store by auth state
    supabase/
      client.ts           # createClient() for Client Components (browser SDK)
    theme.ts              # PaletteId type, ColorPalette, PALETTES (6 palettes)
    formatters.ts         # getInitials, relativeTime, formatCategory, etc.
  styles/
    globals.css           # Global Tailwind base styles
  hooks/
    useFormAction.ts      # Wraps useActionState; auto-resets on success
    useStoreAction.ts     # Wraps useTransition for DataStore mutations
    useOutsideClick.ts    # Closes dropdowns/modals on outside click

scripts/
  test-event-reminders.mjs  # Manual test script for the cron endpoint

middleware.ts             # Session refresh + legacy /login → /account redirect
tailwind.config.ts        # CSS custom property color tokens
vercel.json               # Vercel cron schedule (daily at 09:00 UTC)
tests/                    # Playwright E2E specs + Vitest unit tests
```

Path aliases: `@/*` → root, `@backend/*` → `./backend/*`, `@frontend/*` → `./frontend/*`

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine)

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/VictorWong123/Orbits.git
cd orbits
npm install
```

### 2. Create the database schema

In the Supabase dashboard, open the **SQL Editor** and run each migration in order.

**Base schema** — profiles, facts, events:

```sql
create table profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  full_name text not null,
  birthday date,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

create table facts (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  content text not null,
  category text default 'general',
  created_at timestamp with time zone default timezone('utc', now()) not null
);

create table events (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  title text not null,
  event_date timestamp with time zone not null,
  notes text,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

alter table profiles enable row level security;
alter table facts enable row level security;
alter table events enable row level security;

create policy "Users can manage their own profiles"
  on profiles for all using (auth.uid() = user_id);

create policy "Users can manage their own facts"
  on facts for all using (auth.uid() = user_id);

create policy "Users can manage their own events"
  on events for all using (auth.uid() = user_id);
```

Then run the following migrations in order (**all are required** — the app will error without them):

| # | File | Purpose |
|---|------|---------|
| 1 | `supabase/migrations/001_user_settings.sql` | User theme preferences |
| 2 | `supabase/migrations/002_user_profiles.sql` | User bio/info, short-code lookup |
| 3 | `supabase/migrations/003_shareable_cards.sql` | Shareable profile cards + imported_data column |
| 4 | `supabase/migrations/004_custom_fields.sql` | Custom fields on shareable cards |
| 5 | `supabase/migrations/friends_reminders.sql` | Friendships, reminders, email/UUID lookup RPCs |
| 6 | `supabase/migrations/005_event_email_reminders.sql` | Event reminder lead-time setting + sent-at tracking |
| 7 | `supabase/migrations/006_user_avatar.sql` | Avatar URL column on user_profiles |
| 8 | `supabase/migrations/007_profile_updated_at.sql` | `updated_at` column + child-touch triggers |
| 9 | `supabase/migrations/008_profile_favorites.sql` | `is_favorite` column on profiles |

Paste the full contents of each file into the SQL Editor and run them sequentially.

#### Supabase Storage bucket (avatars)

After running migration 006 you also need to create a storage bucket:

1. In the Supabase dashboard go to **Storage** → **New bucket**.
2. Create a **public** bucket named `Avatars`.
3. Add the following RLS policies on the bucket:
   - **INSERT**: `auth.uid()::text = (storage.foldername(name))[1]`
   - **UPDATE**: `auth.uid()::text = (storage.foldername(name))[1]`
   - **DELETE**: `auth.uid()::text = (storage.foldername(name))[1]`
   - **SELECT**: `true` (public read)

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

See `.env.local.example` for the full list with descriptions. The two required variables are:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are available in your Supabase project under **Project Settings → API**.

To enable **event email reminders** you also need:

| Variable | Where to find it |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key |
| `CRON_SECRET` | Any strong random string (used to secure the `/api/cron/event-email-reminders` endpoint) |
| `EMAIL_SMTP_HOST` | Your SMTP provider (e.g. `smtp.gmail.com`) |
| `EMAIL_SMTP_USER` | SMTP login / email address |
| `EMAIL_SMTP_PASS` | SMTP password or app-specific password |

See `.env.local.example` for optional overrides (`EMAIL_FROM`, `EMAIL_SMTP_PORT`).

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/account` — create an account or start using Orbit in local-only mode without signing in.

## Available Scripts

```bash
npm run dev                # Development server with hot reload
npm run build              # Production build
npm run start              # Run production build locally
npm run lint               # ESLint
npm run test               # Vitest unit tests
npm run test:reminders     # Manually fire the event-reminder cron endpoint
npm run test:reminders:seed  # Seed test data then fire the cron
```

## Testing

### Unit tests

Unit tests use [Vitest](https://vitest.dev/) and live in `tests/unit/`.

```bash
npm run test                     # Run all unit tests
```

### E2E tests

E2E tests use [Playwright](https://playwright.dev/) and live in the `tests/` directory.

```bash
npx playwright install           # Install browsers (first time only)
npx playwright test              # Run all E2E tests
npx playwright test --ui         # Interactive UI mode
```

## Deploying to Vercel

### 1. Push to GitHub

Make sure your repo is on GitHub. The `.env.local` file is gitignored — never commit it.

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo.
2. Vercel auto-detects Next.js — no build settings need to change.
3. Before deploying, add your environment variables under **Environment Variables**:

   | Name | Required | Value |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Your Supabase anon/public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | For email reminders | Supabase service_role key |
   | `CRON_SECRET` | For email reminders | Random secret string to secure the cron endpoint |
   | `EMAIL_SMTP_HOST` | For email reminders | SMTP host (e.g. `smtp.gmail.com`) |
   | `EMAIL_SMTP_USER` | For email reminders | SMTP login |
   | `EMAIL_SMTP_PASS` | For email reminders | SMTP password |
   | `EMAIL_FROM` | No | Sender address (defaults to `EMAIL_SMTP_USER`) |
   | `EMAIL_SMTP_PORT` | No | SMTP port (defaults to `465`) |

4. Click **Deploy**. Vercel builds and hosts the app, giving you a `.vercel.app` URL.

The `vercel.json` in the repo root configures a daily cron job at 09:00 UTC that hits `/api/cron/event-email-reminders`. Vercel Cron requires the Hobby plan or above.

### 3. Configure Supabase auth URLs

Once you have your production URL (e.g. `https://orbits.vercel.app`), add it to Supabase so auth flows work correctly:

1. In your Supabase dashboard, go to **Authentication → URL Configuration**.
2. Set **Site URL** to your production URL: `https://orbits.vercel.app`
3. Under **Redirect URLs**, add both:
   - `http://localhost:3000/**` (local dev)
   - `https://orbits.vercel.app/**` (production)

This is required for email confirmation and password-reset links to redirect users back to the correct host.

### Environment variables for local dev

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials. Local dev continues to use `http://localhost:3000` automatically.

## Security Notes

- **RLS is always on.** Never disable Row Level Security on any table.
- All writes go through server actions in `backend/actions/`, which validate input with Zod and verify user ownership before touching the database.
- The middleware refreshes the Supabase session on every request. It does **not** gate routes by auth — unauthenticated users can use the app in local-only mode. The only redirect is the legacy `/login` → `/account` (301).
- Shareable cards use UUID-as-secret for public read access — knowing the card's UUID is required to view it.
