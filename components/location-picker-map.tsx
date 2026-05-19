"use client";

import Map, { Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MapMouseEvent } from "react-map-gl/mapbox";
import { useTheme } from "next-themes";

type Props = {
  lat: number | null;
  lon: number | null;
  initialCenter?: { lat: number; lon: number };
  onChange: (lat: number, lon: number) => void;
};

export function LocationPickerMap({ lat, lon, initialCenter, onChange }: Props) {
  const center = initialCenter ?? { lat: 52.1, lon: 19.4 };
  const { resolvedTheme } = useTheme();
  const mapStyle = resolvedTheme === "light"
    ? `mapbox://styles/${process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID_LIGHT}`
    : `mapbox://styles/${process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID_DARK}`;

  return (
    <Map
      mapStyle={mapStyle}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialViewState={{ longitude: center.lon, latitude: center.lat, zoom: 10 }}
      style={{ width: "100%", height: "100%" }}
      onClick={(e: MapMouseEvent) => onChange(e.lngLat.lat, e.lngLat.lng)}
      cursor="crosshair"
    >
      {lat !== null && lon !== null && (
        <Marker latitude={lat} longitude={lon} />
      )}
    </Map>
  );
}
