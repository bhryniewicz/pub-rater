"use client";

import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ReviewSchema, type Review } from "@/schemas";
import { QUERY_KEYS } from "@/lib/query";

async function fetchUserReviews(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ReviewSchema.parse(row));
}

export const getUserReviewsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.USER_REVIEWS(userId),
    queryFn: () => fetchUserReviews(userId),
  });

export function useUserReviews(userId: string) {
  return useSuspenseQuery(getUserReviewsQueryOptions(userId));
}
