"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { fetchAllMarkers } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";

const MARKERS_STALE_TIME = 5 * 60 * 1000;

export function useMarkers() {
  return useSuspenseQuery({
    queryKey: QUERY_KEYS.MARKERS,
    queryFn: () => fetchAllMarkers(),
    staleTime: MARKERS_STALE_TIME,
  });
}
