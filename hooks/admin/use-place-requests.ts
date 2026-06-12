"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LocationRequestSchema, type PlaceRequest } from "@/lib/schemas";
import { QUERY_KEYS } from "@/lib/query-keys";

async function fetchPlaceRequests(): Promise<PlaceRequest[]> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("type", "place_request")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => LocationRequestSchema.parse(row) as PlaceRequest);
}

export function usePlaceRequests() {
  return useSuspenseQuery({
    queryKey: QUERY_KEYS.PLACE_REQUESTS,
    queryFn: fetchPlaceRequests,
  });
}
