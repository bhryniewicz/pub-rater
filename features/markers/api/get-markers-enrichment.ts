"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMarkersEnrichment } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";

const STALE_TIME = Infinity;

export function useMarkersEnrichment(enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.MARKERS_ENRICHMENT,
    queryFn: fetchMarkersEnrichment,
    staleTime: STALE_TIME,
    enabled,
  });
}
