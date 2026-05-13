"use client";

import Link from "next/link";
import { useUser } from "@/hooks/use-user";

export function Navbar() {
  const { user } = useUser();

  return (
    <header className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
      <span className="text-xl">🍺</span>
      <h1 className="font-semibold text-white">
        <Link href="/">Pub Rater</Link>
      </h1>
      <div className="ml-auto flex items-center gap-2">
        {user ? (
          <Link
            href="/profile"
            aria-label="Profile"
            className="text-zinc-200 hover:text-white border border-zinc-700 rounded-lg p-1.5 hover:border-zinc-500 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-300 hover:text-white px-3 py-1.5 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium text-zinc-950 bg-yellow-400 hover:bg-yellow-300 rounded-lg px-3 py-1.5 transition-colors"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
