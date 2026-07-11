"use client";

import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query";

export type OwnedPlace = {
  id: string;
  name: string;
  place_type: string;
  city: string | null;
  address: string | null;
};

async function fetchOwnedPlaces(): Promise<OwnedPlace[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from("markers")
    .select("id, name, place_type, places(city, address)")
    .eq("owner_id", session.user.id)
    .order("name");

  if (error) throw error;

  return (data ?? []).map((row) => {
    const place = Array.isArray(row.places) ? row.places[0] : row.places;
    return {
      id: row.id,
      name: row.name,
      place_type: row.place_type,
      city: place?.city ?? null,
      address: place?.address ?? null,
    };
  });
}

export const getOwnedPlacesQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.OWNED_PLACES,
    queryFn: fetchOwnedPlaces,
  });

export function useOwnedPlaces() {
  return useSuspenseQuery(getOwnedPlacesQueryOptions());
}
