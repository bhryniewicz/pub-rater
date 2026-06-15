"use client";

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MutationConfig } from "@/lib/react-query";

type Preferences = {
  bar_preference: boolean;
  pub_preference: boolean;
};

type UseCompleteOnboardingOptions = {
  mutationConfig?: MutationConfig<(prefs: Preferences) => Promise<void>>;
};

export function useCompleteOnboarding(userId: string, { mutationConfig }: UseCompleteOnboardingOptions = {}) {
  return useMutation({
    ...mutationConfig,
    mutationFn: async (prefs: Preferences) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_onboarded: true, preferences: prefs })
        .eq("id", userId);
      if (error) throw error;
    },
  });
}
