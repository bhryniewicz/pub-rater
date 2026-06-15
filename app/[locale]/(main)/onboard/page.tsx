import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { OnboardForm } from "@/features/profile/components/onboard-form";

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
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <OnboardForm userId={user.id} />
    </main>
  );
}
