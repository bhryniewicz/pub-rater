import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase, type Place, type Review } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { QUERY_KEYS } from "@/lib/query";

export type MarkerInfo = {
  id: string;
  name: string;
  place_type: string;
  lat: number;
  lon: number;
  owner_id: string | null;
};

export type PlaceData = {
  marker: MarkerInfo;
  place: Place | null;
  reviews: Review[];
};

export async function fetchPlaceData(markerId: string, client: SupabaseClient = supabase): Promise<PlaceData> {
  const [markerRes, placeRes, reviewsRes] = await Promise.all([
    client
      .from("markers")
      .select("id, name, place_type, lat, lon, owner_id")
      .eq("id", markerId)
      .single(),
    client.from("places").select("*, short_code").eq("marker_id", markerId).single(),
    client
      .from("reviews")
      .select("*")
      .eq("marker_id", markerId)
      .order("created_at", { ascending: false }),
  ]);

  if (markerRes.error || !markerRes.data) throw new Error("Place not found");

  return {
    marker: markerRes.data as MarkerInfo,
    place: placeRes.data as Place | null,
    reviews: (reviewsRes.data ?? []) as Review[],
  };
}

export const getPlaceQueryOptions = (id: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.PLACE(id),
    queryFn: () => fetchPlaceData(id),
  });

export function usePlace(id: string) {
  return useSuspenseQuery(getPlaceQueryOptions(id));
}
