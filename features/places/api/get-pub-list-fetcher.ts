import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase, type PubListItem } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";

export const PUB_LIST_PAGE_SIZE = 20;

export type QueryParams = {
  searchSelectedId: string | null;
  searchQuery: string;
  placeTypeFilter: string[];
  likedFilterActive: boolean;
  likedIds: string[];
  ownedFilterActive: boolean;
  ownedIds: string[] | null;
  minRatingFilter: number | null;
  // null = filter not active (don't apply), [] = active but no matches (return empty)
  openIds: string[] | null;
  openLateIds: string[] | null;
  nearbyIds: string[] | null;
  voivodeshipIds: string[] | null;
};

export async function fetchPubListPage(
  pageParam: number,
  p: QueryParams,
  client: SupabaseClient = supabase,
): Promise<{ items: PubListItem[]; nextPage: number | null; totalCount: number }> {
  const empty = { items: [], nextPage: null, totalCount: 0 };
  let query = client.from("pub_list").select("*", { count: "exact" });

  if (p.searchSelectedId) {
    query = query.eq("id", p.searchSelectedId);
  } else {
    if (p.searchQuery) {
      query = query.ilike("name", `%${p.searchQuery}%`);
    }
    if (p.likedFilterActive) {
      if (p.likedIds.length === 0) return empty;
      query = query.in("id", p.likedIds);
    }
    if (p.ownedFilterActive) {
      const ids = p.ownedIds ?? [];
      if (ids.length === 0) return empty;
      query = query.in("id", ids);
    }
    if (p.placeTypeFilter.length > 0) {
      query = query.in("place_type", p.placeTypeFilter);
    }
    if (p.voivodeshipIds !== null) {
      if (p.voivodeshipIds.length === 0) return empty;
      query = query.in("id", p.voivodeshipIds);
    }
  }

  if (p.openIds !== null) {
    if (p.openIds.length === 0) return empty;
    query = query.in("id", p.openIds);
  }
  if (p.openLateIds !== null) {
    if (p.openLateIds.length === 0) return empty;
    query = query.in("id", p.openLateIds);
  }
  if (p.nearbyIds !== null) {
    if (p.nearbyIds.length === 0) return empty;
    query = query.in("id", p.nearbyIds);
  }
  if (p.minRatingFilter !== null) {
    query = query.gte("app_rating", p.minRatingFilter);
  }

  query = query
    .order("name")
    .order("id")
    .range(pageParam, pageParam + PUB_LIST_PAGE_SIZE - 1);

  const { data, error, count } = await query;

  if (error || !data) return empty;

  return {
    items: data as PubListItem[],
    nextPage:
      data.length === PUB_LIST_PAGE_SIZE ? pageParam + PUB_LIST_PAGE_SIZE : null,
    totalCount: count ?? 0,
  };
}

export function toQueryKey(
  categoryFilter: string[],
  filterActive: boolean,
  likedFilterActive: boolean,
  ownedFilterActive: boolean,
  openFilterActive: boolean,
  openLateFilterActive: boolean,
  minRatingFilter: number | null,
  voivodeshipFilter: string | null,
  radiusFilter: number | null,
  searchQuery: string,
  searchSelectedId: string | null,
  userLat: number | null,
  userLon: number | null,
) {
  return {
    categoryFilter: [...categoryFilter].sort(),
    filterActive,
    likedFilterActive,
    ownedFilterActive,
    openFilterActive,
    openLateFilterActive,
    minRatingFilter,
    voivodeshipFilter,
    radiusFilter,
    searchQuery,
    searchSelectedId,
    userLat: userLat !== null ? Math.round(userLat * 100) / 100 : null,
    userLon: userLon !== null ? Math.round(userLon * 100) / 100 : null,
  };
}

// The query key and params for the default no-filter state — used for server-side prefetch
export const DEFAULT_PUB_LIST_PARAMS: QueryParams = {
  searchSelectedId: null,
  searchQuery: "",
  placeTypeFilter: [],
  likedFilterActive: false,
  likedIds: [],
  ownedFilterActive: false,
  ownedIds: null,
  minRatingFilter: null,
  openIds: null,
  openLateIds: null,
  nearbyIds: null,
  voivodeshipIds: null,
};

export const DEFAULT_PUB_LIST_QUERY_KEY = [
  QUERY_KEYS.PUB_LIST,
  toQueryKey([], false, false, false, false, false, null, null, null, "", null, null, null),
] as const;
