"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { fetchAllMarkers } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";

const STALE_TIME = Infinity;

export function useMarkers() {
  return useSuspenseQuery({
    queryKey: QUERY_KEYS.MARKERS,
    queryFn: () => fetchAllMarkers(),
    staleTime: STALE_TIME,
  });
}
