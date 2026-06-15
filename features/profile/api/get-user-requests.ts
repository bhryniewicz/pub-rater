"use client";

import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LocationRequestSchema, type LocationRequest } from "@/features/requests/schemas";
import { QUERY_KEYS } from "@/lib/query-keys";

async function fetchUserRequests(userId: string): Promise<LocationRequest[]> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("requested_by", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => LocationRequestSchema.parse(row));
}

export const getUserRequestsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.USER_REQUESTS(userId),
    queryFn: () => fetchUserRequests(userId),
  });

export function useUserRequests(userId: string) {
  return useSuspenseQuery(getUserRequestsQueryOptions(userId));
}
