import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  console.log("Profile data:", user);

  return (
    <ProfileForm
      userId={user.id}
      email={user.email!}
      createdAt={user.created_at}
      preferences={profile?.preferences}
    />
  );
}
