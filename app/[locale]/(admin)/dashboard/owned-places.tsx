"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

type OwnedPlace = {
  id: string;
  name: string;
  amenity: string;
  city: string | null;
  address: string | null;
};

async function fetchOwnedPlaces(): Promise<OwnedPlace[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from("markers")
    .select("id, name, amenity, places(city, address)")
    .eq("owner_id", session.user.id)
    .order("name");

  if (error) throw error;

  return (data ?? []).map((row) => {
    const place = Array.isArray(row.places) ? row.places[0] : row.places;
    return {
      id: row.id,
      name: row.name,
      amenity: row.amenity,
      city: place?.city ?? null,
      address: place?.address ?? null,
    };
  });
}

const AMENITY_LABELS: Record<string, string> = {
  pub: "Pub 🍺",
  bar: "Bar 🥂",
  restaurant: "Restaurant 🍽️",
  cafe: "Cafe ☕",
  nightclub: "Nightclub 🎶",
  biergarten: "Biergarten 🌻",
};

export function OwnedPlaces() {
  const {
    data: places,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["owned_places"],
    queryFn: fetchOwnedPlaces,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Loading your places…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-16 text-red-500 text-sm">
        Failed to load places.
      </div>
    );
  }

  if (!places || places.length === 0) {
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
