"use client";

import { useMemo } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MapMarker } from "@/features/places/schemas";
import { useUser } from "@/features/profile/api/get-user";
import { useGeolocation } from "@/context/geolocation-context";
import { useFilters } from "@/context/filter-context";
import { useSearch } from "@/context/search-context";
import { isOpenNow, isOpenLate } from "@/lib/opening-hours";
import { useOwnedMarkers } from "./get-owned-markers";

export async function fetchAllMarkers(client: SupabaseClient = supabase): Promise<MapMarker[]> {
  const { data, error } = await client.rpc("get_all_markers");
  if (error || !data) return [];
  return data as MapMarker[];
}

export const getMarkersQueryOptions = () =>
  queryOptions({
    queryKey: ["markers"],
    queryFn: () => fetchAllMarkers(),
    staleTime: Infinity,
  });

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

// Owns the markers dataset for the map: fetches markers + the user's owned
// markers, then applies all client-side filters. Returns the filtered marker
// set for the map plus the ID arrays the pub list uses to stay in sync.
export function useMarkers() {
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

  const { data: mapMarkers = [], isSuccess: markersReady } = useQuery(
    getMarkersQueryOptions(),
  );

  const { data: ownedIds = null } = useOwnedMarkers(
    user?.id,
    !!user && profile?.role === "owner",
  );

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

  const openIds = useMemo(() => {
    if (!openFilterActive) return null;
    return mapMarkers
      .filter((m) => m.opening_hours != null && isOpenNow(m.opening_hours))
      .map((m) => m.id);
  }, [openFilterActive, mapMarkers]);

  const openLateIds = useMemo(() => {
    if (!openLateFilterActive) return null;
    return mapMarkers
      .filter((m) => m.opening_hours != null && isOpenLate(m.opening_hours))
      .map((m) => m.id);
  }, [openLateFilterActive, mapMarkers]);

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
      result = result.filter(
        (m) => m.app_rating !== null && m.app_rating >= minRatingFilter,
      );
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
    nearbyIds,
  ]);

  return {
    filteredMarkers,
    markersReady,
    ownedIds,
    openIds,
    openLateIds,
    nearbyIds,
    voivodeshipIds,
  };
}
