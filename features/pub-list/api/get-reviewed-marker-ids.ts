"use client";

import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/features/profile/api/get-user";
import { getUserReviewsQueryOptions } from "@/features/profile/api/get-user-reviews";

// Set of marker IDs the current user has reviewed. Shares the cache with the
// profile page (same query key) — no extra network if already loaded.
export function useReviewedMarkerIds(): Set<string> {
  const { user } = useUser();
  const { data } = useQuery({
    ...getUserReviewsQueryOptions(user?.id ?? ""),
    enabled: !!user?.id,
    select: (rows) => new Set(rows.map((r) => r.marker_id)),
  });
  return data ?? EMPTY;
}

const EMPTY: Set<string> = new Set();
