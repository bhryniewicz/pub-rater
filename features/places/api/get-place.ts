"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase, type Place, type Review } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";

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

async function fetchPlaceData(markerId: string): Promise<PlaceData> {
  const [markerRes, placeRes, reviewsRes] = await Promise.all([
    supabase
      .from("markers")
      .select("id, name, place_type, lat, lon, owner_id")
      .eq("id", markerId)
      .single(),
    supabase.from("places").select("*, short_code").eq("marker_id", markerId).single(),
    supabase
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

export function usePlace(id: string) {
  return useSuspenseQuery({
    queryKey: QUERY_KEYS.PLACE(id),
    queryFn: () => fetchPlaceData(id),
  });
}
