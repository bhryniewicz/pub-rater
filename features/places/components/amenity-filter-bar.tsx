"use client";

import { useMemo } from "react";
import {
  PlaceTypeIcon,
  PLACE_TYPE_LABELS,
  placeTypeColor,
} from "@/features/places/place-type";
import { analytics } from "@/lib/analytics";
import { useFilters } from "@/context/filter-context";
import { useUser } from "@/features/profile/api/get-user";
import { useOwnedMarkers } from "@/features/markers/api/get-owned-markers";
import { usePlaceTypeCounts } from "@/features/markers/api/get-place-type-counts";

export function AmenityFilterBar() {
  const {
    categoryFilter,
    setCategoryFilter,
    likedFilterActive,
    setLikedFilterActive,
    ownedFilterActive,
    setOwnedFilterActive,
  } = useFilters();

  const { user, profile } = useUser();
  const { data: ownedIds = null } = useOwnedMarkers(
    user?.id,
    !!user && profile?.role === "owner",
  );
  const { data: placeTypeCounts } = usePlaceTypeCounts();

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { ...placeTypeCounts };
    counts.liked = profile?.liked_places.length ?? 0;

    if (profile?.role === "owner") counts.owned = ownedIds?.length ?? 0;
    return Object.entries(counts).filter(([, count]) => count > 0);
  }, [placeTypeCounts, profile?.liked_places, profile?.role, ownedIds]);

  const activeTypes = useMemo(
    () => [
      ...categoryFilter,
      ...(likedFilterActive ? ["liked"] : []),
      ...(ownedFilterActive ? ["owned"] : []),
    ],
    [categoryFilter, likedFilterActive, ownedFilterActive],
  );

  const labelFor = (type: string) => {
    return PLACE_TYPE_LABELS[type] ?? type;
  };

  function handleToggle(type: string) {
    analytics.categoryFilterClicked(type);
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
      setCategoryFilter((prev) => (!prev.includes(type) ? [type] : []));
    }
  }

  return (
    <div className="hidden md:flex gap-4 pl-12 py-2 shrink-0 overflow-x-auto">
      {filterCounts.map(([type, count]) => {
        const active = activeTypes.includes(type);
        const colored = active || activeTypes.length === 0;
        return (
          <button
            key={type}
            onClick={() => handleToggle(type)}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div
              style={colored ? { background: placeTypeColor(type) } : undefined}
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all ${
                colored
                  ? "border-transparent text-white"
                  : "bg-secondary border-border dark:border-transparent hover:bg-secondary/80 text-primary"
              }`}
            >
              <PlaceTypeIcon placeType={type} size={20} color="currentColor" />
              <span className="absolute -top-1.5 -right-4 text-muted-foreground text-[10px] font-black px-1.5 py-0.5 leading-none bg-border dark:bg-muted rounded-full">
                {count}
              </span>
            </div>
            <span className="block w-11 truncate text-center text-[10px] font-semibold leading-none text-muted-foreground">
              {labelFor(type)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
