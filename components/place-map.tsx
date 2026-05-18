"use client";

import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const AMENITY_ICONS: Record<string, string> = {
  pub: "🍺",
  bar: "🥂",
  restaurant: "🍽️",
  cafe: "☕",
  nightclub: "🎵",
  biergarten: "🌳",
};

const AMENITY_COLORS: Record<string, string> = {
  pub: "#d97706",
  bar: "#7c3aed",
  restaurant: "#dc2626",
  cafe: "#92400e",
  nightclub: "#db2777",
  biergarten: "#16a34a",
};

interface Props {
  lat: number;
  lon: number;
  amenity: string;
  userLocation?: { lat: number; lon: number } | null;
}

export default function PlaceMap({ lat, lon, amenity, userLocation }: Props) {
  const bg = AMENITY_COLORS[amenity] ?? "#4b5563";
  const icon = AMENITY_ICONS[amenity] ?? "📍";

  return (
    <Map
      initialViewState={{ longitude: lon, latitude: lat, zoom: 15 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={`mapbox://styles/${process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID}`}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      minZoom={5}
    >
      <NavigationControl position="top-right" />

      <Marker longitude={lon} latitude={lat} anchor="center">
        <div
          style={{
            background: bg,
            boxShadow: `0 0 0 6px ${bg}77`,
          }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] scale-[1.2]"
        >
          {icon}
        </div>
      </Marker>

      {userLocation && (
        <Marker longitude={userLocation.lon} latitude={userLocation.lat} anchor="center">
          <div className="relative flex items-center justify-center w-6 h-6">
            <div className="absolute w-6 h-6 rounded-full bg-blue-400 opacity-50 animate-ping" />
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg z-10" />
          </div>
        </Marker>
      )}
    </Map>
  );
}
