import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <ProfileForm
        userId={user.id}
        email={user.email ?? ""}
        createdAt={user.created_at}
        preferences={profile?.preferences ?? { pub_preference: false, bar_preference: false }}
      />
    </main>
  );
}
