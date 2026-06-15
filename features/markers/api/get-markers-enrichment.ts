import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MapMarker } from "@/features/places/schemas";

type EnrichmentMap = Record<string, { opening_hours: MapMarker["opening_hours"]; app_rating: number | null }>;

async function fetchMarkersEnrichment(): Promise<EnrichmentMap> {
  const pageSize = 1000;
  const result: EnrichmentMap = {};
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("markers")
      .select("id, places(opening_hours, app_rating)")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error || !data) break;
    for (const row of data as unknown as Array<{ id: string; places: { opening_hours: MapMarker["opening_hours"]; app_rating: number | null } | null }>) {
      result[row.id] = {
        opening_hours: row.places?.opening_hours ?? null,
        app_rating: row.places?.app_rating ?? null,
      };
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return result;
}

export const getMarkersEnrichmentQueryOptions = () =>
  queryOptions({
    queryKey: ["markers_enrichment"],
    queryFn: fetchMarkersEnrichment,
    staleTime: Infinity,
  });

export function useMarkersEnrichment(enabled: boolean) {
  return useQuery({
    ...getMarkersEnrichmentQueryOptions(),
    enabled,
  });
}
