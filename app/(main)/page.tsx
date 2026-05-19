"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import PubList from "@/components/pub-list";
import { AgeGate } from "@/components/age-gate";
import { supabase, fetchAllMarkers, type PubListItem } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { useGeolocation } from "@/context/geolocation-context";
import { useSearch } from "@/context/search-context";
import { useFilters } from "@/context/filter-context";
import { isOpenNow } from "@/lib/opening-hours";
import { LuArrowLeft } from "react-icons/lu";

const PAGE_SIZE = 20;

const AMENITY_ICONS: Record<string, string> = {
  pub: "🍺",
  bar: "🥂",
  restaurant: "🍽️",
  cafe: "☕",
  nightclub: "🎶",
  biergarten: "🌻",
};

const AMENITY_COLORS: Record<string, string> = {
  pub: "#d97706",
  bar: "#7c3aed",
  restaurant: "#dc2626",
  cafe: "#92400e",
  nightclub: "#db2777",
  biergarten: "#16a34a",
};

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

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

type PubListFilters = {
  amenityFilter: string[];
  likedPlaces: string[];
  likedFilterActive: boolean;
  openIds: string[] | null;
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
    .range(pageParam, pageParam + PAGE_SIZE - 1);

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

  if (filters.nearbyIds !== null) {
    if (filters.nearbyIds.length === 0) return { items: [], nextPage: null };
    query = query.in("id", filters.nearbyIds);
  }

  const { data, error } = await query;
  if (error || !data) return { items: [], nextPage: null };

  return {
    items: data as PubListItem[],
    nextPage: data.length === PAGE_SIZE ? pageParam + PAGE_SIZE : null,
  };
}

