"use client";

import { useRef } from "react";
import { useTheme } from "next-themes";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

type Props = {
  lat: number;
  lon: number;
  amenity?: string;
};

const AMENITY_COLORS: Record<string, string> = {
  pub: "#d97706",
  bar: "#7c3aed",
  restaurant: "#dc2626",
  cafe: "#92400e",
  nightclub: "#db2777",
  biergarten: "#16a34a",
};

export function RequestMiniMap({ lat, lon, amenity = "pub" }: Props) {
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<MapRef>(null);

  const mapStyle =
    resolvedTheme === "dark"
      ? `mapbox://styles/${process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID_DARK}`
      : `mapbox://styles/${process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID_LIGHT}`;

  const color = AMENITY_COLORS[amenity] ?? "#d97706";

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: lon, latitude: lat, zoom: 15 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={mapStyle}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      scrollZoom={false}
      dragPan={false}
      dragRotate={false}
      doubleClickZoom={false}
      touchZoomRotate={false}
      keyboard={false}
    >
      <Marker longitude={lon} latitude={lat} anchor="center">
        <div
          style={{
            background: color,
            boxShadow: `0 0 0 5px ${color}44`,
          }}
          className="w-4 h-4 rounded-full border-2 border-white"
        />
      </Marker>
    </Map>
  );
}
