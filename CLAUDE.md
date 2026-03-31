# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Orbit** is a personal relationship manager — a private "digital brain" to track facts, preferences, and upcoming plans for the people in your life.

**Stack:** Next.js 14+ (App Router), TypeScript, Supabase (PostgreSQL + Auth), Zod, Tailwind CSS, React.

## Commands

Once the project is initialized with `create-next-app` or equivalent:

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # Run ESLint
```

## Architecture

### Data Model

Three core tables in Supabase (see `init-prompt.md` for full SQL):

- **profiles** — people being tracked (`id`, `user_id`, `full_name`, `birthday`, `avatar_url`)
- **facts** — tidbits about a person (`id`, `profile_id`, `user_id`, `content`, `category`)
- **events** — calendar entries/plans (`id`, `profile_id`, `user_id`, `title`, `event_date`, `notes`)

All tables have Row Level Security enabled. Every row is scoped to `user_id` via RLS policy (`auth.uid() = user_id`). **Never disable RLS.**

### Next.js App Router Structure

```
app/
  actions.ts          # All Server Actions (writes: create/update/delete)
  dashboard/          # Lists all profiles (Server Component)
  profile/[id]/       # Profile detail: facts + events + add forms
  login/              # Auth entry point
  layout.tsx
```

- **Server Components** handle all data reads (keeps Supabase keys off the client)
- **Server Actions** in `app/actions.ts` handle all writes, validated with Zod schemas
- **Supabase client** needs two variants: one for Server Components/Actions, one for Client Components
- Routes are protected via Supabase Middleware — unauthenticated users redirect to `/login`

### Key Patterns

- Validate every Server Action input with a Zod schema before touching the database
- Use `useOptimistic` when adding facts or events for immediate UI feedback
- Use `loading.tsx` or React Suspense for async data states
