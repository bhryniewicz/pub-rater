"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query";

async function fetchOwnedMarkers(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("markers")
    .select("id")
    .eq("owner_id", userId);
  return (data ?? []).map((m: { id: string }) => m.id);
}

export const getOwnedMarkersQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.OWNED_MARKERS(userId),
    queryFn: () => fetchOwnedMarkers(userId),
  });

export function useOwnedMarkers(userId: string | undefined, enabled: boolean) {
  return useQuery({
    ...getOwnedMarkersQueryOptions(userId ?? ""),
    enabled,
  });
}
