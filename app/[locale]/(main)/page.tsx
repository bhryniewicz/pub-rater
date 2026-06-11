"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/lib/navigation";
import { useTranslations } from "next-intl";
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
import { isOpenNow, isOpenLate } from "@/lib/opening-hours";
import { LuArrowLeft } from "react-icons/lu";
import { HeartIcon, HomeIcon } from "@/components/icons";
import {
  PubLine,
  BarSolid,
  BiergartenSolid,
  MixedSolid,
} from "@/components/icons";
import { OpenToggle } from "@/components/open-toggle";

const PAGE_SIZE = 20;

const Map = dynamic(() => import("@/components/map"), { ssr: false });

function AmenityIcon({
  amenity,
  size = 20,
  color = "currentColor",
}: {
  amenity: string;
  size?: number;
  color?: string;
}) {
  switch (amenity) {
    case "pub":
    case "restaurant":
    case "cafe":
    case "nightclub":
      return <PubLine size={size} color={color} />;
    case "bar":
      return <BarSolid size={size} color={color} />;
    case "biergarten":
      return <BiergartenSolid size={size} color={color} />;
    default:
      return <MixedSolid size={size} color={color} />;
  }
}

const AMENITY_COLORS: Record<string, string> = {
  pub: "#d97706",
  bar: "#7c3aed",
  restaurant: "#dc2626",
  cafe: "#92400e",
  nightclub: "#db2777",
  biergarten: "#16a34a",
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

type PubListFilters = {
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
    nextPage: data.length === PAGE_SIZE ? pageParam + PAGE_SIZE : null,
  };
}

export default function Home() {
  const t = useTranslations("home");
  const { user, loading: userLoading } = useUser();
  const { coords: userLocation } = useGeolocation();
  const { searchQuery, searchSelectedId, clearSearch } = useSearch();
  const {
    categoryFilter,
    setCategoryFilter,
    filterActive,
    likedFilterActive,
    setLikedFilterActive,
    ownedFilterActive,
    setOwnedFilterActive,
    openFilterActive,
    openLateFilterActive,
    minRatingFilter,
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
        .select("is_onboarded, preferences, liked_places, role")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user && !userLoading,
  });

  const { data: ownedIds = null } = useQuery({
    queryKey: ["owned_markers", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("markers")
        .select("id")
        .eq("owner_id", user!.id);
      return (data ?? []).map((m: { id: string }) => m.id);
    },
    enabled: !!user && profile?.role === "owner",
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

  const openLateIds = useMemo(() => {
    if (!openLateFilterActive || mapMarkers.length === 0) return null;
    return mapMarkers
      .filter((m) => m.opening_hours != null && isOpenLate(m.opening_hours))
      .map((m) => m.id);
  }, [openLateFilterActive, mapMarkers]);

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
    clearSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      ownedFilterActive,
      ownedFilterActive ? ownedIds : null,
      openIds,
      openLateIds,
      minRatingFilter,
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
        ownedFilterActive,
        ownedIds,
        openIds,
        openLateIds,
        minRatingFilter,
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
    } else if (ownedFilterActive) {
      const owned = new Set(ownedIds ?? []);
      markers = markers.filter((m) => owned.has(m.id));
    } else if (amenityFilter.length > 0) {
      const allowed = new Set(amenityFilter);
      markers = markers.filter((m) => allowed.has(m.amenity));
    }
    if (openIds !== null) {
      const open = new Set(openIds);
      markers = markers.filter((m) => open.has(m.id));
    }
    if (openLateIds !== null) {
      const late = new Set(openLateIds);
      markers = markers.filter((m) => late.has(m.id));
    }
    if (minRatingFilter !== null) {
      markers = markers.filter(
        (m) => m.app_rating !== null && m.app_rating >= minRatingFilter,
      );
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
    ownedFilterActive,
    ownedIds,
    amenityFilter,
    categoryFilter,
    openIds,
    openLateIds,
    minRatingFilter,
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
        <div className="hidden md:flex gap-4 pl-12 py-2 shrink-0 overflow-x-auto">
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
                    setOwnedFilterActive(false);
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
                        : "bg-secondary border-border dark:border-transparent hover:bg-secondary/80 text-primary"
                    }`}
                  >
                    <AmenityIcon
                      amenity={type}
                      size={20}
                      color="currentColor"
                    />
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
              setOwnedFilterActive(false);
              setLikedFilterActive((prev) => !prev);
            }}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div
              style={likedFilterActive ? { background: "#db2777" } : undefined}
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all ${
                likedFilterActive
                  ? "border-transparent text-white"
                  : "bg-secondary border-border dark:border-transparent hover:bg-secondary/80 text-primary"
              }`}
            >
              <HeartIcon size={18} />
              <span className="absolute -top-1.5 -right-4 text-muted-foreground text-[10px] font-black px-1.5 py-0.5 leading-none bg-border dark:bg-muted rounded-full">
                {likedPlaces.length}
              </span>
            </div>
            <span className="text-[10px] font-semibold capitalize leading-none text-muted-foreground">
              {t("liked")}
            </span>
          </button>
          {profile?.role === "owner" && (
            <button
              onClick={() => {
                setCategoryFilter([]);
                setLikedFilterActive(false);
                setOwnedFilterActive((prev) => !prev);
              }}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div
                style={ownedFilterActive ? { background: "#1d4ed8" } : undefined}
                className={`relative flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all ${
                  ownedFilterActive
                    ? "border-transparent text-white"
                    : "bg-secondary border-border dark:border-transparent hover:bg-secondary/80 text-primary"
                }`}
              >
                <HomeIcon size={18} />
                <span className="absolute -top-1.5 -right-4 text-muted-foreground text-[10px] font-black px-1.5 py-0.5 leading-none bg-border dark:bg-muted rounded-full">
                  {ownedIds?.length ?? 0}
                </span>
              </div>
              <span className="text-[10px] font-semibold leading-none text-muted-foreground">
                {t("ownedPlaces")}
              </span>
            </button>
          )}
        </div>
      )}
      <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-2 overflow-hidden">
        <div
          className={`min-h-0 px-4 md:pl-12 md:pr-0 overflow-hidden bg-background ${mobileView === "map" ? "hidden md:block" : "flex-1 md:flex-none"}`}
        >
          {listLoading ? (
            <div className="flex items-center justify-center h-full bg-background border-r border-border">
              <p className="text-muted-foreground text-sm">{t("loading")}</p>
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
            />
          )}
        </div>
        <div
          className={`min-h-0 pb-3 md:pb-4 pl-2 ${mobileView === "list" ? "hidden md:block" : "flex-1 md:flex-none"}`}
        >
          <div className="relative w-full h-full rounded-2xl overflow-hidden">
            <button
              onClick={() => setMobileView("list")}
              className="md:hidden absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm text-foreground rounded-full px-4 py-2 text-sm font-semibold shadow-lg border border-border"
            >
              <LuArrowLeft size={16} />
              {t("listView")}
            </button>
            <div className="md:hidden absolute top-4 right-4 z-10 shadow-lg">
              <OpenToggle className="bg-background/90 backdrop-blur-sm border-border/80" />
            </div>
            <Map
              markers={visibleMarkers}
              focusedMarker={focusedMarker}
              userLocation={userLocation}
              active={mobileView === "map"}
              automaticZoom={preferences?.automatic_zoom ?? true}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