export default function Home() {
  const { user, loading: userLoading } = useUser();
  const { coords: userLocation } = useGeolocation();
  const { searchQuery, searchSelectedId } = useSearch();
  const {
    categoryFilter,
    setCategoryFilter,
    filterActive,
    likedFilterActive,
    setLikedFilterActive,
    openFilterActive,
    setOpenFilterActive,
    voivodeshipFilter,
    radiusFilter,
  } = useFilters();
  const router = useRouter();

  const queryClient = useQueryClient();

  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const [focusedMarker, setFocusedMarker] = useState<{
    id: string;
    lat: number;
    lon: number;
  } | null>(null);

  const [localLikedPlaces, setLocalLikedPlaces] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("liked_places");
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  function toggleLocalLike(markerId: string) {
    setLocalLikedPlaces((prev) => {
      const updated = prev.includes(markerId)
        ? prev.filter((id) => id !== markerId)
        : [...prev, markerId];
      localStorage.setItem("liked_places", JSON.stringify(updated));
      return updated;
    });
  }

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_onboarded, preferences, liked_places")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user && !userLoading,
  });

  useEffect(() => {
    if (profile && !profile.is_onboarded) router.push("/onboard");
  }, [profile, router]);

  const preferences = profile?.preferences ?? null;
  const likedPlaces: string[] = user
    ? (profile?.liked_places ?? [])
    : localLikedPlaces;

  const amenityFilter = useMemo(() => {
    if (categoryFilter.length > 0) return categoryFilter;
    if (!filterActive || !preferences) return [];
    const allowed: string[] = [];
    if (preferences.pub_preference) allowed.push("pub");
    if (preferences.bar_preference) allowed.push("bar");
    return allowed;
  }, [categoryFilter, filterActive, preferences]);

  const { data: mapMarkers = [], isSuccess: markersLoaded } = useQuery({
    queryKey: ["markers"],
    queryFn: fetchAllMarkers,
    staleTime: 5 * 60 * 1000,
  });

  const openIds = useMemo(() => {
    if (!openFilterActive || mapMarkers.length === 0) return null;
    return mapMarkers
      .filter((m) => m.opening_hours != null && isOpenNow(m.opening_hours))
      .map((m) => m.id);
  }, [openFilterActive, mapMarkers]);

  const nearbyIds = useMemo(() => {
    if (radiusFilter === null || !userLocation || mapMarkers.length === 0)
      return null;
    return mapMarkers
      .filter(
        (m) =>
          haversineKm(userLocation.lat, userLocation.lon, m.lat, m.lon) <=
          radiusFilter,
      )
      .map((m) => m.id);
  }, [radiusFilter, userLocation, mapMarkers]);

  useEffect(() => {
    if (!searchSelectedId) return;
    const marker = mapMarkers.find((m) => m.id === searchSelectedId);
    if (marker)
      setFocusedMarker({ id: marker.id, lat: marker.lat, lon: marker.lon });
  }, [searchSelectedId, mapMarkers]);

  const {
    data: pubListPages,
    isLoading: listLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "pub_list",
      amenityFilter,
      likedFilterActive,
      likedFilterActive ? likedPlaces : [],
      openIds,
      voivodeshipFilter,
      nearbyIds,
      searchQuery,
      searchSelectedId,
    ],
    queryFn: ({ pageParam }) =>
      fetchPubListPage(pageParam as number, {
        amenityFilter,
        likedPlaces,
        likedFilterActive,
        openIds,
        voivodeshipIds,
        nearbyIds,
        searchQuery,
        searchSelectedId,
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
    staleTime: 60 * 1000,
  });

  const pubList = useMemo(
    () => pubListPages?.pages.flatMap((p) => p.items) ?? [],
    [pubListPages],
  );

  const voivodeshipIds = useMemo(() => {
    if (!voivodeshipFilter) return null;
    return mapMarkers
      .filter((m) => m.voivodeship === voivodeshipFilter)
      .map((m) => m.id);
  }, [voivodeshipFilter, mapMarkers]);

  const visibleMarkers = useMemo(() => {
    if (searchSelectedId) {
      return mapMarkers.filter((m) => m.id === searchSelectedId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return mapMarkers.filter((m) => m.name.toLowerCase().includes(q));
    }

    let markers = mapMarkers;
    if (voivodeshipFilter) {
      const ids = new Set(voivodeshipIds ?? []);
      markers = markers.filter((m) => ids.has(m.id));
    }
    if (likedFilterActive) {
      const liked = new Set(likedPlaces);
      markers = markers.filter((m) => liked.has(m.id));
    } else if (amenityFilter.length > 0) {
      const allowed = new Set(amenityFilter);
      markers = markers.filter((m) => allowed.has(m.amenity));
    }
    if (openIds !== null) {
      const open = new Set(openIds);
      markers = markers.filter((m) => open.has(m.id));
    }
    if (nearbyIds !== null) {
      const nearby = new Set(nearbyIds);
      markers = markers.filter((m) => nearby.has(m.id));
    }
    return markers;
  }, [
    filterActive,
    likedFilterActive,
    likedPlaces,
    amenityFilter,
    categoryFilter,
    openIds,
    nearbyIds,
    mapMarkers,
    voivodeshipFilter,
    voivodeshipIds,
    searchQuery,
    searchSelectedId,
  ]);

  const likeMutation = useMutation({
    mutationFn: async (markerId: string) => {
      const isLiked = likedPlaces.includes(markerId);
      const updated = isLiked
        ? likedPlaces.filter((id) => id !== markerId)
        : [...likedPlaces, markerId];
      await supabase
        .from("profiles")
        .update({ liked_places: updated })
        .eq("id", user!.id);
      return updated;
    },
    onMutate: async (markerId: string) => {
      await queryClient.cancelQueries({ queryKey: ["profile", user?.id] });
      const previous = queryClient.getQueryData(["profile", user?.id]);
      queryClient.setQueryData(["profile", user?.id], (old: typeof profile) => {
        if (!old) return old;
        const isLiked = (old.liked_places ?? []).includes(markerId);
        return {
          ...old,
          liked_places: isLiked
            ? old.liked_places.filter((id: string) => id !== markerId)
            : [...(old.liked_places ?? []), markerId],
        };
      });
      return { previous };
    },
    onError: (_err, _markerId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["profile", user?.id], context.previous);
      }
    },
  });

  return (
    <main className="flex flex-col flex-1 min-h-0">
      <AgeGate />
      {markersLoaded && (
        <div className="hidden md:flex gap-4 pl-12 py-2  shrink-0 overflow-x-auto">
          {Object.entries(
            mapMarkers.reduce<Record<string, number>>((acc, p) => {
              acc[p.amenity] = (acc[p.amenity] ?? 0) + 1;
              return acc;
            }, {}),
          )
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => {
              const active = categoryFilter.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => {
                    setLikedFilterActive(false);
                    setCategoryFilter((prev) =>
                      prev.includes(type) ? [] : [type],
                    );
                  }}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <div
                    style={
                      active
                        ? { background: AMENITY_COLORS[type] ?? "#4b5563" }
                        : undefined
                    }
                    className={`relative flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all ${
                      active
                        ? "border-transparent text-white"
                        : "bg-secondary border-border dark:border-transparent hover:bg-secondary/80 text-foreground"
                    }`}
                  >
                    <span className="text-base leading-none">
                      {AMENITY_ICONS[type] ?? "📍"}
                    </span>
                    <span className="absolute -top-1.5 -right-4 text-muted-foreground text-[10px] font-black px-1.5 py-0.5 leading-none bg-border dark:bg-muted rounded-full">
                      {count}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold capitalize leading-none text-muted-foreground">
                    {type}
                  </span>
                </button>
              );
            })}
          <button
            onClick={() => {
              setCategoryFilter([]);
              setLikedFilterActive((prev) => !prev);
            }}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div
              style={
                likedFilterActive ? { background: "#db2777" } : undefined
              }
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all ${
                likedFilterActive
                  ? "border-transparent text-white"
                  : "bg-secondary border-border dark:border-transparent hover:bg-secondary/80 text-foreground"
              }`}
            >
              <span className="text-base leading-none">❤️</span>
              <span className="absolute -top-1.5 -right-4 text-muted-foreground text-[10px] font-black px-1.5 py-0.5 leading-none bg-border dark:bg-muted rounded-full">
                {likedPlaces.length}
              </span>
            </div>
            <span className="text-[10px] font-semibold capitalize leading-none text-muted-foreground">
              liked
            </span>
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-2 overflow-hidden">
        <div
          className={`min-h-0 px-4 md:pl-12 md:pr-0 overflow-hidden bg-background ${mobileView === "map" ? "hidden md:block" : "flex-1 md:flex-none"}`}
        >
          {listLoading ? (
            <div className="flex items-center justify-center h-full bg-background border-r border-border">
              <p className="text-muted-foreground text-sm">Loading...</p>
            </div>
          ) : (
            <PubList
              markers={pubList}
              totalCount={mapMarkers.length}
              onShowOnMap={(coords) => {
                setFocusedMarker(coords);
                setMobileView("map");
              }}
              onShowMap={() => setMobileView("map")}
              likedPlaces={likedPlaces}
              onLikeToggle={user ? (id) => likeMutation.mutate(id) : toggleLocalLike}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={fetchNextPage}
              openFilterActive={openFilterActive}
              onOpenFilterToggle={() => setOpenFilterActive((prev) => !prev)}
            />
          )}
        </div>
        <div
          className={`min-h-0 relative overflow-hidden ${mobileView === "list" ? "hidden md:block" : "flex-1 md:flex-none"}`}
        >
          <button
            onClick={() => setMobileView("list")}
            className="md:hidden absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm text-foreground rounded-full px-4 py-2 text-sm font-semibold shadow-lg border border-border"
          >
            <LuArrowLeft size={16} />
            List view
          </button>
          <Map
            markers={visibleMarkers}
            focusedMarker={focusedMarker}
            userLocation={userLocation}
            active={mobileView === "map"}
          />
        </div>
      </div>
    </main>
  );
}
