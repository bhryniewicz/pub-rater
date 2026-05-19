import { requireDashboard } from '@/lib/dal'
import { RequestsList } from './requests-list'
import { OwnedPlaces } from './owned-places'

export default async function DashboardPage() {
  const { role } = await requireDashboard()

  if (role === 'admin') {
    return (
      <main className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">Location requests</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review and approve or reject place suggestions from users.
            </p>
          </div>
          <RequestsList />
        </div>
      </main>
    )
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
  )
}
