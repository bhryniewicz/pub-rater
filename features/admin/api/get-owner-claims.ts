"use client";

import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LocationRequestSchema, type OwnerClaim } from "@/features/requests/schemas";
import { QUERY_KEYS } from "@/lib/query";

async function fetchOwnerClaims(): Promise<OwnerClaim[]> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("type", "owner_claim")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => LocationRequestSchema.parse(row) as OwnerClaim);
}

export const getOwnerClaimsQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.OWNER_CLAIMS,
    queryFn: fetchOwnerClaims,
  });

export function useOwnerClaims() {
  return useSuspenseQuery(getOwnerClaimsQueryOptions());
}
