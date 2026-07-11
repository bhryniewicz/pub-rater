"use client";

import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query";
import { isOpenNow } from "@/lib/opening-hours";
import type { OpeningHours } from "@/schemas/entities";

export type OwnedPlaceStat = {
  id: string;
  name: string;
  placeType: string;
  isOpen: boolean;
  ownerSince: string;
  appRating: number | null;
  reviewCount: number | null;
  address: string | null;
  city: string | null;
};

export type OwnerStats = {
  ownedPlacesCount: number;
  averageRating: number;
  totalComments: number;
  totalRatings: number;
  places: OwnedPlaceStat[];
};

const DEFAULT: OwnerStats = {
  ownedPlacesCount: 0,
  averageRating: 0,
  totalComments: 0,
  totalRatings: 0,
  places: [],
};

async function fetchOwnerStats(): Promise<OwnerStats> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return DEFAULT;

  const { data: markers, error } = await supabase
    .from("markers")
    .select("id, name, place_type, created_at, places(app_rating, app_review_count, opening_hours, address, city)")
    .eq("owner_id", session.user.id)
    .order("name");

  if (error) throw error;

  const rows = markers ?? [];
  const markerIds = rows.map((m) => m.id);

  const [commentsRes, ratingsRes] = await Promise.all([
    markerIds.length > 0
      ? supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .in("marker_id", markerIds)
          .not("comment", "is", null)
      : Promise.resolve({ count: 0, error: null }),
    markerIds.length > 0
      ? supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .in("marker_id", markerIds)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const appRatings = rows
    .map((m) => {
      const p = Array.isArray(m.places) ? m.places[0] : m.places;
      return p?.app_rating != null ? Number(p.app_rating) : null;
    })
    .filter((r): r is number => r !== null && r > 0);

  const averageRating =
    appRatings.length > 0
      ? appRatings.reduce((a, b) => a + b, 0) / appRatings.length
      : 0;

  const places: OwnedPlaceStat[] = rows.map((m) => {
    const p = Array.isArray(m.places) ? m.places[0] : m.places;
    const oh = p?.opening_hours as OpeningHours | null;
    return {
      id: m.id,
      name: m.name,
      placeType: m.place_type,
      isOpen: oh ? isOpenNow(oh) : false,
      ownerSince: m.created_at ?? "",
      appRating: p?.app_rating != null ? Number(p.app_rating) : null,
      reviewCount: p?.app_review_count ?? null,
      address: p?.address ?? null,
      city: p?.city ?? null,
    };
  });

  return {
    ownedPlacesCount: rows.length,
    averageRating,
    totalComments: commentsRes.count ?? 0,
    totalRatings: ratingsRes.count ?? 0,
    places,
  };
}

export const getOwnerStatsQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.OWNER_STATS,
    queryFn: fetchOwnerStats,
  });

export function useOwnerStats() {
  return useSuspenseQuery(getOwnerStatsQueryOptions());
}
