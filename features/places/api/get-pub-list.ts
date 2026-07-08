import {
  infiniteQueryOptions,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase, type PubListItem } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";
import { useUser } from "@/features/profile/api/get-user";
import { useGeolocation } from "@/context/geolocation-context";
import { useFilters } from "@/context/filter-context";
import { useSearch } from "@/context/search-context";

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
    .order("rating_score", { ascending: false, nullsFirst: false })
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

// Bulletproof-react query-options factory: single source of truth for the
// pub-list infinite query. Used both client-side (via usePubList) and
// server-side (layout prefetch passes DEFAULT_PUB_LIST_* below).
export function getPubListInfiniteQueryOptions(
  keyParams: ReturnType<typeof toQueryKey>,
  params: QueryParams,
) {
  return infiniteQueryOptions({
    queryKey: [QUERY_KEYS.PUB_LIST, keyParams],
    queryFn: ({ pageParam }) => fetchPubListPage(pageParam, params),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
    staleTime: 2 * 60 * 1000,
  });
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

// Marker-derived filter inputs supplied by the caller (from the markers
// feature). This hook has no knowledge of markers — it only builds the list query.
export type PubListMarkerFilters = {
  markersReady: boolean;
  ownedIds: string[] | null;
  openIds: string[] | null;
  openLateIds: string[] | null;
  nearbyIds: string[] | null;
  voivodeshipIds: string[] | null;
};

export function usePubList({
  markersReady,
  ownedIds,
  openIds,
  openLateIds,
  nearbyIds,
  voivodeshipIds,
}: PubListMarkerFilters) {
  const { user, profile } = useUser();
  const { coords: userLocation } = useGeolocation();
  const { searchQuery, searchSelectedId } = useSearch();
  const {
    categoryFilter,
    filterActive,
    likedFilterActive,
    ownedFilterActive,
    openFilterActive,
    openLateFilterActive,
    minRatingFilter,
    voivodeshipFilter,
    radiusFilter,
  } = useFilters();

  const likedPlaces = useMemo(
    () => profile?.liked_places ?? [],
    [profile?.liked_places],
  );

  const placeTypeFilter = useMemo(() => {
    if (categoryFilter.length > 0) return categoryFilter;
    if (!filterActive || !profile?.preferences) return [];
    const allowed: string[] = [];
    if (profile.preferences.pub_preference) allowed.push("pub");
    if (profile.preferences.bar_preference) allowed.push("bar");
    return allowed;
  }, [categoryFilter, filterActive, profile?.preferences]);

  // Filters whose ID lists are derived client-side from the marker payload —
  // the list query must wait for markers to load, else it would briefly return empty.
  const needsMarkers =
    openFilterActive ||
    openLateFilterActive ||
    radiusFilter !== null ||
    voivodeshipFilter !== null;

  const enabled =
    (!needsMarkers || markersReady) &&
    (!likedFilterActive || !user || !!profile) &&
    (!ownedFilterActive || ownedIds !== null);

  const userLat = userLocation?.lat ?? null;
  const userLon = userLocation?.lon ?? null;

  const queryParams: QueryParams = {
    searchSelectedId,
    searchQuery,
    placeTypeFilter,
    likedFilterActive,
    likedIds: likedPlaces,
    ownedFilterActive,
    ownedIds,
    minRatingFilter,
    openIds,
    openLateIds,
    nearbyIds,
    voivodeshipIds,
  };

  const keyParams = toQueryKey(
    categoryFilter,
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
    userLat,
    userLon,
  );

  const query = useInfiniteQuery({
    ...getPubListInfiniteQueryOptions(keyParams, queryParams),
    enabled,
  });

  return {
    ...query,
    enabled,
  };
}
