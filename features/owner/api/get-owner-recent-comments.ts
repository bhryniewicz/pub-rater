"use client";

import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";

export type RecentReview = {
  id: string;
  comment: string | null;
  rating: number | null;
  createdAt: string;
  userEmail: string | null;
  placeName: string;
  atmosphere: number | null;
  service: number | null;
  space: number | null;
  priceTier: number | null;
  additionalInfo: string[] | null;
};

// Keep old name as alias so other imports don't break
export type RecentComment = RecentReview;

async function fetchOwnerRecentComments(): Promise<RecentReview[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const { data: markers, error: markersError } = await supabase
    .from("markers")
    .select("id, name")
    .eq("owner_id", session.user.id);

  if (markersError) throw markersError;

  const markerMap: Record<string, string> = Object.fromEntries(
    (markers ?? []).map((m) => [m.id, m.name]),
  );
  const markerIds = Object.keys(markerMap);
  if (markerIds.length === 0) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select("id, comment, rating, created_at, user_email, marker_id, atmosphere, service, space, price_tier, additional_info")
    .in("marker_id", markerIds)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    comment: r.comment,
    rating: r.rating,
    createdAt: r.created_at,
    userEmail: r.user_email,
    placeName: markerMap[r.marker_id] ?? "Unknown",
    atmosphere: r.atmosphere,
    service: r.service,
    space: r.space,
    priceTier: r.price_tier,
    additionalInfo: r.additional_info,
  }));
}

export const getOwnerRecentCommentsQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.OWNER_RECENT_COMMENTS,
    queryFn: fetchOwnerRecentComments,
  });

export function useOwnerRecentComments() {
  return useSuspenseQuery(getOwnerRecentCommentsQueryOptions());
}
