"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LocationRequestSchema } from "@/lib/schemas";
import { QUERY_KEYS } from "@/lib/query-keys";

async function fetchRecentRequests() {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []).map((row) => LocationRequestSchema.parse(row));
}

export function useRecentRequests() {
  return useSuspenseQuery({
    queryKey: QUERY_KEYS.RECENT_REQUESTS,
    queryFn: fetchRecentRequests,
  });
}
