import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import OnboardForm from "./onboard-form";

export default async function OnboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_onboarded")
    .eq("id", user.id)
    .single();

  if (profile?.is_onboarded) redirect("/");

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <OnboardForm userId={user.id} />
    </main>
  );
}
