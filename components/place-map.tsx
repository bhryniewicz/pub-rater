"use client";

import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { PlaceTypeIcon, PLACE_TYPE_COLORS } from "@/lib/place-type";

interface Props {
  lat: number;
  lon: number;
  placeType: string;
  userLocation?: { lat: number; lon: number } | null;
}

export default function PlaceMap({ lat, lon, placeType, userLocation }: Props) {
  const { resolvedTheme } = useTheme();
  const bg = PLACE_TYPE_COLORS[placeType] ?? "#4b5563";
  const mapStyle = resolvedTheme === "light"
    ? `mapbox://styles/${process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID_LIGHT}`
    : `mapbox://styles/${process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID_DARK}`;

  return (
    <Map
      initialViewState={{ longitude: lon, latitude: lat, zoom: 15 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={mapStyle}
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
          className="w-9 h-9 rounded-xl flex items-center justify-center scale-[1.2]"
        >
          <PlaceTypeIcon placeType={placeType} size={16} color="white" />
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
