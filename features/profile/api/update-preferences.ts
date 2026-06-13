"use client";

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

type Preferences = {
  pub_preference: boolean;
  bar_preference: boolean;
  automatic_zoom: boolean;
};

export function useUpdatePreferences(userId: string) {
  return useMutation({
    mutationFn: async (prefs: Preferences) => {
      const { error } = await supabase
        .from("profiles")
        .update({ preferences: prefs })
        .eq("id", userId);
      if (error) throw error;
    },
  });
}
