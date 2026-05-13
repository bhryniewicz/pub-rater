import { requireUser } from "@/lib/dal";

export default async function GuardedPage() {
  const user = await requireUser();

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-10 max-w-md w-full text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">
          Protected Page
        </h1>
        <p className="text-zinc-500 text-sm mb-6">
          You are viewing this page because you are logged in.
        </p>
        {user && (
          <div className="bg-zinc-50 rounded-xl border border-zinc-200 px-4 py-3 text-left">
            <p className="text-xs text-zinc-400 uppercase font-semibold tracking-wide mb-1">
              Logged in as
            </p>
            <p className="text-sm font-medium text-zinc-800 truncate">
              {user.email}
            </p>
            <p className="text-xs text-zinc-400 mt-1 font-mono">{user.id}</p>
          </div>
        )}
      </div>
    </main>
  );
}
