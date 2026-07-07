"use client";

import { useMemo } from "react";
import {
  PlaceTypeIcon,
  PLACE_TYPE_LABELS,
  placeTypeGradient,
} from "@/features/places/place-type";
import { analytics } from "@/lib/analytics";
import { CountBadge } from "@/components/ui/count-badge";
import { useFilters } from "@/context/filter-context";
import { useUser } from "@/features/profile/api/get-user";
import { useOwnedMarkers } from "@/features/markers/api/get-owned-markers";
import { usePlaceTypeCounts } from "@/features/markers/api/get-place-type-counts";

export type FilterItem = { type: string; count: number };

type AmenityFiltersProps = {
  variant: "bar" | "list";
  items: FilterItem[];
  activeTypes: string[];
  onToggle: (type: string) => void;
};

export function AmenityFilters({
  variant,
  items,
  activeTypes,
  onToggle,
}: AmenityFiltersProps) {
  const labelFor = (type: string) => PLACE_TYPE_LABELS[type] ?? type;

  if (variant === "list") {
    return (
      <div className="flex flex-col gap-2">
        {items.map(({ type, count }) => {
          const active = activeTypes.includes(type);
          const colored = active || activeTypes.length === 0;
          return (
            <button
              key={type}
              onClick={() => onToggle(type)}
              className={`flex items-center gap-3 py-1.5 text-sm transition-colors ${
                active ? "font-semibold" : "font-medium"
              }`}
            >
              <span
                style={colored ? { background: placeTypeGradient(type) } : undefined}
                className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
                  colored ? "text-white" : "bg-secondary text-primary"
                }`}
              >
                <PlaceTypeIcon placeType={type} size={18} color="currentColor" />
              </span>
              <span className="flex-1 text-left text-foreground">
                {labelFor(type)}
              </span>
              <span className="text-muted-foreground text-xs font-bold">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="hidden md:flex gap-4 pl-12 py-2 shrink-0 overflow-x-auto">
      {items.map(({ type, count }) => {
        const active = activeTypes.includes(type);
        const colored = active || activeTypes.length === 0;
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div
              style={colored ? { background: placeTypeGradient(type) } : undefined}
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all ${
                colored
                  ? "border-transparent text-white"
                  : "bg-secondary border-border dark:border-transparent hover:bg-secondary/80 text-primary"
              }`}
            >
              <PlaceTypeIcon placeType={type} size={20} color="currentColor" />
              <CountBadge className="absolute -top-1.5 -right-4">
                {count}
              </CountBadge>
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

  const items = useMemo<FilterItem[]>(() => {
    const counts: Record<string, number> = { ...placeTypeCounts };
    counts.liked = profile?.liked_places.length ?? 0;

    if (profile?.role === "owner") counts.owned = ownedIds?.length ?? 0;
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({ type, count }));
  }, [placeTypeCounts, profile?.liked_places, profile?.role, ownedIds]);

  const activeTypes = useMemo(
    () => [
      ...categoryFilter,
      ...(likedFilterActive ? ["liked"] : []),
      ...(ownedFilterActive ? ["owned"] : []),
    ],
    [categoryFilter, likedFilterActive, ownedFilterActive],
  );

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
    <AmenityFilters
      variant="bar"
      items={items}
      activeTypes={activeTypes}
      onToggle={handleToggle}
    />
  );
}
