import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MapMarker } from "@/features/places/schemas";

export async function fetchAllMarkers(client: SupabaseClient = supabase): Promise<MapMarker[]> {
  const { data, error } = await client.rpc("get_all_markers");
  if (error || !data) return [];
  return data as MapMarker[];
}

export const getMarkersQueryOptions = () =>
  queryOptions({
    queryKey: ["markers"],
    queryFn: () => fetchAllMarkers(),
    staleTime: Infinity,
  });
