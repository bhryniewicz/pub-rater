"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase, type MapMarker, type Place } from "@/lib/supabase";
import { BeerRating } from "@/components/beer-rating";
import {
  PlaceTypeIcon,
  placeTypeColor,
  dominantPlaceType,
  topPlaceTypeColors,
  mixedGradient,
} from "@/lib/place-type";

// Above this zoom: individual markers
const CLUSTER_THRESHOLD = 14;
// At this zoom and above: split 100+ clusters into 2 geographic halves
const SPLIT_ZOOM = 9;
// Cluster with this many pubs triggers a geographic split
const LARGE_CLUSTER = 100;

function gridSizeForZoom(zoom: number): number {
  return 0.4 / Math.pow(2, zoom - 6);
}

type ClusterItem =
  | { type: "pub"; pub: MapMarker }
  | {
      type: "cluster";
      count: number;
      lat: number;
      lon: number;
      dominantPlaceType: string;
      topColors: string[];
    };

function centroid(pubs: MapMarker[]) {
  return {
    lat: pubs.reduce((s, p) => s + p.lat, 0) / pubs.length,
    lon: pubs.reduce((s, p) => s + p.lon, 0) / pubs.length,
  };
}

function splitIntoTwo(
  pubs: MapMarker[],
): { pubs: MapMarker[]; lat: number; lon: number }[] {
  const lats = pubs.map((p) => p.lat);
  const lons = pubs.map((p) => p.lon);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lonSpan = Math.max(...lons) - Math.min(...lons);
  const sorted = [...pubs].sort((a, b) =>
    latSpan >= lonSpan ? a.lat - b.lat : a.lon - b.lon,
  );
  const mid = Math.ceil(sorted.length / 2);
  const g1 = sorted.slice(0, mid);
  const g2 = sorted.slice(mid);
  return [
    { pubs: g1, ...centroid(g1) },
    { pubs: g2, ...centroid(g2) },
  ];
}

type Cell = { pubs: MapMarker[]; lat: number; lon: number };

function mergeCells(cells: Cell[], threshold: number): Cell[] {
  const merged = new Array(cells.length).fill(false);
  const result: Cell[] = [];

  for (let i = 0; i < cells.length; i++) {
    if (merged[i]) continue;
    const group: MapMarker[] = [...cells[i].pubs];

    for (let j = i + 1; j < cells.length; j++) {
      if (merged[j]) continue;
      const dlat = Math.abs(cells[i].lat - cells[j].lat);
      const dlon = Math.abs(cells[i].lon - cells[j].lon);
      if (dlat < threshold && dlon < threshold) {
        merged[j] = true;
        group.push(...cells[j].pubs);
      }
    }

    const c = centroid(group);
    result.push({ pubs: group, lat: c.lat, lon: c.lon });
  }

  return result;
}

function clusterPubs(pubs: MapMarker[], zoom: number): ClusterItem[] {
  const snapped = Math.round(zoom);

  if (snapped >= CLUSTER_THRESHOLD) {
    return pubs.map((pub) => ({ type: "pub", pub }));
  }

  const size = gridSizeForZoom(snapped);
  const grid = new globalThis.Map<string, Cell>();

  for (const pub of pubs) {
    const cellLat = Math.floor(pub.lat / size);
    const cellLon = Math.floor(pub.lon / size);
    const key = `${cellLat},${cellLon}`;
    if (!grid.has(key)) {
      grid.set(key, { pubs: [], lat: 0, lon: 0 });
    }
    const cell = grid.get(key)!;
    cell.pubs.push(pub);
  }

  for (const cell of grid.values()) {
    const c = centroid(cell.pubs);
    cell.lat = c.lat;
    cell.lon = c.lon;
  }

  const cells = mergeCells(Array.from(grid.values()), size);

  const items: ClusterItem[] = [];
  for (const cell of cells) {
    if (cell.pubs.length === 1) {
      items.push({ type: "pub", pub: cell.pubs[0] });
    } else if (cell.pubs.length >= LARGE_CLUSTER && snapped >= SPLIT_ZOOM) {
      for (const half of splitIntoTwo(cell.pubs)) {
        if (half.pubs.length === 1) {
          items.push({ type: "pub", pub: half.pubs[0] });
        } else {
          const da = dominantPlaceType(half.pubs);
          items.push({
            type: "cluster",
            count: half.pubs.length,
            lat: half.lat,
            lon: half.lon,
            dominantPlaceType: da,
            topColors: da === "mixed" ? topPlaceTypeColors(half.pubs) : [placeTypeColor(da)],
          });
        }
      }
    } else {
      const da = dominantPlaceType(cell.pubs);
      items.push({
        type: "cluster",
        count: cell.pubs.length,
        lat: cell.lat,
        lon: cell.lon,
        dominantPlaceType: da,
        topColors: da === "mixed" ? topPlaceTypeColors(cell.pubs) : [placeTypeColor(da)],
      });
    }
  }
  return items;
}

// Persists viewport across remounts (e.g. locale switch). Module-level singleton
// survives React unmount/remount; resets only on full page reload.
let _savedViewport = { longitude: 19.374227, latitude: 52.188527, zoom: 5.7 };

interface Props {
  markers: MapMarker[];
  focusedMarker?: { id: string; lat: number; lon: number } | null;
  userLocation?: { lat: number; lon: number } | null;
  active?: boolean;
  automaticZoom?: boolean;
}

