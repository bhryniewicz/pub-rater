"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ReviewSchema, type Review } from "@/lib/schemas";
import { QUERY_KEYS } from "@/lib/query-keys";

async function fetchUserReviews(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ReviewSchema.parse(row));
}

export function useUserReviews(userId: string) {
  return useSuspenseQuery({
    queryKey: QUERY_KEYS.USER_REVIEWS(userId),
    queryFn: () => fetchUserReviews(userId),
  });
}
