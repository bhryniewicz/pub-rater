import {
  PubMug,
  BarSolid,
  BiergartenSolid,
  HeartIcon,
  HomeIcon,
} from "@/assets/icons";
import { colorGradient } from "@/lib/color";
import { CATEGORY_COLORS } from "@/lib/constants";
import type { MapMarker } from "@/lib/supabase";

const PLACE_TYPE_KEYS = ["pub", "bar", "biergarten", "sport"] as const;
export type PlaceType = (typeof PLACE_TYPE_KEYS)[number];

export const PLACE_TYPE_CONFIG = {
  pub: { label: "Pub", color: CATEGORY_COLORS.pub },
  bar: { label: "Bar", color: CATEGORY_COLORS.bar },
  biergarten: { label: "Outdoor", color: CATEGORY_COLORS.biergarten },
  events: { label: "Events", color: CATEGORY_COLORS.events },
  topRated: { label: "Top rated", color: CATEGORY_COLORS.topRated },
  sport: { label: "Sport", color: CATEGORY_COLORS.sport },
  liked: { label: "Liked", color: CATEGORY_COLORS.liked },
  owned: { label: "Owned", color: CATEGORY_COLORS.owned },
} as const;

export type PlaceTypeKey = keyof typeof PLACE_TYPE_CONFIG;

export const PLACE_TYPE_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(PLACE_TYPE_CONFIG).map(([k, v]) => [k, v.color]),
);

export const PLACE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(PLACE_TYPE_CONFIG).map(([k, v]) => [k, v.label]),
);

// Place types only — used in forms
export const PLACE_TYPE_FORM_LIST = PLACE_TYPE_KEYS.map((value) => ({
  value,
  label: PLACE_TYPE_CONFIG[value].label,
}));

export function placeTypeColor(placeType: string): string {
  return PLACE_TYPE_COLORS[placeType] ?? "#4b5563";
}

export function placeTypeGradient(placeType: string): string {
  return colorGradient(placeTypeColor(placeType));
}

export function dominantPlaceType(pubs: MapMarker[]): string {
  const counts: Record<string, number> = {};
  for (const p of pubs) {
    counts[p.place_type] = (counts[p.place_type] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (!top) return "pub";
  return top[0];
}

export function PlaceTypeIcon({
  placeType,
  size = 20,
  color = "currentColor",
}: {
  placeType: string;
  size?: number;
  color?: string;
}) {
  switch (placeType) {
    case "pub":
      return <PubMug size={size} color={color} />;
    case "bar":
      return <BarSolid size={size} color={color} />;
    case "biergarten":
      return <BiergartenSolid size={size} color={color} />;
    case "liked":
      return <HeartIcon size={size} color={color} />;
    case "owned":
      return <HomeIcon size={size} color={color} />;
  }
}
