"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { UserData } from "@/features/profile/api/get-user";

type Preferences = {
  bar_preference: boolean;
  pub_preference: boolean;
};

export function OnboardForm({ userId }: { userId: string }) {
  const t = useTranslations("onboard");
  const router = useRouter();
  const queryClient = useQueryClient();
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
    onSuccess: () => {
      queryClient.setQueryData(QUERY_KEYS.USER, (old: UserData | undefined) =>
        old?.profile ? { ...old, profile: { ...old.profile, is_onboarded: true } } : old,
      );
      router.push("/");
    },
  });

  function toggle(key: keyof Preferences) {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-8 max-w-sm w-full">
      <h1 className="text-xl font-semibold text-foreground mb-1">
        {t("title")}
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        {t("subtitle")}
      </p>

      <div className="flex flex-col gap-4 mb-8">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={preferences.pub_preference}
            onChange={() => toggle("pub_preference")}
            className="w-4 h-4 rounded accent-primary"
          />
          <span className="text-sm font-medium text-foreground">
            {t("pubs")}
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={preferences.bar_preference}
            onChange={() => toggle("bar_preference")}
            className="w-4 h-4 rounded accent-primary"
          />
          <span className="text-sm font-medium text-foreground">
            {t("bars")}
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => finishMutation.mutate(preferences)}
          disabled={finishMutation.isPending}
          className="w-full text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg px-4 py-2.5 transition-colors"
        >
          {finishMutation.isPending ? t("saving") : t("done")}
        </button>
        <button
          onClick={() => finishMutation.mutate({ bar_preference: false, pub_preference: false })}
          disabled={finishMutation.isPending}
          className="w-full text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 py-2 transition-colors"
        >
          {t("skip")}
        </button>
      </div>
    </div>
  );
}
