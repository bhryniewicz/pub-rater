import { requireAdmin } from '@/lib/dal'
import { RequestsList } from './requests-list'

export default async function DashboardPage() {
  await requireAdmin()

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white">Location requests</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Review and approve or reject place suggestions from users.
          </p>
        </div>
        <RequestsList />
      </div>
    </main>
  )
}
