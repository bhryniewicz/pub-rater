"use client";

import { useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

type Props = {
  lat: number;
  lon: number;
};

const MARKER_COLOR = "#D49658";

export function RequestMiniMap({ lat, lon }: Props) {
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<MapRef>(null);

  const mapStyle =
    resolvedTheme === "dark"
      ? `mapbox://styles/${process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID_DARK}`
      : `mapbox://styles/${process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID_LIGHT}`;

  useEffect(() => {
    mapRef.current?.flyTo({ center: [lon, lat], zoom: 15, duration: 600 });
  }, [lat, lon]);

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
            background: MARKER_COLOR,
            boxShadow: `0 0 0 5px ${MARKER_COLOR}44`,
          }}
          className="w-4 h-4 rounded-full border-2 border-white"
        />
      </Marker>
    </Map>
  );
}
