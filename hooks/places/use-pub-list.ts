"use client";

import {
  useInfiniteQuery,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { supabase, type PubListItem } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";

export const PUB_LIST_PAGE_SIZE = 20;

export type PubListFilters = {
  amenityFilter: string[];
  likedPlaces: string[];
  likedFilterActive: boolean;
  ownedFilterActive: boolean;
  ownedIds: string[] | null;
  openIds: string[] | null;
  openLateIds: string[] | null;
  minRatingFilter: number | null;
  voivodeshipIds: string[] | null;
  nearbyIds: string[] | null;
  searchQuery: string;
  searchSelectedId: string | null;
};

async function fetchPubListPage(
  pageParam: number,
  filters: PubListFilters,
): Promise<{ items: PubListItem[]; nextPage: number | null }> {
  let query = supabase
    .from("pub_list")
    .select("*")
    .order("name")
    .order("id")
    .range(pageParam, pageParam + PUB_LIST_PAGE_SIZE - 1);

  if (filters.searchSelectedId) {
    query = query.eq("id", filters.searchSelectedId);
  } else if (filters.searchQuery) {
    query = query.ilike("name", `%${filters.searchQuery}%`);
  } else if (filters.likedFilterActive) {
    const ids = filters.voivodeshipIds
      ? filters.likedPlaces.filter((id) => filters.voivodeshipIds!.includes(id))
      : filters.likedPlaces;
    if (ids.length === 0) return { items: [], nextPage: null };
    query = query.in("id", ids);
  } else if (filters.ownedFilterActive) {
    const ids = filters.ownedIds ?? [];
    if (ids.length === 0) return { items: [], nextPage: null };
    query = query.in("id", ids);
  } else {
    if (filters.amenityFilter.length > 0) {
      query = query.in("amenity", filters.amenityFilter);
    }
    if (filters.voivodeshipIds && filters.voivodeshipIds.length > 0) {
      query = query.in("id", filters.voivodeshipIds);
    }
  }

  if (filters.openIds !== null) {
    if (filters.openIds.length === 0) return { items: [], nextPage: null };
    query = query.in("id", filters.openIds);
  }

  if (filters.openLateIds !== null) {
    if (filters.openLateIds.length === 0) return { items: [], nextPage: null };
    query = query.in("id", filters.openLateIds);
  }

  if (filters.minRatingFilter !== null) {
    query = query.gte("app_rating", filters.minRatingFilter);
  }

  if (filters.nearbyIds !== null) {
    if (filters.nearbyIds.length === 0) return { items: [], nextPage: null };
    query = query.in("id", filters.nearbyIds);
  }

  const { data, error } = await query;
  if (error || !data) return { items: [], nextPage: null };

  return {
    items: data as PubListItem[],
    nextPage:
      data.length === PUB_LIST_PAGE_SIZE
        ? pageParam + PUB_LIST_PAGE_SIZE
        : null,
  };
}

export function usePubList(filters: PubListFilters) {
  return useInfiniteQuery({
    queryKey: [
      QUERY_KEYS.PUB_LIST,
      filters.amenityFilter,
      filters.likedFilterActive,
      filters.likedFilterActive ? filters.likedPlaces : [],
      filters.ownedFilterActive,
      filters.ownedFilterActive ? filters.ownedIds : null,
      filters.openIds,
      filters.openLateIds,
      filters.minRatingFilter,
      filters.voivodeshipIds,
      filters.nearbyIds,
      filters.searchQuery,
      filters.searchSelectedId,
    ],
    queryFn: ({ pageParam }) => fetchPubListPage(pageParam as number, filters),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
    staleTime: 2 * 60 * 1000,
  });
}
