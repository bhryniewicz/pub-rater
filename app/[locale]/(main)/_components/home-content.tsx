"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePubList } from "@/features/places/api/get-pub-list";
import { useProfile } from "@/features/profile/api/get-profile";
import { PubList } from "@/features/places/components/pub-list/pub-list";
import { AgeGate } from "@/components/age-gate";
import { useUser } from "@/features/profile/api/get-user";
import { useGeolocation } from "@/context/geolocation-context";
import { useSearch } from "@/context/search-context";
import { useFilters } from "@/context/filter-context";
import { LuArrowLeft } from "react-icons/lu";
import {
  PlaceTypeIcon,
  PLACE_TYPE_LABELS,
  placeTypeColor,
} from "@/features/places/place-type";
import { OpenToggle } from "@/components/open-toggle";

const Map = dynamic(() => import("@/features/places/components/map"), { ssr: false });

export default function HomeContent() {
  const t = useTranslations("home");
  const { user, loading: userLoading } = useUser();
  const { coords: userLocation } = useGeolocation();
  const { searchSelectedId, clearSearch } = useSearch();
  const {
    categoryFilter,
    setCategoryFilter,
    likedFilterActive,
    setLikedFilterActive,
    ownedFilterActive,
    setOwnedFilterActive,
    resetFilters,
  } = useFilters();
  const router = useRouter();

  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [focusedMarker, setFocusedMarker] = useState<{
    id: string;
    lat: number;
    lon: number;
  } | null>(null);

  // Profile is also read inside usePubList — React Query deduplicates the fetch
  const { data: profile } = useProfile(user?.id, !!user && !userLoading);

  useEffect(() => {
    if (profile && !profile.is_onboarded) router.push("/onboard");
  }, [profile, router]);

  useEffect(() => {
    clearSearch();
    resetFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    data: pubListPages,
    isLoading: listLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    enabled: pubListEnabled,
    mapMarkers,
    filteredMarkers,
    ownedIds,
    likedPlaces,
  } = usePubList();

  const pubList = useMemo(
    () => pubListPages?.pages.flatMap((p) => p.items) ?? [],
    [pubListPages],
  );

  useEffect(() => {
    if (!searchSelectedId || filteredMarkers.length === 0) return;
    const m = filteredMarkers[0];
    setFocusedMarker({ id: m.id, lat: m.lat, lon: m.lon });
    setMobileView("map");
  }, [searchSelectedId, filteredMarkers]);

  const filterCounts = useMemo(() => {
    const counts = mapMarkers.reduce<Record<string, number>>((acc, p) => {
      acc[p.place_type] = (acc[p.place_type] ?? 0) + 1;
      return acc;
    }, {});
    const likedSet = new Set(likedPlaces);
    counts.liked = mapMarkers.filter((m) => likedSet.has(m.id)).length;
    if (profile?.role === "owner") counts.owned = ownedIds?.length ?? 0;
    return counts;
  }, [mapMarkers, likedPlaces, profile?.role, ownedIds]);

  const activeTypes = useMemo(
    () => [
      ...categoryFilter,
      ...(likedFilterActive ? ["liked"] : []),
      ...(ownedFilterActive ? ["owned"] : []),
    ],
    [categoryFilter, likedFilterActive, ownedFilterActive],
  );

  function handleFilterToggle(type: string) {
    if (type === "liked") {
      setCategoryFilter([]);
      setOwnedFilterActive(false);
      setLikedFilterActive((prev) => !prev);
    } else if (type === "owned") {
      setCategoryFilter([]);
      setLikedFilterActive(false);
      setOwnedFilterActive((prev) => !prev);
    } else {
      setLikedFilterActive(false);
      setOwnedFilterActive(false);
      setCategoryFilter((prev) => (prev.includes(type) ? [] : [type]));
    }
  }

  const preferences = profile?.preferences ?? null;

  return (
    <main className="flex flex-col flex-1 min-h-0">
      <AgeGate />
      <AmenityFilterBar
        filterCounts={filterCounts}
        activeTypes={activeTypes}
        onToggle={handleFilterToggle}
      />
      <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-2 overflow-hidden">
        <div
          className={`min-h-0 px-4 md:pl-12 md:pr-0 overflow-hidden bg-background ${mobileView === "map" ? "hidden md:block" : "flex-1 md:flex-none"}`}
        >
          <PubList
            places={pubList}
            totalCount={pubListPages?.pages[0]?.totalCount ?? 0}
            isLoading={!pubListEnabled || listLoading}
            onShowOnMap={(coords) => {
              setFocusedMarker(coords);
              setMobileView("map");
            }}
            onShowMap={() => setMobileView("map")}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
          />
        </div>
        <div
          className={`min-h-0 pb-3 md:pb-4 pl-2 ${mobileView === "list" ? "hidden md:block" : "flex-1 md:flex-none"}`}
        >
          <div className="relative w-full h-full rounded-2xl overflow-hidden">
            <button
              onClick={() => setMobileView("list")}
              className="md:hidden absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm text-foreground rounded-full px-4 py-1.5 text-sm font-semibold shadow-lg border border-border"
            >
              <LuArrowLeft size={16} />
              {t("listView")}
            </button>
            <div className="md:hidden absolute top-4 right-4 z-10 shadow-lg">
              <OpenToggle className="bg-background/90 backdrop-blur-sm border-border/80" />
            </div>
            <Map
              markers={filteredMarkers}
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

type AmenityFilterBarProps = {
  filterCounts: Record<string, number>;
  activeTypes: string[];
  onToggle: (type: string) => void;
};

function AmenityFilterBar({
  filterCounts,
  activeTypes,
  onToggle,
}: AmenityFilterBarProps) {
  const t = useTranslations("home");

  const sorted = Object.entries(filterCounts).sort((a, b) => {
    const metaOrder = ["liked", "owned"];
    const ai = metaOrder.indexOf(a[0]);
    const bi = metaOrder.indexOf(b[0]);
    if (ai !== -1 || bi !== -1)
      return (ai === -1 ? -1 : ai) - (bi === -1 ? -1 : bi);
    return b[1] - a[1];
  });

  const labelFor = (type: string) => {
    if (type === "liked") return t("liked");
    if (type === "owned") return t("ownedPlaces");
    return PLACE_TYPE_LABELS[type] ?? type;
  };

  return (
    <div className="hidden md:flex gap-4 pl-12 py-2 shrink-0 overflow-x-auto">
      {sorted.map(([type, count]) => {
        const active = activeTypes.includes(type);
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div
              style={active ? { background: placeTypeColor(type) } : undefined}
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all ${
                active
                  ? "border-transparent text-white"
                  : "bg-secondary border-border dark:border-transparent hover:bg-secondary/80 text-primary"
              }`}
            >
              <PlaceTypeIcon placeType={type} size={20} color="currentColor" />
              <span className="absolute -top-1.5 -right-4 text-muted-foreground text-[10px] font-black px-1.5 py-0.5 leading-none bg-border dark:bg-muted rounded-full">
                {count}
              </span>
            </div>
            <span className="text-[10px] font-semibold leading-none text-muted-foreground">
              {labelFor(type)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
