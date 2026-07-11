import { queryOptions, useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query";

export type PlaceTypeCounts = Record<string, number>;

export async function fetchPlaceTypeCounts(
  client: SupabaseClient = supabase,
): Promise<PlaceTypeCounts> {
  const { data, error } = await client.rpc("get_place_type_counts");
  if (error || !data) return {};
  return (
    data as { place_type: string; count: number }[]
  ).reduce<PlaceTypeCounts>((acc, row) => {
    acc[row.place_type] = Number(row.count);
    return acc;
  }, {});
}

export const getPlaceTypeCountsQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.PLACE_TYPE_COUNTS,
    queryFn: () => fetchPlaceTypeCounts(),
    staleTime: 5 * 60 * 1000,
  });

export function usePlaceTypeCounts() {
  return useQuery(getPlaceTypeCountsQueryOptions());
}
