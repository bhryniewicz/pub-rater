import type { Map as MapboxMap } from "mapbox-gl";

import { placeTypeColor } from "@/features/places/place-type";

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
    viewBox: "4 7 17 15",
    paths: [
      "M5.5 8.5h9.5V20a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1z",
      "M15 10.5h2.6A2.4 2.4 0 0 1 20 12.9v1.6a2.4 2.4 0 0 1-2.4 2.4H15v-2h2.2a.6.6 0 0 0 .6-.6v-1.2a.6.6 0 0 0-.6-.6H15z",
    ],
  },
  bar: {
    viewBox: "0 0 24 24",
    paths: ["M3.5 5h17l-7.5 8.2V18h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-4.8z"],
  },
  biergarten: {
    viewBox: "0 0 24 24",
    paths: [
      "M12 2.5a5.5 5.5 0 0 0-4.9 8A4.2 4.2 0 0 0 9 18.6V20a1.1 1.1 0 0 0 2.2 0v-1.3h1.6V20a1.1 1.1 0 0 0 2.2 0v-1.4a4.2 4.2 0 0 0 1.9-8.1A5.5 5.5 0 0 0 12 2.5z",
    ],
  },
};

export function placeIconId(placeType: string): string {
  return `place-icon-${placeType}`;
}

function buildIconSvg(placeType: string): string {
  const color = placeTypeColor(placeType);
  const glyph = ICON_GLYPHS[placeType];
  const paths = glyph.paths.map((d) => `<path d="${d}" fill="#fff"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 36 36"><rect x="2" y="2" width="32" height="32" rx="12" fill="${color}" opacity="0.33"/><rect x="4" y="4" width="28" height="28" rx="10" fill="${color}"/><svg x="10" y="10" width="16" height="16" viewBox="${glyph.viewBox}">${paths}</svg></svg>`;
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
