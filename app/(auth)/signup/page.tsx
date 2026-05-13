"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setPending(false);
      setError(signUpError.message);
      return;
    }

    // If email confirmation is disabled in Supabase, signUp returns a session
    // immediately and the user is logged in. Otherwise session will be null.
    if (data.session) {
      router.push("/");
      return;
    }

    // Email confirmation is on — sign in directly (works once confirmation is off)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setPending(false);

    if (signInError) {
      // Most likely email confirmation is required
      setError(
        "Account created! Check your email to confirm it, then log in."
      );
      return;
    }

    router.push("/");
  }

  return (
    <main className="flex flex-col h-screen">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200 bg-white shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🍺</span>
          <h1 className="font-semibold text-zinc-900">Pub Rater</h1>
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center bg-zinc-50">
        <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900 mb-6">
            Create account
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-zinc-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-zinc-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-zinc-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-zinc-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                placeholder="Min. 6 characters"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 bg-zinc-900 text-white text-sm font-medium rounded-lg px-4 py-2.5 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? "Creating account…" : "Create account"}
            </button>

            <p className="text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <Link href="/login" className="text-zinc-900 font-medium hover:underline">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
