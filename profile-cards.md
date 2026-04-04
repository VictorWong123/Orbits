# Feature Request: Shareable Personal Profiles ("My Cards")

Please implement a new feature allowing users to create, manage, and share their own personal profiles (e.g., a "Networking" card, a "Friends" card). 

**CRITICAL:** You must strictly follow the architectural rules, styling guidelines, and constraints defined in `CLAUDE.md`. Pay special attention to idempotency in migrations, RLS policies, the `DataStore` abstraction, and returning `string | null` from server actions.

## 1. Feature Overview
* **Creation:** Users can create multiple variations of their own profile from the Account/Settings menu.
* **Fields:** All fields are optional. Required UI fields to include: Phone Number, Email, Hobbies, Fun Facts, and a large text area at the bottom titled "Other".
* **Sharing:** Users can generate a share link for a specific card.
* **Receiving:** When another user clicks the share link, they see the non-empty fields. They can click "Add to my Orbit" to save this person to their own dashboard.
* **Read-Only vs Editable:** The shared data imported by the recipient must be **read-only** on their end. However, the recipient can still add their own private `facts` and `events` to that profile exactly as they do now.

## 2. Database & Schema Updates
Create a migration file (idempotent, using `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, etc.) for the following:
1.  **New Table:** `shareable_cards`
    * `id` (uuid, pk)
    * `user_id` (uuid, fk to auth.users)
    * `card_name` (text, e.g., "Networking", "Personal")
    * `phone` (text, nullable)
    * `email` (text, nullable)
    * `hobbies` (text, nullable)
    * `fun_facts` (text, nullable)
    * `other_notes` (text, nullable)
    * `created_at` (timestamptz)
    * *Enable RLS:* Only the owner (`auth.uid() = user_id`) can CRUD their own cards. To allow sharing, add a `SELECT` policy where anyone can read a card by its ID (since the ID acts as the secret share link).
2.  **Modify Existing Table:** `profiles`
    * Add a new column: `imported_data` (JSONB, default null). This will store the static snapshot of the shared card when a user adds it to their Orbit, keeping it visually separated and read-only.

## 3. Store Abstraction & Types (`frontend/lib/store/types.ts`)
Update the `DataStore` interfaces and types:
* Add `ShareableCard` to `backend/types/database.ts`.
* Add methods to `DataStore`: `getShareableCards()`, `createShareableCard(input)`, `deleteShareableCard(id)`.
* Implement these methods in **both** `LocalDataStore` (using localStorage `orbits:my_cards`) and `SupabaseDataStore`.

## 4. Server Actions (`backend/actions/`)
Create a new file `backend/actions/cards.ts` (and re-export in `index.ts` and `app/actions.ts`):
* `createCard`, `deleteCard`
* `importSharedCard`: Takes a `cardId`, fetches the `shareable_cards` record, and creates a new `profiles` record for the current user, stuffing the card's details into the `imported_data` JSONB column.
* *Rule:* Use `parseOrError` with Zod. Return `string | null` for mutations. Call cache invalidation.

## 5. UI: Management (Account Menu)
* Add a new section in `/account` or `AccountManagement.tsx` titled "My Shareable Cards".
* Display a list of created cards.
* Add a form to create a new card (use `useFormAction` and `SubmitButton`). Ensure all requested fields are present and optional.
* Add a "Copy Share Link" button for each card that copies `window.location.origin + '/share/' + card.id` to the clipboard.

## 6. UI: Sharing Route (`app/share/[id]/page.tsx`)
* Create a new public route.
* Fetch the card by ID. If not found, show a clean 404/Error.
* Display a clean UI card showing only the non-empty fields.
* Include a button: "Add to my Orbit".
    * If the user is logged out, redirect them to `/account` with a `?redirect=/share/[id]` parameter.
    * If logged in, call the `importSharedCard` action, then redirect to that new profile's page (`/profile/[new_id]`).

## 7. UI: Viewing a Profile (`frontend/components/ProfileClient.tsx` & `ProfileTabs.tsx`)
* Update the profile view. If a profile has `imported_data`, display it prominently (perhaps in a distinct "Shared Details" card/section at the top or in the "Info" tab).
* Make it visually clear that these fields were imported and are read-only.
* Ensure the standard "Add Fact" and "Add Event" functionality continues to work perfectly below or alongside the imported data.

Please proceed step-by-step. Start with the database migrations and type definitions, verify the build, and then move to the server actions and UI.