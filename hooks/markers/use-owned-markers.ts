"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";

export function useOwnedMarkers(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.OWNED_MARKERS(userId ?? ""),
    queryFn: async () => {
      const { data } = await supabase
        .from("markers")
        .select("id")
        .eq("owner_id", userId!);
      return (data ?? []).map((m: { id: string }) => m.id);
    },
    enabled,
  });
}
