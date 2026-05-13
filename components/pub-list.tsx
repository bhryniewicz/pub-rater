"use client";

import { useUser } from "@/hooks/use-user";
import { type PubListItem } from "@/lib/supabase";
import Image from "next/image";

const AMENITY_ICONS: Record<string, string> = {
  pub: "🍺",
  bar: "🥂",
  restaurant: "🍽️",
  cafe: "☕",
  nightclub: "🎶",
  biergarten: "🌻",
};

interface Props {
  markers: PubListItem[];
  onShowOnMap: (coords: { id: string; lat: number; lon: number }) => void;
  filterActive?: boolean;
  onFilterToggle?: () => void;
  likedPlaces?: string[];
  onLikeToggle?: (id: string) => void;
  likedFilterActive?: boolean;
  onLikedFilterToggle?: () => void;
}

export default function PubList({ markers, onShowOnMap, filterActive, onFilterToggle, likedPlaces = [], onLikeToggle, likedFilterActive, onLikedFilterToggle }: Props) {
  const { user } = useUser();
  const visibleMarkers = likedFilterActive
    ? markers.filter((m) => likedPlaces.includes(m.id))
    : markers;
  return (
    <aside className="flex flex-col h-full overflow-hidden bg-zinc-900 border-r border-zinc-800">
      <div className="px-4 py-3 border-b border-zinc-800 shrink-0 flex items-center justify-between">
        <p className="text-sm text-zinc-400">{visibleMarkers.length} places</p>
        <div className="flex items-center gap-2">
          {onFilterToggle && (
            <button
              onClick={onFilterToggle}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                filterActive
                  ? "bg-yellow-400 text-zinc-950 border-yellow-400"
                  : "text-zinc-300 border-zinc-700 hover:border-zinc-500"
              }`}
            >
              My spots
            </button>
          )}
          {onLikedFilterToggle && (
            <button
              onClick={onLikedFilterToggle}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                likedFilterActive
                  ? "bg-rose-500 text-white border-rose-500"
                  : "text-zinc-300 border-zinc-700 hover:border-zinc-500"
              }`}
            >
              Liked places
            </button>
          )}
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto divide-y divide-zinc-800">
        {visibleMarkers.map((marker, index) => (
          <li
            key={marker.id}
            className="flex gap-3 px-4 py-3 hover:bg-zinc-800/60 transition-colors"
          >
            {/* Thumbnail */}
            <div className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-zinc-800">
              {marker.thumbnail ? (
                <Image src={marker.thumbnail} alt={marker.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">
                  {AMENITY_ICONS[marker.amenity] ?? "🍺"}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex flex-col justify-center gap-1 min-w-0">
              <p className="font-black text-sm text-white leading-tight truncate">
                <span className="font-normal text-zinc-500 mr-1">{index + 1}.</span>
                {marker.name}
              </p>

              {(marker.address || marker.city) && (
                <p className="flex items-center gap-1 text-xs text-zinc-400">
                  <svg className="w-3 h-3 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  {marker.address ?? marker.city}
                </p>
              )}

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-800 border border-zinc-700 text-zinc-400">
                  {AMENITY_ICONS[marker.amenity] && (
                    <span>{AMENITY_ICONS[marker.amenity]}</span>
                  )}
                  {marker.amenity}
                </span>

                {user && (
                  <button
                    onClick={() =>
                      onShowOnMap({ id: marker.id, lat: marker.lat, lon: marker.lon })
                    }
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-zinc-950 hover:bg-yellow-300 transition-colors"
                  >
                    Show on map
                  </button>
                )}
                {onLikeToggle && (
                  <button
                    onClick={() => onLikeToggle(marker.id)}
                    className="text-lg leading-none transition-transform hover:scale-110"
                    aria-label={likedPlaces.includes(marker.id) ? "Unlike" : "Like"}
                  >
                    {likedPlaces.includes(marker.id) ? "❤️" : "🤍"}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
