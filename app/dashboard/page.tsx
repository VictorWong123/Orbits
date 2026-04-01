import { redirect } from "next/navigation";
import { createClient } from "@backend/lib/supabase/server";
import AddProfileForm from "@frontend/components/AddProfileForm";
import ProfileList from "@frontend/components/ProfileList";
import UserAvatar from "@frontend/components/UserAvatar";

/** Dashboard — lists all the user's tracked people and provides an add form. */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*, facts(category)")
    .order("full_name", { ascending: true });

  if (profilesError) throw new Error(profilesError.message);

  return (
    <main className="max-w-md mx-auto bg-[#FDFBF7] min-h-screen">
      <header className="flex items-center justify-between px-6 py-6">
        <h1 className="text-2xl font-bold text-[#1A3021]">Orbit</h1>
        <UserAvatar email={user.email ?? ""} />
      </header>

      <div className="px-6 pb-8 space-y-6">
        <AddProfileForm existingNames={(profiles ?? []).map((p) => p.full_name)} />
        <ProfileList profiles={profiles ?? []} />
      </div>
    </main>
  );
}
