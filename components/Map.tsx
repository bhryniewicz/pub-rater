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
const CLUSTER_THRESHOLD = 11;
// At this zoom and above: split 100+ clusters into 2 geographic halves
const SPLIT_ZOOM = 9;
// Cluster with this many pubs triggers a geographic split
const LARGE_CLUSTER = 100;

function gridSizeForZoom(zoom: number): number {
  return 0.8 / Math.pow(2, zoom - 6);
}

type ClusterItem =
  | { type: "pub"; pub: MapMarker }
  | { type: "cluster"; count: number; lat: number; lon: number };

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
          });
        }
      }
    } else {
      items.push({
        type: "cluster",
        count: cell.pubs.length,
        lat: cell.lat,
        lon: cell.lon,
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
  nightclub: "🎶",
  biergarten: "🌻",
};

function amenityIcon(amenity: string): string {
  return AMENITY_ICONS[amenity] ?? "📍";
}

function clusterColor(count: number): string {
  if (count > 99) return "#7c3aed";
  if (count > 50) return "#2563eb";
  if (count > 20) return "#0891b2";
  return "#0d9488";
}

function clusterSize(count: number): number {
  if (count > 99) return 72;
  if (count > 50) return 64;
  if (count > 20) return 56;
  return 48;
}

interface Props {
  markers: MapMarker[];
  focusedMarker?: { lat: number; lon: number } | null;
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
  }, [focusedMarker]);

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
          const size = clusterSize(item.count);
          const bg = clusterColor(item.count);
          const label = item.count > 99 ? "99+" : `${item.count}`;
          return (
            <Marker
              key={`cluster-${i}`}
              longitude={item.lon}
              latitude={item.lat}
              anchor="center"
            >
              <div
                style={{
                  width: size,
                  height: size,
                  background: bg,
                  borderRadius: "50%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 11,
                  fontFamily: "sans-serif",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                  border: "3px solid rgba(255,255,255,0.8)",
                  cursor: "pointer",
                }}
              >
                <span>{label}</span>
                <span style={{ fontSize: 9 }}>places</span>
              </div>
            </Marker>
          );
        }

        const pub = item.pub;
        return (
          <Marker
            key={pub.id}
            longitude={pub.lon}
            latitude={pub.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onMarkerClick(pub);
            }}
          >
            <div
              style={{
                background: "#6b7280",
                color: "white",
                borderRadius: "50% 50% 50% 0",
                transform: "rotate(-45deg)",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 11,
                fontFamily: "sans-serif",
                boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
                border: "2px solid white",
                cursor: "pointer",
              }}
            >
              <span style={{ transform: "rotate(45deg)" }}>
                {amenityIcon(pub.amenity)}
              </span>
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
