import {
  infiniteQueryOptions,
  useInfiniteQuery,
} from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase, type PubListItem } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query";
import { useUser } from "@/features/profile/api/get-user";
import { useSearch } from "@/context/search-context";
import {
  type Filters,
  type FilterEnv,
  DEFAULT_FILTERS,
  DEFAULT_FILTER_ENV,
  FILTER_DEFS,
} from "@/lib/filters";
import { PUB_LIST_PAGE_SIZE } from "@/lib/constants";

export type QueryParams = {
  searchSelectedId: string | null;
  searchQuery: string;
  env: FilterEnv;
  // ID lists for active marker-derived filters, keyed by FILTER_DEFS id.
  markerIds: Record<string, string[]>;
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
    if (p.searchQuery) query = query.ilike("name", `%${p.searchQuery}%`);
    for (const def of FILTER_DEFS) {
      if (!def.isActive(p.env)) continue;
      const next = def.toQuery(query, p.env, p.markerIds[def.id]);
      if (next === null) return empty;
      query = next;
    }
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
  filters: Filters,
  searchQuery: string,
  searchSelectedId: string | null,
  userLat: number | null,
  userLon: number | null,
) {
  return {
    ...filters,
    categories: [...filters.categories].sort(),
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
  env: DEFAULT_FILTER_ENV,
  markerIds: {},
};

export const DEFAULT_PUB_LIST_QUERY_KEY = [
  QUERY_KEYS.PUB_LIST,
  toQueryKey(DEFAULT_FILTERS, "", null, null, null),
] as const;

// Marker-derived data supplied by the caller (the markers feature). This hook
// has no knowledge of markers — it only builds the list query from the
// resolved FilterEnv and the precomputed ID lists.
export type PubListMarkerData = {
  markersReady: boolean;
  ownedLoaded: boolean;
  env: FilterEnv;
  markerIds: Record<string, string[]>;
};

export function usePubList({
  markersReady,
  ownedLoaded,
  env,
  markerIds,
}: PubListMarkerData) {
  const { user, profile } = useUser();
  const { searchQuery, searchSelectedId } = useSearch();

  // Marker-derived filters need the marker payload loaded, else the list would
  // briefly return empty.
  const needsMarkers = FILTER_DEFS.some(
    (d) => d.derivesIds && d.isActive(env),
  );

  const enabled =
    (!needsMarkers || markersReady) &&
    (!env.filters.liked || !user || !!profile) &&
    (!env.filters.owned || ownedLoaded);

  const userLat = env.userLocation?.lat ?? null;
  const userLon = env.userLocation?.lon ?? null;

  const queryParams: QueryParams = {
    searchSelectedId,
    searchQuery,
    env,
    markerIds,
  };

  const keyParams = toQueryKey(
    env.filters,
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
