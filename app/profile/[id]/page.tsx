import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@backend/lib/supabase/server";
import { deleteProfile, deleteFact, deleteEvent } from "@backend/actions";
import AddFactForm from "@frontend/components/AddFactForm";
import AddEventForm from "@frontend/components/AddEventForm";
import DeleteButton from "@frontend/components/ui/DeleteButton";
import DeleteProfileButton from "@frontend/components/ui/DeleteProfileButton";
import type { Fact, Event } from "@backend/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

/** Profile detail page — shows a person's facts and upcoming events. */
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
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-black"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
        <DeleteProfileButton
          profileName={profile.full_name}
          action={deleteThisProfile}
        />
      </header>

      <section>
        <h1 className="text-2xl font-bold">{profile.full_name}</h1>
        {profile.birthday && (
          <p className="text-sm text-gray-500 mt-1">
            Birthday: {new Date(profile.birthday).toLocaleDateString()}
          </p>
        )}
      </section>

      {/* Facts */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Facts</h2>
        <AddFactForm profileId={id} />
        {facts && facts.length > 0 ? (
          <ul className="space-y-2">
            {facts.map((fact: Fact) => (
              <li
                key={fact.id}
                className="flex items-start justify-between gap-2 p-3 border rounded"
              >
                <div>
                  <p className="text-sm">{fact.content}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fact.category}</p>
                </div>
                <DeleteButton
                  onDelete={deleteFact.bind(null, fact.id, id)}
                  ariaLabel="Delete fact"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">No facts recorded yet.</p>
        )}
      </section>

      {/* Events */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Events</h2>
        <AddEventForm profileId={id} />
        {events && events.length > 0 ? (
          <ul className="space-y-2">
            {events.map((event: Event) => (
              <li
                key={event.id}
                className="flex items-start justify-between gap-2 p-3 border rounded"
              >
                <div>
                  <p className="font-medium text-sm">{event.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(event.event_date).toLocaleString()}
                  </p>
                  {event.notes && (
                    <p className="text-sm text-gray-600 mt-1">{event.notes}</p>
                  )}
                </div>
                <DeleteButton
                  onDelete={deleteEvent.bind(null, event.id, id)}
                  ariaLabel="Delete event"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">No events recorded yet.</p>
        )}
      </section>
    </main>
  );
}
