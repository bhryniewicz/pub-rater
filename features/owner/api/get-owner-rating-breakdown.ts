"use client";

import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";

export type RatingBreakdownItem = {
  star: number;
  count: number;
  percentage: number;
};

async function fetchOwnerRatingBreakdown(): Promise<RatingBreakdownItem[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return buildBreakdown({});

  const { data: markers, error: markersError } = await supabase
    .from("markers")
    .select("id")
    .eq("owner_id", session.user.id);

  if (markersError) throw markersError;

  const markerIds = (markers ?? []).map((m) => m.id);
  if (markerIds.length === 0) return buildBreakdown({});

  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .in("marker_id", markerIds)
    .not("rating", "is", null);

  if (error) throw error;

  const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of data ?? []) {
    const star = r.rating as number;
    if (star >= 1 && star <= 5) counts[star]++;
  }

  return buildBreakdown(counts);
}

function buildBreakdown(counts: Record<number, number>): RatingBreakdownItem[] {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: counts[star] ?? 0,
    percentage: total > 0 ? ((counts[star] ?? 0) / total) * 100 : 0,
  }));
}

export const getOwnerRatingBreakdownQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.OWNER_RATING_BREAKDOWN,
    queryFn: fetchOwnerRatingBreakdown,
  });

export function useOwnerRatingBreakdown() {
  return useSuspenseQuery(getOwnerRatingBreakdownQueryOptions());
}
