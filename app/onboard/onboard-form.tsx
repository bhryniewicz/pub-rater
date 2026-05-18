"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

type Preferences = {
  bar_preference: boolean;
  pub_preference: boolean;
};

export default function OnboardForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [preferences, setPreferences] = useState<Preferences>({
    bar_preference: false,
    pub_preference: false,
  });

  const finishMutation = useMutation({
    mutationFn: async (prefs: Preferences) => {
      await supabase
        .from("profiles")
        .update({ is_onboarded: true, preferences: prefs })
        .eq("id", userId);
    },
    onSuccess: () => router.push("/"),
  });

  function toggle(key: keyof Preferences) {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm p-8 max-w-sm w-full">
      <div className="text-3xl mb-4">🍺</div>
      <h1 className="text-xl font-semibold text-white mb-1">
        Welcome to Pub Rater
      </h1>
      <p className="text-sm text-zinc-400 mb-8">
        What kind of places are you into?
      </p>

      <div className="flex flex-col gap-4 mb-8">
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

      <div className="flex flex-col gap-2">
        <button
          onClick={() => finishMutation.mutate(preferences)}
          disabled={finishMutation.isPending}
          className="w-full text-sm font-medium text-zinc-950 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 rounded-lg px-4 py-2.5 transition-colors"
        >
          {finishMutation.isPending ? "Saving..." : "Done"}
        </button>
        <button
          onClick={() => finishMutation.mutate({ bar_preference: false, pub_preference: false })}
          disabled={finishMutation.isPending}
          className="w-full text-sm font-medium text-zinc-500 hover:text-zinc-300 disabled:opacity-50 py-2 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
