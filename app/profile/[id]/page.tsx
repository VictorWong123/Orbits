import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@backend/lib/supabase/server";
import { deleteProfile } from "@backend/actions";
import ProfileTabs from "@frontend/components/ProfileTabs";
import DeleteProfileButton from "@frontend/components/ui/DeleteProfileButton";
import UserAvatar from "@frontend/components/UserAvatar";

interface Props {
  params: Promise<{ id: string }>;
}

/** Profile detail page — shows a person's notes (facts) and info (events + birthday). */
export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const [
    { data: facts, error: factsError },
    { data: events, error: eventsError },
  ] = await Promise.all([
    supabase
      .from("facts")
      .select("*")
      .eq("profile_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("events")
      .select("*")
      .eq("profile_id", id)
      .order("event_date", { ascending: true }),
  ]);

  if (factsError) throw new Error(factsError.message);
  if (eventsError) throw new Error(eventsError.message);

  /** Forwards deleteProfile errors to the client component. */
  async function deleteThisProfile(): Promise<string> {
    "use server";
    return deleteProfile(id);
  }

  return (
    <main className="max-w-md mx-auto bg-[#FDFBF7] min-h-screen">
      {/* Header: back | name | avatar + actions */}
      <header className="flex items-center gap-3 px-6 py-6">
        <Link
          href="/dashboard"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:opacity-80 transition-opacity shrink-0"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[#1A3021] truncate">{profile.full_name}</h1>
        </div>
        <DeleteProfileButton
          profileName={profile.full_name}
          action={deleteThisProfile}
        />
        <UserAvatar email={user.email ?? ""} />
      </header>

      {/* Tabbed content */}
      <div className="px-6 pb-8">
        <ProfileTabs
          profile={{
            id: profile.id,
            full_name: profile.full_name,
            birthday: profile.birthday,
          }}
          facts={facts ?? []}
          events={events ?? []}
        />
      </div>
    </main>
  );
}
