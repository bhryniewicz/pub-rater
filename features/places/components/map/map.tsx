"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import Map, {
  Marker,
  Popup,
  Source,
  Layer,
  type MapRef,
  type MapMouseEvent,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ExpressionSpecification } from "mapbox-gl";
import { type MapMarker } from "@/lib/supabase";
import { analytics } from "@/lib/analytics";
import { useGeolocation } from "@/context/geolocation-context";
import { useProfile } from "@/features/profile/api/get-profile";
import { BeerRating } from "@/components/beer-rating";
import {
  PlaceTypeIcon,
  placeTypeColor,
  mixedGradient,
} from "@/features/places/place-type";
import {
  clusterPlaces,
  placesToGeoJSON,
  decodePlaceIcons,
  addPlaceIcons,
  type PlaceIconImages,
  getSavedViewport,
  setSavedViewport,
  PLACES_SOURCE,
  PLACES_LAYER,
  PLACES_SELECTED_LAYER,
} from "./utils";

const ICON_IMAGE: ExpressionSpecification = [
  "concat",
  "place-icon-",
  ["get", "place_type"],
];

interface Props {
  markers: MapMarker[];
  focusedMarker?: { id: string; lat: number; lon: number } | null;
}

export default function MapComponent({ markers, focusedMarker }: Props) {
  const { resolvedTheme } = useTheme();
  const { coords: userLocation } = useGeolocation();
  const { data: profile } = useProfile();

  const mapRef = useRef<MapRef>(null);
  const iconImages = useRef<PlaceIconImages | null>(null);
  const [zoom, setZoom] = useState(() => getSavedViewport().zoom);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [iconsReady, setIconsReady] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const hasFocusedUser = useRef(false);

  const snappedZoom = Math.round(zoom);
  const items = useMemo(
    () => clusterPlaces(markers, snappedZoom),
    [markers, snappedZoom],
  );
  const placesGeoJSON = useMemo(() => placesToGeoJSON(items), [items]);
  const clusters = useMemo(
    () => items.filter((it) => it.type === "cluster"),
    [items],
  );

  const automaticZoom = profile?.preferences?.automatic_zoom ?? true;
  const mapStyle =
    resolvedTheme === "dark"
      ? `mapbox://styles/${process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID_DARK}`
      : `mapbox://styles/${process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID_LIGHT}`;

  const onMove = useCallback(
    (e: {
      viewState: { longitude: number; latitude: number; zoom: number };
    }) => {
      setSavedViewport({
        longitude: e.viewState.longitude,
        latitude: e.viewState.latitude,
        zoom: e.viewState.zoom,
      });
      setZoom(e.viewState.zoom);
    },
    [],
  );

  const onMarkerClick = useCallback((marker: MapMarker) => {
    analytics.markerClicked(marker);
    setSelectedMarker(marker);
    const map = mapRef.current;
    if (!map) return;

    // Keep the current zoom. Only pan if the popup (anchored bottom, so it
    // extends upward and is centered horizontally on the marker) would clip an
    // edge — nudge just enough to bring it fully on-screen.
    const { clientWidth: w, clientHeight: h } = map.getContainer();
    const { x, y } = map.project([marker.lon, marker.lat]);

    const HALF_W = 110; // popup half-width
    const ABOVE = 110; // popup height + offset above the marker
    const EDGE = 16; // gap from the container edge

    const tx = Math.min(Math.max(x, EDGE + HALF_W), w - EDGE - HALF_W);
    const ty = Math.min(Math.max(y, EDGE + ABOVE), h - EDGE);
    if (tx === x && ty === y) return;

    // Recenter so the marker lands at (tx, ty): every point shifts by
    // (tx - x, ty - y), so the new center is the world point currently under
    // the container center minus that shift.
    const center = map.unproject([w / 2 - (tx - x), h / 2 - (ty - y)]);
    map.easeTo({ center, duration: 400 });
  }, []);

  const onMapClick = useCallback(
    (e: MapMouseEvent) => {
      const feature = e.features?.[0];
      const id = feature?.properties?.id as string | undefined;
      const marker = id ? markers.find((m) => m.id === id) : undefined;
      if (marker) {
        onMarkerClick(marker);
        return;
      }
      setSelectedMarker(null);
    },
    [markers, onMarkerClick],
  );

  useEffect(() => {
    if (!focusedMarker) return;
    mapRef.current?.flyTo({
      center: [focusedMarker.lon, focusedMarker.lat],
      zoom: 18,
      duration: 800,
    });
    const marker = markers.find((m) => m.id === focusedMarker.id);
    if (marker) setSelectedMarker(marker);
  }, [focusedMarker]);

  useEffect(() => {
    if (!mapLoaded || !userLocation || hasFocusedUser.current || !automaticZoom)
      return;
    hasFocusedUser.current = true;
    mapRef.current?.flyTo({
      center: [userLocation.lon, userLocation.lat],
      zoom: 13,
      duration: 1500,
    });
  }, [mapLoaded, userLocation, automaticZoom]);

  // Supply the rasterized place icons. We decode the SVGs once, then let Mapbox
  // pull them in on demand via "styleimagemissing": it fires whenever the symbol
  // layer needs an icon that isn't in its atlas — first render, symbols revealed
  // when a cluster is zoomed apart, and after a theme switch (setStyle drops
  // runtime images). Adding the pre-decoded image synchronously in the handler
  // lets Mapbox rebuild the atlas and draw the waiting symbols immediately.
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    let cancelled = false;
    const onMissing = () => {
      if (iconImages.current) addPlaceIcons(map, iconImages.current);
    };
    map.on("styleimagemissing", onMissing);

    decodePlaceIcons().then((images) => {
      if (cancelled) return;
      iconImages.current = images;
      addPlaceIcons(map, images);
      setIconsReady(true);
    });

    return () => {
      cancelled = true;
      map.off("styleimagemissing", onMissing);
    };
  }, [mapLoaded]);

  // Keep the GL canvas in sync with its container. On mobile the map's parent is
  // hidden in list view, so when it becomes visible the canvas would otherwise
  // keep its stale (often zero/short) size — leaving tiles and click projection
  // out of sync with the real container.
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    const container = map?.getContainer();
    if (!map || !container) return;
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [mapLoaded]);

  return (
    <Map
      ref={mapRef}
      initialViewState={getSavedViewport()}
      style={{ width: "100%", height: "100%" }}
      mapStyle={mapStyle}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      onLoad={() => setMapLoaded(true)}
      onMove={onMove}
      minZoom={5.5}
      interactiveLayerIds={[PLACES_LAYER]}
      onClick={onMapClick}
    >
      {iconsReady && (
        <Source id={PLACES_SOURCE} type="geojson" data={placesGeoJSON}>
          <Layer
            id={PLACES_LAYER}
            type="symbol"
            layout={{
              "icon-image": ICON_IMAGE,
              "icon-size": 0.95,
              "icon-allow-overlap": true,
              "icon-anchor": "center",
            }}
          />
          <Layer
            id={PLACES_SELECTED_LAYER}
            type="symbol"
            filter={["==", ["get", "id"], selectedMarker?.id ?? ""]}
            layout={{
              "icon-image": ICON_IMAGE,
              "icon-size": 1.2,
              "icon-allow-overlap": true,
              "icon-anchor": "center",
            }}
          />
        </Source>
      )}

      {clusters.map((item, i) => {
        if (item.type !== "cluster") return null;
        const label = item.count > 99 ? "99+" : `${item.count}`;
        const isMixed =
          item.dominantPlaceType === "mixed" && item.topColors.length > 1;
        const bg = isMixed
          ? mixedGradient(item.topColors)
          : placeTypeColor(item.dominantPlaceType);
        const shadowColor = item.topColors[0];
        const { minLon, minLat, maxLon, maxLat } = item.bounds;
        return (
          <Marker
            key={`cluster-${i}`}
            longitude={item.lon}
            latitude={item.lat}
            anchor="center"
            onClick={() => {
              setSelectedMarker(null);
              mapRef.current?.fitBounds(
                [
                  [minLon, minLat],
                  [maxLon, maxLat],
                ],
                { padding: 80, maxZoom: 16, duration: 800 },
              );
            }}
          >
            <div className="relative w-[34px] h-[34px]">
              <div
                style={{
                  background: bg,
                  boxShadow: `0 0 0 4px ${shadowColor}55`,
                }}
                className="w-[34px] h-[34px] rounded-xl flex items-center justify-center cursor-pointer"
              >
                <PlaceTypeIcon
                  placeType={item.dominantPlaceType}
                  size={18}
                  color="white"
                />
              </div>
              <div className="absolute -top-[6px] -right-[14px] bg-gray-700 text-white rounded-md flex items-center justify-center text-[10px] font-extrabold font-sans border border-white shadow-[0_1px_5px_rgba(0,0,0,0.3)] leading-none p-1">
                {label}
              </div>
            </div>
          </Marker>
        );
      })}

      {userLocation && (
        <Marker
          longitude={userLocation.lon}
          latitude={userLocation.lat}
          anchor="center"
        >
          <div className="relative flex items-center justify-center w-6 h-6">
            <div className="absolute w-6 h-6 rounded-full bg-blue-400 opacity-50 animate-ping" />
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg z-10" />
          </div>
        </Marker>
      )}

      {selectedMarker && (
        <Popup
          key={selectedMarker.id}
          longitude={selectedMarker.lon}
          latitude={selectedMarker.lat}
          anchor="bottom"
          offset={20}
          closeButton={false}
        >
          <Link
            href={`/places/${selectedMarker.id}`}
            className="flex flex-col gap-1 min-w-[180px]"
          >
            <p className="font-bold text-xs text-white truncate">
              {selectedMarker.name}
            </p>
            {(selectedMarker.app_review_count ?? 0) > 0 ? (
              <BeerRating
                rating={selectedMarker.app_rating ?? 0}
                count={selectedMarker.app_review_count}
              />
            ) : null}
          </Link>
        </Popup>
      )}
    </Map>
  );
}
