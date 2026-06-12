"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";

export function useProfile(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.PROFILE(userId ?? ""),
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_onboarded, preferences, liked_places, role")
        .eq("id", userId!)
        .single();
      return data;
    },
    enabled,
  });
}
