# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Orbit** is a personal relationship manager — a private "digital brain" to track facts, preferences, and upcoming plans for the people in your life.

**Stack:** Next.js 15 (App Router), React 19, TypeScript, Supabase (PostgreSQL + Auth), Zod, Tailwind CSS.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # Run ESLint
```

## Directory Structure

```
app/
  actions.ts              # Re-exports all server actions from backend/actions/
  dashboard/              # Dashboard page (profile list, Server Component shell)
  profile/[id]/           # Profile detail page (Server Component shell)
  account/                # Auth & account management page
  login/                  # Legacy route — 301 redirects to /account
  page.tsx                # Root route — redirects to /dashboard
  layout.tsx              # Root layout: loads theme from DB/cookie, wraps StoreProvider + ThemeProvider

backend/
  actions/
    index.ts              # Barrel export for all server actions
    auth.ts               # signIn, signUp, signOut
    profiles.ts           # createProfile, deleteProfile
    facts.ts              # createFact, deleteFact
    events.ts             # createEvent, deleteEvent
    settings.ts           # getSettings, updateSettings
    migration.ts          # migrateLocalData (local→Supabase sync)
  lib/
    supabase/
      config.ts           # SUPABASE_URL & SUPABASE_ANON_KEY constants
      server.ts           # createClient() for Server Components/Actions (uses next/headers cookies)
    auth-helpers.ts       # getAuthenticatedSupabase() — shared auth check for all server actions
    validators.ts         # parseOrError() — Zod safeParse wrapper returning string | null
    cache.ts              # invalidateProfileCache(), invalidateDashboardCache() via revalidatePath
  types/
    database.ts           # Profile, Fact, Event, UserSettings interfaces

frontend/
  components/
    DashboardClient.tsx   # Profile list with add-profile form (Client Component)
    ProfileClient.tsx     # Profile detail view — header, delete, delegates to ProfileTabs
    AccountForm.tsx       # Sign-in / Sign-up sliding pill form
    AccountManagement.tsx # Authenticated user email, settings, sign-out
    AddProfileForm.tsx    # Create new profile; detects duplicates
    AddFactForm.tsx       # Create a fact/note with optional category
    AddEventForm.tsx      # Create an event with DateTimePicker
    ProfileTabs.tsx       # Notes vs Info tabs; optimistic delete for facts/events
    ProfileList.tsx       # Searchable, card-based list with initials avatars + category tags
    UserAvatar.tsx        # Avatar dropdown (settings, sign-out, create account)
    ui/
      PillInput.tsx       # Reusable pill-shaped text input (colored or white variant)
      DateTimePicker.tsx  # Calendar + time input using react-day-picker
      FormError.tsx       # Error message display (optional highlighted/red variant)
      ThemeProvider.tsx   # Context: manages palette ID, syncs CSS custom properties to <html>
      SettingsModal.tsx   # Palette color-picker modal
      MigrationModal.tsx  # Local→Supabase migration offer after sign-in
      DeleteButton.tsx    # Inline trash icon button with async state
      DeleteProfileButton.tsx  # Profile delete with confirmation dialog
      SubmitButton.tsx    # Button with pending state and disabled styling
      InfoField.tsx       # Label-value pair display (e.g. "Birthday: June 15, 1990")
      PaletteSwatch.tsx   # Color palette preview selector
      DropdownItem.tsx    # Dropdown menu item with icon + label
  lib/
    store/
      types.ts            # DataStore interface + CreateProfileInput, CreateFactInput, CreateEventInput, ProfileSummary
      LocalDataStore.ts   # localStorage-backed store (unauthenticated)
      SupabaseDataStore.ts # Supabase browser client store (authenticated)
      StoreProvider.tsx   # Context: selects store by auth state, triggers MigrationModal
    supabase/
      client.ts           # createClient() for Client Components (browser SDK)
    theme.ts              # PaletteId type, ColorPalette interface, PALETTES object (6 palettes)
    formatters.ts         # getInitials, getEmailInitials, relativeTime, formatCategory, formatBirthdayDate, formatEventDate
    styles/
      globals.css         # Global Tailwind base styles
  hooks/
    useFormAction.ts      # Wraps useActionState for server action forms; auto-resets on success
    useStoreAction.ts     # Wraps useTransition for DataStore mutations; calls onSuccess callback
    useOutsideClick.ts    # Closes dropdowns/modals on outside click

middleware.ts             # Auth session refresh on every request; routing rules
tailwind.config.ts        # CSS custom property color tokens (--color-primary, etc.)
theme.json                # Design token backup (6 palettes)
```

## Architecture

### Data Model

Four tables in Supabase (see `init-prompt.md` for full SQL):

- **profiles** — people being tracked (`id`, `user_id`, `full_name`, `birthday`, `avatar_url`, `created_at`)
- **facts** — tidbits about a person (`id`, `profile_id`, `user_id`, `content`, `category`, `created_at`)
- **events** — calendar entries/plans (`id`, `profile_id`, `user_id`, `title`, `event_date`, `notes`, `created_at`)
- **user_settings** — user preferences (`user_id` PK, `palette_id`, `created_at`, `updated_at`)

All tables have Row Level Security enabled — every row is scoped to `user_id` via RLS policy (`auth.uid() = user_id`). **Never disable RLS.** Facts and events cascade-delete when a profile is deleted.

### DataStore Abstraction

All client-side data access goes through the `DataStore` interface (`frontend/lib/store/types.ts`). The active implementation is provided by `StoreProvider` via React Context:

- **`LocalDataStore`** — used when unauthenticated; persists to `localStorage` under `orbits:profiles`, `orbits:facts`, `orbits:events`, `orbits:palette`. Uses `"local"` as the `user_id` sentinel.
- **`SupabaseDataStore`** — used when authenticated; calls Supabase browser client. Caches `user_id` after first auth check.

Both stores implement the same interface:

```typescript
interface DataStore {
  // Reads
  getProfiles(): Promise<ProfileSummary[]>;
  getProfile(id: string): Promise<Profile | null>;
  getFacts(profileId: string): Promise<Fact[]>;
  getEvents(profileId: string): Promise<Event[]>;
  getPaletteId(): Promise<string>;

