import type { MapMarker } from "@/schemas/entities";
import type { UserProfile } from "@/features/profile/api/get-user";
import { isOpenNow, isOpenLate } from "@/lib/opening-hours";

// Single source of truth for the filter shape. Add a filter here, add one
// entry to FILTER_DEFS, add one UI control — no scattered `if` chains to grow.
export type Filters = {
  categories: string[];
  usePreferences: boolean;
  liked: boolean;
  owned: boolean;
  open: boolean;
  openLate: boolean;
  minRating: number | null;
  voivodeship: string | null;
  radius: number | null;
};

// Default filter state — the empty/unfiltered baseline.
export const DEFAULT_FILTERS: Filters = {
  categories: [],
  usePreferences: false,
  liked: false,
  owned: false,
  open: false,
  openLate: false,
  minRating: null,
  voivodeship: null,
  radius: null,
};

// Explicit categories win; otherwise fall back to onboarding preferences.
export function resolvePlaceTypes(
  filters: Filters,
  profile: UserProfile | null,
): string[] {
  if (filters.categories.length > 0) return filters.categories;
  if (!filters.usePreferences || !profile?.preferences) return [];
  const allowed: string[] = [];
  if (profile.preferences.pub_preference) allowed.push("pub");
  if (profile.preferences.bar_preference) allowed.push("bar");
  return allowed;
}

// Everything a filter predicate needs, resolved once per render.
export type FilterEnv = {
  filters: Filters;
  placeTypes: string[];
  likedIds: Set<string>;
  ownedIds: Set<string>;
  userLocation: { lat: number; lon: number } | null;
};

export const DEFAULT_FILTER_ENV: FilterEnv = {
  filters: DEFAULT_FILTERS,
  placeTypes: [],
  likedIds: new Set(),
  ownedIds: new Set(),
  userLocation: null,
};

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

// Minimal shape of the pub_list query builder that filters chain onto. Kept
// structural so this module doesn't depend on supabase-js internals, while
// preserving the concrete builder type through the chain (Q self-references).
export interface FilterQuery<Q> {
  ilike(column: string, pattern: string): Q;
  in(column: string, values: readonly string[]): Q;
  gte(column: string, value: number): Q;
  eq(column: string, value: string | number | boolean): Q;
}

// A filter defined exactly once. `test` powers the client-side map predicate;
// `toQuery` powers the server-side pub_list query. `derivesIds` marks filters
// that have no pub_list column and must borrow a marker-derived ID list.
export type FilterDef = {
  id: string;
  isActive: (env: FilterEnv) => boolean;
  test: (marker: MapMarker, env: FilterEnv) => boolean;
  derivesIds: boolean;
  // `ids` is the marker-derived list (present only when derivesIds). Return
  // null when the filter cannot match anything → caller returns an empty page.
  toQuery: <Q extends FilterQuery<Q>>(
    query: Q,
    env: FilterEnv,
    ids: string[] | undefined,
  ) => Q | null;
};

// Filters with no pub_list column: the list constrains on a marker-derived
// `.in("id", …)` list; every one applies to the query identically.
const idFilter = (
  id: string,
  isActive: FilterDef["isActive"],
  test: FilterDef["test"],
): FilterDef => ({
  id,
  isActive,
  test,
  derivesIds: true,
  toQuery: (query, _env, ids) =>
    ids && ids.length > 0 ? query.in("id", ids) : null,
});

export const FILTER_DEFS: FilterDef[] = [
  {
    id: "placeType",
    isActive: (e) => e.placeTypes.length > 0,
    test: (m, e) => e.placeTypes.includes(m.place_type),
    derivesIds: false,
    toQuery: (query, e) => query.in("place_type", e.placeTypes),
  },
  {
    id: "minRating",
    isActive: (e) => e.filters.minRating !== null,
    test: (m, e) => m.app_rating !== null && m.app_rating >= e.filters.minRating!,
    derivesIds: false,
    toQuery: (query, e) => query.gte("app_rating", e.filters.minRating!),
  },
  idFilter("liked", (e) => e.filters.liked, (m, e) => e.likedIds.has(m.id)),
  idFilter("owned", (e) => e.filters.owned, (m, e) => e.ownedIds.has(m.id)),
  idFilter(
    "voivodeship",
    (e) => e.filters.voivodeship !== null,
    (m, e) => m.voivodeship === e.filters.voivodeship,
  ),
  {
    // Open-now is evaluated server-side via the is_open_now computed column on
    // the pub_list view (see the pub_list_open_now migration), so the list no
    // longer depends on a marker-derived id list. The map keeps a client-side
    // `test` since markers are already in memory.
    id: "open",
    isActive: (e) => e.filters.open,
    test: (m) => m.opening_hours != null && isOpenNow(m.opening_hours),
    derivesIds: false,
    toQuery: (query) => query.eq("is_open_now", true),
  },
  {
    id: "openLate",
    isActive: (e) => e.filters.openLate,
    test: (m) => m.opening_hours != null && isOpenLate(m.opening_hours),
    derivesIds: false,
    toQuery: (query) => query.eq("is_open_late", true),
  },
  idFilter(
    "nearby",
    (e) => e.filters.radius !== null && e.userLocation !== null,
    (m, e) =>
      haversineKm(e.userLocation!.lat, e.userLocation!.lon, m.lat, m.lon) <=
      e.filters.radius!,
  ),
];

// Builds the combined client-side predicate for the map. A selected search
// result short-circuits every other filter (matches the list query below).
export function buildMarkerPredicate(
  env: FilterEnv,
  search: { query: string; selectedId: string | null },
): (marker: MapMarker) => boolean {
  if (search.selectedId) {
    const selected = search.selectedId;
    return (m) => m.id === selected;
  }

  const preds: ((m: MapMarker) => boolean)[] = [];

  if (search.query) {
    const q = search.query.toLowerCase();
    preds.push((m) => m.name.toLowerCase().includes(q));
  }
  for (const def of FILTER_DEFS) {
    if (def.isActive(env)) preds.push((m) => def.test(m, env));
  }

  return (m) => preds.every((p) => p(m));
}
