"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMarkersEnrichment } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";

const ENRICHMENT_STALE_TIME = 5 * 60 * 1000;

export function useMarkersEnrichment(enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.MARKERS_ENRICHMENT,
    queryFn: fetchMarkersEnrichment,
    staleTime: ENRICHMENT_STALE_TIME,
    enabled,
  });
}
