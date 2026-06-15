"use client";

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MutationConfig } from "@/lib/react-query";

type Preferences = {
  pub_preference: boolean;
  bar_preference: boolean;
  automatic_zoom: boolean;
};

type UseUpdatePreferencesOptions = {
  mutationConfig?: MutationConfig<(prefs: Preferences) => Promise<void>>;
};

export function useUpdatePreferences(userId: string, { mutationConfig }: UseUpdatePreferencesOptions = {}) {
  return useMutation({
    ...mutationConfig,
    mutationFn: async (prefs: Preferences) => {
      const { error } = await supabase
        .from("profiles")
        .update({ preferences: prefs })
        .eq("id", userId);
      if (error) throw error;
    },
  });
}
