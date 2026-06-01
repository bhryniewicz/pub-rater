import { requireDashboard } from "@/lib/dal";
import { AdminConsole } from "./admin-console";
import { OwnedPlaces } from "./owned-places";

export default async function DashboardPage() {
  const { role } = await requireDashboard();

  if (role === "admin") {
    return <AdminConsole />;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Your places</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Places assigned to your owner account.
          </p>
        </div>
        <OwnedPlaces />
      </div>
    </main>
  );
}
