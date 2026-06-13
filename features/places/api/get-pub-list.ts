"use client";

import {
  useInfiniteQuery,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";
import {
  supabase,
  fetchAllMarkers,
  fetchMarkersEnrichment,
  type PubListItem,
} from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";
import { useUser } from "@/hooks/use-user";
import { useGeolocation } from "@/context/geolocation-context";
import { useFilters } from "@/context/filter-context";
import { useSearch } from "@/context/search-context";
import { useProfile } from "@/features/profile/api/get-profile";
import { useOwnedMarkers } from "@/features/markers/api/get-owned-markers";
import { isOpenNow, isOpenLate } from "@/lib/opening-hours";

export const PUB_LIST_PAGE_SIZE = 20;

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Params the server query uses — only what Supabase can filter on directly,
// plus pre-computed ID arrays for client-side filters (open/late/nearby/voivodeship).
// Kept separate from filteredMarkers which is map-only.
type QueryParams = {
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

async function fetchPubListPage(
  pageParam: number,
  p: QueryParams,
): Promise<{
  items: PubListItem[];
  nextPage: number | null;
  totalCount: number;
}> {
  console.log("starting query with params", p, "pageParam", pageParam);
  const empty = { items: [], nextPage: null, totalCount: 0 };
  let query = supabase.from("pub_list").select("*", { count: "exact" });

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

  console.log(error ? "query error" : "query success", { error, data, count });
  if (error || !data) return empty;

  return {
    items: data as PubListItem[],
    nextPage:
      data.length === PUB_LIST_PAGE_SIZE
        ? pageParam + PUB_LIST_PAGE_SIZE
        : null,
    totalCount: count ?? 0,
  };
}

function toQueryKey(
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

export function usePubList() {
  const { user, loading: userLoading } = useUser();
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

  const { data: mapMarkers } = useSuspenseQuery({
    queryKey: QUERY_KEYS.MARKERS,
    queryFn: () => fetchAllMarkers(),
    staleTime: 5 * 60 * 1000,
  });

  const needsEnrichment =
    openFilterActive || openLateFilterActive || minRatingFilter !== null;

  const { data: enrichment = {} } = useQuery({
    queryKey: QUERY_KEYS.MARKERS_ENRICHMENT,
    queryFn: () => fetchMarkersEnrichment(),
    staleTime: 5 * 60 * 1000,
    enabled: needsEnrichment,
  });

  const { data: profile } = useProfile(user?.id, !!user && !userLoading);
  const { data: ownedIds = null } = useOwnedMarkers(
    user?.id,
    !!user && profile?.role === "owner",
  );

  const likedPlaces = profile?.liked_places ?? [];

  const placeTypeFilter = useMemo(() => {
    if (categoryFilter.length > 0) return categoryFilter;
    if (!filterActive || !profile?.preferences) return [];
    const allowed: string[] = [];
    if (profile.preferences.pub_preference) allowed.push("pub");
    if (profile.preferences.bar_preference) allowed.push("bar");
    return allowed;
  }, [categoryFilter, filterActive, profile?.preferences]);

  // ID arrays for client-side filters — computed once, used by both map and list query
  const openIds = useMemo(() => {
    if (!openFilterActive) return null;
    return mapMarkers
      .filter((m) => {
        const hours = enrichment[m.id]?.opening_hours ?? m.opening_hours;
        return hours != null && isOpenNow(hours);
      })
      .map((m) => m.id);
  }, [openFilterActive, mapMarkers, enrichment]);

  const openLateIds = useMemo(() => {
    if (!openLateFilterActive) return null;
    return mapMarkers
      .filter((m) => {
        const hours = enrichment[m.id]?.opening_hours ?? m.opening_hours;
        return hours != null && isOpenLate(hours);
      })
      .map((m) => m.id);
  }, [openLateFilterActive, mapMarkers, enrichment]);

  const nearbyIds = useMemo(() => {
    if (radiusFilter === null || !userLocation) return null;
    return mapMarkers
      .filter(
        (m) =>
          haversineKm(userLocation.lat, userLocation.lon, m.lat, m.lon) <=
          radiusFilter,
      )
      .map((m) => m.id);
  }, [radiusFilter, userLocation, mapMarkers]);

  const voivodeshipIds = useMemo(() => {
    if (!voivodeshipFilter) return null;
    return mapMarkers
      .filter((m) => m.voivodeship === voivodeshipFilter)
      .map((m) => m.id);
  }, [voivodeshipFilter, mapMarkers]);

  // filteredMarkers — drives the map only, not the paginated list
  const filteredMarkers = useMemo(() => {
    if (searchSelectedId) {
      return mapMarkers.filter((m) => m.id === searchSelectedId);
    }

    let result = mapMarkers;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }
    if (voivodeshipIds !== null) {
      const s = new Set(voivodeshipIds);
      result = result.filter((m) => s.has(m.id));
    }
    if (likedFilterActive) {
      const s = new Set(likedPlaces);
      result = result.filter((m) => s.has(m.id));
    } else if (ownedFilterActive) {
      const s = new Set(ownedIds ?? []);
      result = result.filter((m) => s.has(m.id));
    } else if (placeTypeFilter.length > 0) {
      const s = new Set(placeTypeFilter);
      result = result.filter((m) => s.has(m.place_type));
    }
    if (openIds !== null) {
      const s = new Set(openIds);
      result = result.filter((m) => s.has(m.id));
    }
    if (openLateIds !== null) {
      const s = new Set(openLateIds);
      result = result.filter((m) => s.has(m.id));
    }
    if (minRatingFilter !== null) {
      result = result.filter((m) => {
        const rating = enrichment[m.id]?.app_rating ?? m.app_rating;
        return rating !== null && rating >= minRatingFilter;
      });
    }
    if (nearbyIds !== null) {
      const s = new Set(nearbyIds);
      result = result.filter((m) => s.has(m.id));
    }

    return result;
  }, [
    mapMarkers,
    searchSelectedId,
    searchQuery,
    voivodeshipIds,
    likedFilterActive,
    likedPlaces,
    ownedFilterActive,
    ownedIds,
    placeTypeFilter,
    openIds,
    openLateIds,
    minRatingFilter,
    enrichment,
    nearbyIds,
  ]);

  const enabled =
    (!needsEnrichment || Object.keys(enrichment).length > 0) &&
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

  const query = useInfiniteQuery({
    queryKey: [
      QUERY_KEYS.PUB_LIST,
      toQueryKey(
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
      ),
    ],
    queryFn: ({ pageParam }) =>
      fetchPubListPage(pageParam as number, queryParams),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
    staleTime: 2 * 60 * 1000,
    enabled,
  });

  return {
    ...query,
    enabled,
    mapMarkers,
    filteredMarkers,
    ownedIds,
    likedPlaces,
  };
}
