import { createClient } from "@backend/lib/supabase/server";
import ProfileClient from "@frontend/components/ProfileClient";
import type { Profile, Fact, Event } from "@backend/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Fetches profile data on the server when the user is authenticated.
 * Returns null for each value if the user is unauthenticated or the query fails,
 * letting ProfileClient fall back to client-side fetching.
 */
async function fetchProfileData(id: string): Promise<{
  profile: Profile | null;
  facts: Fact[];
  events: Event[];
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { profile: null, facts: [], events: [] };

    const [profileResult, factsResult, eventsResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase.from("facts").select("*").eq("profile_id", id).order("created_at", { ascending: false }),
      supabase.from("events").select("*").eq("profile_id", id).order("event_date", { ascending: true }),
    ]);

    return {
      profile: (profileResult.data as Profile | null) ?? null,
      facts: (factsResult.data as Fact[] | null) ?? [],
      events: (eventsResult.data as Event[] | null) ?? [],
    };
  } catch {
    return { profile: null, facts: [], events: [] };
  }
}

/**
 * Profile detail page — fetches data on the server for authenticated users
 * to eliminate the client-side loading waterfall.
 */
export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  const { profile, facts, events } = await fetchProfileData(id);

  return (
    <ProfileClient
      profileId={id}
      initialProfile={profile}
      initialFacts={facts}
      initialEvents={events}
    />
  );
}
