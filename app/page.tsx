"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import PubList from "@/components/PubList";
import { supabase, type MapMarker, type PubListItem } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";

const AMENITY_ICONS: Record<string, string> = {
  pub: "🍺",
  bar: "🥂",
  restaurant: "🍽️",
  cafe: "☕",
  nightclub: "🎶",
  biergarten: "🌻",
};

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

async function fetchAll<T>(table: string): Promise<T[]> {
  const pageSize = 1000;
  let all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + pageSize - 1);
    if (error || !data) break;
    all = all.concat(data as T[]);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export default function Home() {
  const { user } = useUser();
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [pubList, setPubList] = useState<PubListItem[]>([]);
  const [markersLoaded, setMarkersLoaded] = useState(false);
  const [listLoaded, setListLoaded] = useState(false);
  const [focusedMarker, setFocusedMarker] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

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

  console.log(user, "usr");

  console.log(markersLoaded, listLoaded, "loaded");

  return (
    <main className="flex flex-col h-screen">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200 bg-white shrink-0">
        <span className="text-xl">🍺</span>
        <h1 className="font-semibold text-zinc-900">Pub Rater</h1>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-zinc-500 hidden sm:block">
                {user.email}
              </span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-sm font-medium text-zinc-700 hover:text-zinc-900 border border-zinc-300 rounded-lg px-3 py-1.5 hover:border-zinc-500 transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-zinc-700 hover:text-zinc-900 px-3 py-1.5 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 rounded-lg px-3 py-1.5 transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>
      {markersLoaded && (
        <div className="flex gap-6 px-4 py-2 border-b border-zinc-200 bg-zinc-50 shrink-0 overflow-x-auto">
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
                <span className="font-medium text-zinc-700 capitalize">
                  {type}
                </span>
                <span className="bg-zinc-200 text-zinc-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              </div>
            ))}
        </div>
      )}
      <div className="flex-1 min-h-0 grid grid-cols-2 overflow-hidden">
        {!listLoaded ? (
          <div className="flex items-center justify-center bg-zinc-50 border-r border-zinc-200 min-h-0">
            <p className="text-zinc-400 text-sm">Loading...</p>
          </div>
        ) : (
          <PubList markers={pubList} onShowOnMap={setFocusedMarker} />
        )}
        <div className="min-h-0 h-full overflow-hidden">
          <Map markers={mapMarkers} focusedMarker={focusedMarker} />
        </div>
      </div>
    </main>
  );
}
