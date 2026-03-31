import { redirect } from "next/navigation";
import Link from "next/link";
import { User } from "lucide-react";
import { createClient } from "@backend/lib/supabase/server";
import { signOut } from "@backend/actions";
import AddProfileForm from "@frontend/components/AddProfileForm";
import type { Profile } from "@backend/types/database";

/** Dashboard — lists all the user's tracked people and provides an add form. */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (profilesError) throw new Error(profilesError.message);

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orbit</h1>
        <form action={signOut}>
          <button type="submit" className="text-sm text-gray-500 underline">
            Sign out
          </button>
        </form>
      </header>

      <AddProfileForm />

      <section>
        <h2 className="text-lg font-semibold mb-3">
          People ({profiles?.length ?? 0})
        </h2>

        {profiles && profiles.length > 0 ? (
          <ul className="space-y-2">
            {profiles.map((profile: Profile) => (
              <li key={profile.id}>
                <Link
                  href={`/profile/${profile.id}`}
                  className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50"
                >
                  <User size={18} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="font-medium">{profile.full_name}</p>
                    {profile.birthday && (
                      <p className="text-sm text-gray-500">
                        Birthday: {new Date(profile.birthday).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">
            No people yet. Add someone above.
          </p>
        )}
      </section>
    </main>
  );
}
