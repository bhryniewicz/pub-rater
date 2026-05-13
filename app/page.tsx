"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PubList from "@/components/pub-list";
import { AgeGate } from "@/components/age-gate";
import { supabase, type MapMarker, type PubListItem } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";

const AMENITY_ICONS: Record<string, string> = {
  pub: "🍺",
  bar: "🥂",
  restaurant: "🍽️",
  cafe: "☕",
  nightclub: "🎶",
  biergarten: "🌻",
};

const Map = dynamic(() => import("@/components/map"), { ssr: false });

async function fetchAll<T>(table: string): Promise<T[]> {
  const pageSize = 1000;
  let all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error || !data) break;
    all = all.concat(data as T[]);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export default function Home() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [pubList, setPubList] = useState<PubListItem[]>([]);
  const [markersLoaded, setMarkersLoaded] = useState(false);
  const [listLoaded, setListLoaded] = useState(false);
  const [focusedMarker, setFocusedMarker] = useState<{
    id: string;
    lat: number;
    lon: number;
  } | null>(null);
  const [preferences, setPreferences] = useState<{
    bar_preference: boolean;
    pub_preference: boolean;
  } | null>(null);
  const [filterActive, setFilterActive] = useState(false);
  const [likedPlaces, setLikedPlaces] = useState<string[]>([]);
  const [likedFilterActive, setLikedFilterActive] = useState(false);

  useEffect(() => {
    fetchAll<MapMarker>("markers").then((data) => {
      setMapMarkers(data);
      setMarkersLoaded(true);
    });
    fetchAll<PubListItem>("pub_list").then((data) => {
      setPubList(data);
      setListLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (userLoading || !user) return;
    supabase
      .from("profiles")
      .select("is_onboarded, preferences, liked_places")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data && !data.is_onboarded) router.push("/onboard");
        if (data?.preferences) setPreferences(data.preferences);
        if (data?.liked_places) setLikedPlaces(data.liked_places);
      });
  }, [user, userLoading, router]);

  async function handleLikeToggle(markerId: string) {
    if (!user) return;
    const isLiked = likedPlaces.includes(markerId);
    const updated = isLiked
      ? likedPlaces.filter((id) => id !== markerId)
      : [...likedPlaces, markerId];
    setLikedPlaces(updated);
    await supabase
      .from("profiles")
      .update({ liked_places: updated })
      .eq("id", user.id);
  }

  const visibleMarkers = useMemo(() => {
    if (likedFilterActive) {
      const liked = new Set(likedPlaces);
      return mapMarkers.filter((m) => liked.has(m.id));
    }
    if (!filterActive || !preferences) return mapMarkers;
    const allowed = new Set<string>();
    if (preferences.bar_preference) allowed.add("bar");
    if (preferences.pub_preference) allowed.add("pub");
    if (allowed.size === 0) return mapMarkers;
    return mapMarkers.filter((m) => allowed.has(m.amenity));
  }, [filterActive, likedFilterActive, likedPlaces, preferences, mapMarkers]);

  return (
    <main className="flex flex-col flex-1 min-h-0">
      <AgeGate />
      {markersLoaded && (
        <div className="flex gap-6 px-4 py-2 border-b border-zinc-800 bg-zinc-900 shrink-0 overflow-x-auto">
          {Object.entries(
            mapMarkers.reduce<Record<string, number>>((acc, p) => {
              acc[p.amenity] = (acc[p.amenity] ?? 0) + 1;
              return acc;
            }, {}),
          )
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <div
                key={type}
                className="flex items-center gap-1.5 shrink-0 text-sm"
              >
                {AMENITY_ICONS[type] && <span>{AMENITY_ICONS[type]}</span>}
                <span className="font-medium text-zinc-200 capitalize">
                  {type}
                </span>
                <span className="bg-zinc-700 text-zinc-300 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              </div>
            ))}
        </div>
      )}
      <div className="flex-1 min-h-0 grid grid-cols-2 overflow-hidden">
        {!listLoaded ? (
          <div className="flex items-center justify-center bg-zinc-900 border-r border-zinc-800 min-h-0">
            <p className="text-zinc-500 text-sm">Loading...</p>
          </div>
        ) : (
          <PubList
            markers={pubList}
            onShowOnMap={setFocusedMarker}
            filterActive={filterActive}
            onFilterToggle={user ? () => setFilterActive((v) => !v) : undefined}
            likedPlaces={likedPlaces}
            onLikeToggle={user ? handleLikeToggle : undefined}
            likedFilterActive={likedFilterActive}
            onLikedFilterToggle={user ? () => setLikedFilterActive((v) => !v) : undefined}
          />
        )}
        <div className="min-h-0 h-full overflow-hidden">
          <Map markers={visibleMarkers} focusedMarker={focusedMarker} />
        </div>
      </div>
    </main>
  );
}
