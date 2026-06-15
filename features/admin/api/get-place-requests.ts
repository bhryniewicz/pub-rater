"use client";

import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LocationRequestSchema, type PlaceRequest } from "@/features/requests/schemas";
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

export const getPlaceRequestsQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.PLACE_REQUESTS,
    queryFn: fetchPlaceRequests,
  });

export function usePlaceRequests() {
  return useSuspenseQuery(getPlaceRequestsQueryOptions());
}
