"use client";

import { useUser } from "@/hooks/useUser";
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
  onShowOnMap: (coords: { lat: number; lon: number }) => void;
}

export default function PubList({ markers, onShowOnMap }: Props) {
  console.log(markers, "markers in list");
  const { user } = useUser();
  return (
    <aside className="flex flex-col h-full overflow-hidden bg-white border-r border-zinc-200">
      <div className="px-4 py-3 border-b border-zinc-200 shrink-0">
        <p className="text-sm text-zinc-500">{markers.length} places</p>
      </div>
      <ul className="flex-1 overflow-y-auto divide-y divide-zinc-100">
        {markers.map((marker) => (
          <li
            key={marker.id}
            className="flex gap-6 px-4 py-3 hover:bg-zinc-50 transition-colors"
          >
            <div className="w-18 h-18 relative">
              {marker.thumbnail && (
                <Image src={marker.thumbnail} alt="image" fill />
              )}
            </div>
            <p className="font-medium text-sm text-zinc-900 leading-snug">
              {AMENITY_ICONS[marker.amenity] && (
                <span className="mr-1">{AMENITY_ICONS[marker.amenity]}</span>
              )}
              {marker.name}
            </p>
            {marker.address && (
              <p className="text-xs text-zinc-400 mt-0.5">{marker.address}</p>
            )}
            {marker.city && !marker.address && (
              <p className="text-xs text-zinc-400 mt-0.5">{marker.city}</p>
            )}
            {user && (
              <button
                onClick={() =>
                  onShowOnMap({ lat: marker.lat, lon: marker.lon })
                }
                className="mt-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                Show on map
              </button>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
