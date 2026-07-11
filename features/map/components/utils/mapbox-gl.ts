import type { Map as MapboxMap } from "mapbox-gl";

import { placeTypeColor } from "@/lib/place-type";
import { lightenColor } from "@/lib/color";

// Place types rendered as individual symbol-layer markers.
export const PLACE_ICON_TYPES = ["pub", "bar", "biergarten"] as const;

// Symbol layer ids
export const PLACES_SOURCE = "places-source";
export const PLACES_LAYER = "places-symbols";
export const PLACES_SELECTED_LAYER = "places-symbols-selected";

// Persists viewport across remounts (e.g. locale switch). Module-level singleton
// survives React unmount/remount; resets only on full page reload.
let savedViewport = {
  longitude: 19.374227,
  latitude: 52.188527,
  zoom: 5.7,
};

export function getSavedViewport() {
  return { ...savedViewport };
}

export function setSavedViewport(viewport: {
  longitude: number;
  latitude: number;
  zoom: number;
}) {
  savedViewport = viewport;
}

// Glyph paths mirror assets/icons.tsx (kept inline so icons can be rasterized
// onto a canvas for the Mapbox symbol layer without rendering React).
const ICON_GLYPHS: Record<string, { viewBox: string; paths: string[] }> = {
  pub: {
    viewBox: "0 0 24 24",
    paths: [
      "M6 5h9v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z",
      "M15 8h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3",
      "M8 3v2M11 3v2",
    ],
  },
  bar: {
    viewBox: "0 0 24 24",
    paths: ["M5 4h14l-6 8v6M13 18h-4M13 18h4"],
  },
  biergarten: {
    viewBox: "0 0 24 24",
    paths: ["M12 3l6 9h-3l4 6H5l4-6H6z", "M12 21v-3"],
  },
};

export function placeIconId(placeType: string): string {
  return `place-icon-${placeType}`;
}

function buildIconSvg(placeType: string): string {
  const color = placeTypeColor(placeType);
  const top = lightenColor(color, 0.12);
  const bottom = lightenColor(color, 0.32);
  const glyph = ICON_GLYPHS[placeType];
  const paths = glyph.paths
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 36 36"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${top}"/><stop offset="100%" stop-color="${bottom}"/></linearGradient></defs><rect x="2" y="2" width="32" height="32" rx="12" fill="${color}" opacity="0.33"/><rect x="4" y="4" width="28" height="28" rx="10" fill="url(#g)"/><svg x="10" y="10" width="16" height="16" viewBox="${glyph.viewBox}">${paths}</svg></svg>`;
}

export type PlaceIconImages = Record<string, HTMLImageElement>;

// Rasterizes each place-type icon SVG into a decoded HTMLImageElement. Run once;
// the decoded images are then registered synchronously whenever the style needs
// them (initial load and after a theme switch, which drops custom images).
export function decodePlaceIcons(): Promise<PlaceIconImages> {
  return Promise.all(
    PLACE_ICON_TYPES.map(
      (placeType) =>
        new Promise<[string, HTMLImageElement]>((resolve) => {
          const img = new Image(72, 72);
          img.onload = () => resolve([placeType, img]);
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
            buildIconSvg(placeType),
          )}`;
        }),
    ),
  ).then((entries) => Object.fromEntries(entries));
}

// Synchronously registers any not-yet-present icons from a pre-decoded set.
// Synchronous matters: it runs inside the styledata handler before react-map-gl
// re-lays-out the symbol layer, so the icons exist when the layer is rebuilt.
export function addPlaceIcons(map: MapboxMap, images: PlaceIconImages): void {
  for (const placeType of PLACE_ICON_TYPES) {
    const id = placeIconId(placeType);
    const img = images[placeType];
    if (img && !map.hasImage(id)) map.addImage(id, img, { pixelRatio: 2 });
  }
}
