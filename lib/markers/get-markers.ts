"use client";

import { useMemo } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MapMarker } from "@/schemas/entities";
import { useUser } from "@/features/profile/api/get-user";
import { useGeolocation } from "@/lib/geolocation/use-geolocation";
import { useFilters } from "@/context/filter-context";
import { useSearch } from "@/context/search-context";
import {
  type FilterEnv,
  FILTER_DEFS,
  resolvePlaceTypes,
  buildMarkerPredicate,
} from "@/lib/filters";
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

// Owns the markers dataset for the map: fetches markers + the user's owned
// markers, then applies all client-side filters. Returns the filtered marker
// set for the map plus the resolved FilterEnv and the ID lists the pub list
// uses to stay in sync.
export function useMarkers() {
  const { user, profile } = useUser();
  const { coords: userLocation } = useGeolocation();
  const { searchQuery, searchSelectedId } = useSearch();
  const { filters } = useFilters();

  const { data: mapMarkers = [], isSuccess: markersReady } = useQuery(
    getMarkersQueryOptions(),
  );

  const { data: ownedIds = null } = useOwnedMarkers(
    user?.id,
    !!user && profile?.role === "owner",
  );

  const env = useMemo<FilterEnv>(
    () => ({
      filters,
      placeTypes: resolvePlaceTypes(filters, profile),
      likedIds: new Set(profile?.liked_places ?? []),
      ownedIds: new Set(ownedIds ?? []),
      userLocation: userLocation ?? null,
    }),
    [filters, profile, ownedIds, userLocation],
  );

  // ID lists for each active marker-derived filter, handed to the pub list.
  const markerIds = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const def of FILTER_DEFS) {
      if (def.derivesIds && def.isActive(env)) {
        out[def.id] = mapMarkers
          .filter((m) => def.test(m, env))
          .map((m) => m.id);
      }
    }
    return out;
  }, [env, mapMarkers]);

  const filteredMarkers = useMemo(
    () =>
      mapMarkers.filter(
        buildMarkerPredicate(env, {
          query: searchQuery,
          selectedId: searchSelectedId,
        }),
      ),
    [mapMarkers, env, searchQuery, searchSelectedId],
  );

  return {
    filteredMarkers,
    markersReady,
    ownedLoaded: ownedIds !== null,
    env,
    markerIds,
  };
}