export default function MapComponent({
  markers,
  focusedMarker,
  userLocation,
  active,
  automaticZoom = true,
}: Props) {
  const { resolvedTheme } = useTheme();
  const mapStyle =
    resolvedTheme === "dark"
      ? `mapbox://styles/${process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID_DARK}`
      : `mapbox://styles/${process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID_LIGHT}`;

  const mapRef = useRef<MapRef>(null);
  const [initialViewState] = useState(() => ({ ..._savedViewport }));
  const [zoom, setZoom] = useState(_savedViewport.zoom);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const hasFocusedUser = useRef(false);

  const onMove = useCallback((e: { viewState: { longitude: number; latitude: number; zoom: number } }) => {
    _savedViewport = { longitude: e.viewState.longitude, latitude: e.viewState.latitude, zoom: e.viewState.zoom };
    setZoom(e.viewState.zoom);
  }, []);

  const onMarkerClick = useCallback(async (marker: MapMarker) => {
    mapRef.current?.flyTo({
      center: [marker.lon, marker.lat],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      duration: 800,
    });
    setSelectedMarker(marker);
    setSelectedPlace(null);
    setLoadingPlace(true);
    const { data } = await supabase
      .from("places")
      .select("*")
      .eq("marker_id", marker.id)
      .single();
    setSelectedPlace((data as Place) ?? null);
    setLoadingPlace(false);
  }, []);

  useEffect(() => {
    if (!focusedMarker) return;
    mapRef.current?.flyTo({
      center: [focusedMarker.lon, focusedMarker.lat],
      zoom: 18,
      duration: 1200,
    });
    const marker = markers.find((m) => m.id === focusedMarker.id);
    if (marker) onMarkerClick(marker);
  }, [focusedMarker]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mapLoaded || !userLocation || hasFocusedUser.current || !automaticZoom) return;
    hasFocusedUser.current = true;
    mapRef.current?.flyTo({
      center: [userLocation.lon, userLocation.lat],
      zoom: 13,
      duration: 1500,
    });
  }, [mapLoaded, userLocation, automaticZoom]);

  useEffect(() => {
    if (!active) return;
    // Mapbox measures canvas size when first mounted; if the container was
    // hidden (display:none) at that point, the canvas is 0×0. Force a resize
    // after the element becomes visible so the map fills its container.
    const id = setTimeout(() => mapRef.current?.resize(), 50);
    return () => clearTimeout(id);
  }, [active]);

  const snappedZoom = Math.round(zoom);
  const items = useMemo(
    () => clusterPubs(markers, snappedZoom),
    [markers, snappedZoom],
  );

  return (
    <Map
      ref={mapRef}
      initialViewState={initialViewState}
      style={{ width: "100%", height: "100%" }}
      mapStyle={mapStyle}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      onLoad={() => setMapLoaded(true)}
      onMove={onMove}
      minZoom={5}
      onClick={() => {
        setSelectedMarker(null);
        setSelectedPlace(null);
      }}
    >
      {/* <NavigationControl position="top-right" /> */}

      {items.map((item, i) => {
        if (item.type === "cluster") {
          const label = item.count > 99 ? "99+" : `${item.count}`;
          const isMixed = item.dominantPlaceType === "mixed" && item.topColors.length > 1;
          const bg = isMixed ? mixedGradient(item.topColors) : placeTypeColor(item.dominantPlaceType);
          const shadowColor = item.topColors[0];
          return (
            <Marker
              key={`cluster-${i}`}
              longitude={item.lon}
              latitude={item.lat}
              anchor="center"
            >
              <div className="relative w-[34px] h-[34px]">
                <div
                  style={{
                    background: bg,
                    boxShadow: `0 0 0 4px ${shadowColor}55`,
                  }}
                  className="w-[34px] h-[34px] rounded-xl flex items-center justify-center cursor-pointer"
                >
                  <PlaceTypeIcon placeType={item.dominantPlaceType} size={18} color="white" />
                </div>
                <div
                  className={`absolute -top-[6px] -right-[14px] bg-gray-700 text-white rounded-md flex items-center justify-center text-[10px] font-extrabold font-sans border border-white shadow-[0_1px_5px_rgba(0,0,0,0.3)] leading-none p-1`}
                >
                  {label}
                </div>
              </div>
            </Marker>
          );
        }

        const pub = item.pub;
        const isSelected = selectedMarker?.id === pub.id;
        const bg = placeTypeColor(pub.place_type);
        return (
          <Marker
            key={pub.id}
            longitude={pub.lon}
            latitude={pub.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onMarkerClick(pub);
            }}
          >
            <div
              style={{
                background: bg,
                boxShadow: isSelected
                  ? `0 0 0 6px ${bg}77`
                  : `0 0 0 4px ${bg}55`,
              }}
              className={`w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer transition-[transform,box-shadow] duration-150 ease-in-out hover:scale-110 ${isSelected ? "scale-[1.2]" : "scale-100"}`}
            >
              <PlaceTypeIcon placeType={pub.place_type} size={16} color="white" />
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
          longitude={selectedMarker.lon}
          latitude={selectedMarker.lat}
          anchor="bottom"
          offset={20}
          onClose={() => {
            setSelectedMarker(null);
            setSelectedPlace(null);
          }}
          closeOnClick={true}
          closeButton={false}
        >
          <Link href={`/places/${selectedMarker.id}`} className="flex flex-col gap-1 min-w-[180px]">
            <p className="font-bold text-xs text-white truncate">
              {selectedMarker.name}
            </p>
            {!loadingPlace && (() => {
              const rating = (selectedPlace?.app_review_count ?? 0) > 0
                ? { value: selectedPlace!.app_rating ?? 0, count: selectedPlace!.app_review_count }
                : selectedPlace?.google_rating
                ? { value: selectedPlace.google_rating, count: selectedPlace.google_review_count }
                : null;
              return rating ? (
                <BeerRating rating={rating.value} count={rating.count} />
              ) : null;
            })()}
          </Link>
        </Popup>
      )}
    </Map>
  );
}
