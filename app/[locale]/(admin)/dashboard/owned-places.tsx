"use client";

import { useOwnedPlaces } from "@/hooks/places/use-owned-places";

const AMENITY_LABELS: Record<string, string> = {
  pub: "Pub 🍺",
  bar: "Bar 🥂",
  restaurant: "Restaurant 🍽️",
  cafe: "Cafe ☕",
  nightclub: "Nightclub 🎶",
  biergarten: "Biergarten 🌻",
};

export function OwnedPlaces() {
  const { data: places } = useOwnedPlaces();

  if (places.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        No places assigned to your account yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {places.map((place) => (
        <div
          key={place.id}
          className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3"
        >
          <span className="text-sm font-medium text-foreground flex-1 truncate">
            {place.name}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {AMENITY_LABELS[place.amenity] ?? place.amenity}
          </span>
          {place.city && (
            <span className="text-xs text-muted-foreground shrink-0">
              {place.city}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
