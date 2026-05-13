"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase, type MapMarker, type Place } from "@/lib/supabase";

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
  | { type: "cluster"; count: number; lat: number; lon: number; dominantAmenity: string };

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
          items.push({
            type: "cluster",
            count: half.pubs.length,
            lat: half.lat,
            lon: half.lon,
            dominantAmenity: dominantAmenity(half.pubs),
          });
        }
      }
    } else {
      items.push({
        type: "cluster",
        count: cell.pubs.length,
        lat: cell.lat,
        lon: cell.lon,
        dominantAmenity: dominantAmenity(cell.pubs),
      });
    }
  }
  return items;
}

const AMENITY_ICONS: Record<string, string> = {
  pub: "🍺",
  bar: "🥂",
  restaurant: "🍽️",
  cafe: "☕",
  nightclub: "🎵",
  biergarten: "🌳",
  mixed: "📍",
};

const AMENITY_COLORS: Record<string, string> = {
  pub: "#d97706",
  bar: "#7c3aed",
  restaurant: "#dc2626",
  cafe: "#92400e",
  nightclub: "#db2777",
  biergarten: "#16a34a",
  mixed: "#facc15",
};

function amenityIcon(amenity: string): string {
  return AMENITY_ICONS[amenity] ?? "📍";
}

function amenityColor(amenity: string): string {
  return AMENITY_COLORS[amenity] ?? "#4b5563";
}

function dominantAmenity(pubs: MapMarker[]): string {
  const counts: Record<string, number> = {};
  for (const p of pubs) {
    counts[p.amenity] = (counts[p.amenity] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (!top) return "pub";
  if (top[1] / pubs.length < 0.6) return "mixed";
  return top[0];
}

const CLUSTER_SIZE = 46;

interface Props {
  markers: MapMarker[];
  focusedMarker?: { id: string; lat: number; lon: number } | null;
}

export default function MapComponent({ markers, focusedMarker }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [zoom, setZoom] = useState(7);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [loadingPlace, setLoadingPlace] = useState(false);

  const onZoom = useCallback((e: { viewState: { zoom: number } }) => {
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
      zoom: 16,
      duration: 1200,
    });
    const marker = markers.find((m) => m.id === focusedMarker.id);
    if (marker) onMarkerClick(marker);
  }, [focusedMarker]); // eslint-disable-line react-hooks/exhaustive-deps

  const snappedZoom = Math.round(zoom);
  const items = useMemo(
    () => clusterPubs(markers, snappedZoom),
    [markers, snappedZoom],
  );

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: 19.374227,
        latitude: 52.188527,
        zoom: 5.7,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={`mapbox://styles/${process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID}`}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      onZoom={onZoom}
      minZoom={5}
      onClick={() => {
        setSelectedMarker(null);
        setSelectedPlace(null);
      }}
    >
      <NavigationControl position="top-right" />

      {items.map((item, i) => {
        if (item.type === "cluster") {
          const label = item.count > 99 ? "99+" : `${item.count}`;
          const bg = amenityColor(item.dominantAmenity);
          const badgeSize = label.length > 2 ? 26 : 22;
          return (
            <Marker
              key={`cluster-${i}`}
              longitude={item.lon}
              latitude={item.lat}
              anchor="center"
            >
              <div style={{ position: "relative", width: CLUSTER_SIZE, height: CLUSTER_SIZE }}>
                <div
                  style={{
                    width: CLUSTER_SIZE,
                    height: CLUSTER_SIZE,
                    background: bg,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: CLUSTER_SIZE * 0.46,
                    boxShadow:
                      "0 4px 14px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2)",
                    border: "3px solid white",
                    cursor: "pointer",
                  }}
                >
                  {amenityIcon(item.dominantAmenity)}
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: -5,
                    right: -5,
                    background: "#ef4444",
                    color: "white",
                    borderRadius: "999px",
                    minWidth: badgeSize,
                    height: badgeSize,
                    paddingInline: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                    fontFamily: "sans-serif",
                    border: "2px solid white",
                    boxShadow: "0 1px 5px rgba(0,0,0,0.3)",
                    lineHeight: 1,
                  }}
                >
                  {label}
                </div>
              </div>
            </Marker>
          );
        }

        const pub = item.pub;
        const isSelected = selectedMarker?.id === pub.id;
        const bg = amenityColor(pub.amenity);
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
                width: 44,
                height: 44,
                background: bg,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                boxShadow: isSelected
                  ? `0 0 0 5px ${bg}66, 0 4px 16px ${bg}99, 0 2px 6px rgba(0,0,0,0.25)`
                  : "0 3px 10px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)",
                border: "3px solid white",
                cursor: "pointer",
                transform: isSelected ? "scale(1.2)" : "scale(1)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              {amenityIcon(pub.amenity)}
            </div>
          </Marker>
        );
      })}

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
        >
          <div className="min-w-[180px]">
            <p className="font-semibold text-base">{selectedMarker.name}</p>
            {loadingPlace && (
              <p className="text-xs text-zinc-400 mt-1">Loading details...</p>
            )}
            {selectedPlace && (
              <>
                {selectedPlace.address && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {selectedPlace.address}
                  </p>
                )}
                <div className="flex gap-3 mt-2 text-sm">
                  {selectedPlace.google_rating && (
                    <span>
                      ⭐ {selectedPlace.google_rating}{" "}
                      <span className="text-zinc-400 text-xs">
                        ({selectedPlace.google_review_count} Google)
                      </span>
                    </span>
                  )}
                  {selectedPlace.app_review_count > 0 && (
                    <span>
                      🍺 {selectedPlace.app_rating.toFixed(1)}{" "}
                      <span className="text-zinc-400 text-xs">
                        ({selectedPlace.app_review_count} app)
                      </span>
                    </span>
                  )}
                </div>
                {selectedPlace.opening_hours && (
                  <p className="text-xs text-zinc-400 mt-1">
                    {selectedPlace.opening_hours}
                  </p>
                )}
                {selectedPlace.website && (
                  <a
                    href={selectedPlace.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline mt-1 block"
                  >
                    Website
                  </a>
                )}
              </>
            )}
          </div>
        </Popup>
      )}
    </Map>
  );
}
