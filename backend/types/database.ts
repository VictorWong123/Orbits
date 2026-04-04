/** A single user-defined field on a shareable card. */
export interface CustomField {
  label: string;
  value: string;
}

/**
 * Shape of the JSON snapshot stored in `profiles.imported_data`.
 * Contains only the non-null fields from the original shareable card.
 */
export interface ImportedCardData {
  card_id: string;
  card_name: string;
  phone?: string;
  email?: string;
  hobbies?: string;
  fun_facts?: string;
  other_notes?: string;
  /** User-defined extra fields, e.g. LinkedIn, Portfolio. */
  custom_fields?: CustomField[];
}

/** Represents a row in the `profiles` table. */
export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  birthday: string | null;
  avatar_url: string | null;
  created_at: string;
  /** JSON snapshot of the shareable card this profile was imported from, or null. */
  imported_data: ImportedCardData | null;
}

/** Represents a row in the `shareable_cards` table. */
export interface ShareableCard {
  id: string;
  user_id: string;
  card_name: string;
  phone: string | null;
  email: string | null;
  hobbies: string | null;
  fun_facts: string | null;
  other_notes: string | null;
  /** User-defined extra fields stored as JSONB, e.g. LinkedIn, Portfolio. */
  custom_fields: CustomField[] | null;
  created_at: string;
}

/** Represents a row in the `facts` table. */
export interface Fact {
  id: string;
  profile_id: string;
  user_id: string;
  content: string;
  category: string;
  created_at: string;
}

/** Represents a row in the `events` table. */
export interface Event {
  id: string;
  profile_id: string;
  user_id: string;
  title: string;
  event_date: string;
  notes: string | null;
  created_at: string;
}

/** Represents a row in the `user_settings` table. */
export interface UserSettings {
  user_id: string;
  palette_id: string;
  created_at: string;
  updated_at: string;
}

/** Represents a row in the `user_profiles` table. */
export interface UserProfile {
  user_id: string;
  display_name: string | null;
  /** YYYY-MM-DD string, or null when not set. */
  birthday: string | null;
  hobbies: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}
