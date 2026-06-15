import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MapMarker } from "@/features/places/schemas";

export async function fetchAllMarkers(client: SupabaseClient = supabase): Promise<MapMarker[]> {
  const pageSize = 1000;
  let all: MapMarker[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from("markers")
      .select("id, name, place_type, lat, lon, outdoor_seating, voivodeship")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error || !data) break;
    const flat = (data as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      opening_hours: null,
      app_rating: null,
    })) as MapMarker[];
    all = all.concat(flat);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export const getMarkersQueryOptions = () =>
  queryOptions({
    queryKey: ["markers"],
    queryFn: () => fetchAllMarkers(),
    staleTime: Infinity,
  });

export function useMarkers() {
  return useSuspenseQuery(getMarkersQueryOptions());
}
