import { Suspense } from "react";
import { requireDashboard } from "@/lib/supabase/auth";
import { AdminConsole } from "@/features/admin/components/admin-console";
import { OwnerConsole } from "@/features/owner/components/owner-console";

export default async function DashboardPage() {
  const { role } = await requireDashboard();

  if (role === "admin") {
    return (
      <Suspense>
        <AdminConsole />
      </Suspense>
    );
  }

  return (
    <Suspense>
      <OwnerConsole />
    </Suspense>
  );
}
