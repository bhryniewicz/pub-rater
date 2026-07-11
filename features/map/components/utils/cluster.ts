import type { MapMarker } from "@/lib/supabase";

import { dominantPlaceType } from "@/lib/place-type";
import { CLUSTER_THRESHOLD, SPLIT_ZOOM, LARGE_CLUSTER } from "@/lib/constants";

type PlaceFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: { id: string; place_type: string; name: string };
  }>;
};

function gridSizeForZoom(zoom: number): number {
  return 0.4 / Math.pow(2, zoom - 6);
}

export type ClusterBounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

export type ClusterItem =
  | { type: "place"; place: MapMarker }
  | {
      type: "cluster";
      count: number;
      lat: number;
      lon: number;
      dominantPlaceType: string;
      bounds: ClusterBounds;
    };

function centroid(places: MapMarker[]) {
  return {
    lat: places.reduce((s, p) => s + p.lat, 0) / places.length,
    lon: places.reduce((s, p) => s + p.lon, 0) / places.length,
  };
}

function boundsOf(places: MapMarker[]): ClusterBounds {
  const lats = places.map((p) => p.lat);
  const lons = places.map((p) => p.lon);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
  };
}

function splitIntoTwo(
  places: MapMarker[],
): { places: MapMarker[]; lat: number; lon: number }[] {
  const lats = places.map((p) => p.lat);
  const lons = places.map((p) => p.lon);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lonSpan = Math.max(...lons) - Math.min(...lons);
  const sorted = [...places].sort((a, b) =>
    latSpan >= lonSpan ? a.lat - b.lat : a.lon - b.lon,
  );
  const mid = Math.ceil(sorted.length / 2);
  const g1 = sorted.slice(0, mid);
  const g2 = sorted.slice(mid);
  return [
    { places: g1, ...centroid(g1) },
    { places: g2, ...centroid(g2) },
  ];
}

type Cell = { places: MapMarker[]; lat: number; lon: number };

function mergeCells(cells: Cell[], threshold: number): Cell[] {
  const merged = new Array(cells.length).fill(false);
  const result: Cell[] = [];

  for (let i = 0; i < cells.length; i++) {
    if (merged[i]) continue;
    const group: MapMarker[] = [...cells[i].places];

    for (let j = i + 1; j < cells.length; j++) {
      if (merged[j]) continue;
      const dlat = Math.abs(cells[i].lat - cells[j].lat);
      const dlon = Math.abs(cells[i].lon - cells[j].lon);
      if (dlat < threshold && dlon < threshold) {
        merged[j] = true;
        group.push(...cells[j].places);
      }
    }

    const c = centroid(group);
    result.push({ places: group, lat: c.lat, lon: c.lon });
  }

  return result;
}

export function clusterPlaces(
  places: MapMarker[],
  zoom: number,
): ClusterItem[] {
  const snapped = Math.round(zoom);

  if (snapped >= CLUSTER_THRESHOLD) {
    return places.map((place) => ({ type: "place", place }));
  }

  const size = gridSizeForZoom(snapped);
  const grid = new globalThis.Map<string, Cell>();

  for (const place of places) {
    const cellLat = Math.floor(place.lat / size);
    const cellLon = Math.floor(place.lon / size);
    const key = `${cellLat},${cellLon}`;
    if (!grid.has(key)) {
      grid.set(key, { places: [], lat: 0, lon: 0 });
    }
    grid.get(key)!.places.push(place);
  }

  for (const cell of grid.values()) {
    const c = centroid(cell.places);
    cell.lat = c.lat;
    cell.lon = c.lon;
  }

  const cells = mergeCells(Array.from(grid.values()), size);

  const items: ClusterItem[] = [];
  for (const cell of cells) {
    if (cell.places.length === 1) {
      items.push({ type: "place", place: cell.places[0] });
    } else if (cell.places.length >= LARGE_CLUSTER && snapped >= SPLIT_ZOOM) {
      for (const half of splitIntoTwo(cell.places)) {
        if (half.places.length === 1) {
          items.push({ type: "place", place: half.places[0] });
        } else {
          items.push({
            type: "cluster",
            count: half.places.length,
            lat: half.lat,
            lon: half.lon,
            dominantPlaceType: dominantPlaceType(half.places),
            bounds: boundsOf(half.places),
          });
        }
      }
    } else {
      items.push({
        type: "cluster",
        count: cell.places.length,
        lat: cell.lat,
        lon: cell.lon,
        dominantPlaceType: dominantPlaceType(cell.places),
        bounds: boundsOf(cell.places),
      });
    }
  }
  return items;
}

export function placesToGeoJSON(items: ClusterItem[]): PlaceFeatureCollection {
  return {
    type: "FeatureCollection",
    features: items
      .filter(
        (it): it is Extract<ClusterItem, { type: "place" }> =>
          it.type === "place",
      )
      .map((it) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [it.place.lon, it.place.lat] },
        properties: {
          id: it.place.id,
          place_type: it.place.place_type,
          name: it.place.name,
        },
      })),
  };
}
