"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Preferences = {
  pub_preference: boolean;
  bar_preference: boolean;
};

type Props = {
  userId: string;
  email: string;
  createdAt: string;
  preferences: Preferences;
};

export default function ProfileForm({ userId, email, createdAt, preferences: initialPreferences }: Props) {
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof Preferences) {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ preferences })
      .eq("id", userId);
    setSaving(false);
    setSaved(true);
  }

  const joinedAt = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm p-8 max-w-sm w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Profile</h1>
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Back
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">
          Account
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Email</p>
            <p className="text-sm font-medium text-zinc-100">{email}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Member since</p>
            <p className="text-sm font-medium text-zinc-100">{joinedAt}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">User ID</p>
            <p className="text-xs font-mono text-zinc-400 break-all">{userId}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">
          Preferences
        </h2>
        <div className="flex flex-col gap-3 mb-5">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={preferences.pub_preference}
              onChange={() => toggle("pub_preference")}
              className="w-4 h-4 rounded accent-yellow-400"
            />
            <span className="text-sm font-medium text-zinc-200 group-hover:text-white">
              🍺 Pubs
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={preferences.bar_preference}
              onChange={() => toggle("bar_preference")}
              className="w-4 h-4 rounded accent-yellow-400"
            />
            <span className="text-sm font-medium text-zinc-200 group-hover:text-white">
              🥂 Bars
            </span>
          </label>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full text-sm font-medium text-zinc-950 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 rounded-lg px-4 py-2.5 transition-colors"
        >
          {saving ? "Saving..." : saved ? "Saved" : "Save preferences"}
        </button>
      </section>

      <div className="mt-6 pt-6 border-t border-zinc-800">
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full text-sm font-medium text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg px-4 py-2.5 transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
