"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Preferences = {
  bar_preference: boolean;
  pub_preference: boolean;
};

type Props = {
  userId: string;
  onDone: () => void;
};

export default function OnboardingModal({ userId, onDone }: Props) {
  const [preferences, setPreferences] = useState<Preferences>({
    bar_preference: false,
    pub_preference: false,
  });
  const [saving, setSaving] = useState(false);

  async function finish(prefs: Preferences) {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ is_onboarded: true, preferences: prefs })
      .eq("id", userId);
    setSaving(false);
    onDone();
  }

  function toggle(key: keyof Preferences) {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl p-8 max-w-sm w-full mx-4">
        <h2 className="text-xl font-semibold text-zinc-900 mb-1">
          Welcome to Pub Rater
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          What kind of places are you into?
        </p>

        <div className="flex flex-col gap-3 mb-8">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={preferences.pub_preference}
              onChange={() => toggle("pub_preference")}
              className="w-4 h-4 rounded accent-zinc-900"
            />
            <span className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900">
              🍺 Pubs
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={preferences.bar_preference}
              onChange={() => toggle("bar_preference")}
              className="w-4 h-4 rounded accent-zinc-900"
            />
            <span className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900">
              🥂 Bars
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => finish(preferences)}
            disabled={saving}
            className="w-full text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 disabled:opacity-50 rounded-lg px-4 py-2.5 transition-colors"
          >
            {saving ? "Saving..." : "Done"}
          </button>
          <button
            onClick={() =>
              finish({ bar_preference: false, pub_preference: false })
            }
            disabled={saving}
            className="w-full text-sm font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-50 py-2 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