  // Writes — return null on success, error string on failure
  createProfile(input: CreateProfileInput): Promise<string | null>;
  deleteProfile(profileId: string): Promise<string | null>;
  createFact(input: CreateFactInput): Promise<string | null>;
  deleteFact(factId: string, profileId: string): Promise<string | null>;
  createEvent(input: CreateEventInput): Promise<string | null>;
  deleteEvent(eventId: string, profileId: string): Promise<string | null>;
  updatePaletteId(paletteId: string): Promise<string | null>;
}
```

### Server Actions

All server actions live in `backend/actions/` and are re-exported from `app/actions.ts`. Every action:
1. Calls `getAuthenticatedSupabase()` to get `{ supabase, user }` (or returns an auth error).
2. Parses input through `parseOrError(schema, data)` (Zod schema).
3. Executes the Supabase query.
4. Calls `invalidateProfileCache(profileId)` or `invalidateDashboardCache()` to bust Next.js cache.

**Convention:** All mutations return `string | null` — `null` = success, non-null = error message.

### Supabase Client Variants

Two separate clients are required:

| Context | File | How cookies work |
|---|---|---|
| Server Components / Actions | `backend/lib/supabase/server.ts` | Uses `next/headers` `cookies()` |
| Client Components | `frontend/lib/supabase/client.ts` | Supabase browser SDK |

Never use the server client in Client Components or vice versa.

### Auth Flow

1. **Unauthenticated**: `StoreProvider` detects no session → uses `LocalDataStore`. All data goes to localStorage.
2. **Sign-in/up**: `AccountForm` calls `signIn()` / `signUp()` server action → Supabase session created → redirect to `/dashboard`.
3. **Migration**: `StoreProvider` detects `null → email` transition in `userEmail`. If local profiles exist, shows `MigrationModal`. User can call `migrateLocalData()` to sync local records into Supabase, then localStorage is cleared.
4. **Authenticated**: `StoreProvider` uses `SupabaseDataStore`. RLS enforced on every query.
5. **Sign-out**: `signOut()` server action → session cleared → redirect to `/account`. `StoreProvider` detects loss of session → switches back to `LocalDataStore`.
6. **Session refresh**: Middleware runs on every request, calls `supabase.auth.getUser()`, handles cookie serialization.

### Theme / Palette System

- Six palettes defined in `frontend/lib/theme.ts` (`sage`, `ocean`, `lavender`, `rose`, `amber`, `slate`).
- Each palette maps to four CSS custom properties on `<html>`: `--color-primary`, `--color-primary-dark`, `--color-primary-light`, `--color-accent`.
- **Persistence order** (highest to lowest precedence): DB (`user_settings.palette_id`) → cookie (`orbits_palette`) → localStorage (`orbits:palette`) → default (`sage`).
- `ThemeProvider` syncs CSS vars client-side. Server-side (`layout.tsx`) reads from DB or cookie to avoid flash of unstyled content (FOUC).

### Key Patterns

- **Validate all Server Action inputs** with a Zod schema via `parseOrError()` before touching the database.
- **All mutations return `string | null`** — `null` is success, a string is the error message to display.
- **Optimistic deletes** in `ProfileTabs`: deleted IDs are added to a local `Set` immediately; items are hidden before the server confirms. On error, the item is restored.
- **`useFormAction(action)`** wraps `useActionState`; auto-resets the form ref on success.
- **`useStoreAction(action, onSuccess?)`** wraps `useTransition`; manages pending state and error display for DataStore mutations.
- **`useOutsideClick(ref, callback, isActive)`** attaches a document listener only when `isActive` is true; requires a stable `callback` reference.
- **Defense-in-depth on deletes**: server actions check `user_id` explicitly in addition to relying on RLS.
- **Cache invalidation**: always call the appropriate `invalidate*Cache()` helper after every mutation.

### Path Aliases (tsconfig.json)

```
@/*         → root directory
@frontend/* → ./frontend/*
@backend/*  → ./backend/*
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=...       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  # Public anon key (safe in browser — RLS enforces access)
```

Both are `NEXT_PUBLIC_*` and bundled into the browser build. This is safe because Supabase RLS limits what the anon key can read/write.

## Dependencies

| Package | Purpose |
|---|---|
| `next` 15 | App Router, Server Actions, Server Components |
| `react` / `react-dom` 19 | UI framework |
| `@supabase/supabase-js` | Supabase JS client |
| `@supabase/ssr` | Server-side auth helpers (cookie-based sessions) |
| `zod` | Input validation |
| `react-day-picker` | Calendar component in DateTimePicker |
| `lucide-react` | Icon library |
| `tailwindcss` | CSS framework |
| `@playwright/test` | E2E testing |
