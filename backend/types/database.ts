/** Represents a row in the `profiles` table. */
export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  birthday: string | null;
  avatar_url: string | null;
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
