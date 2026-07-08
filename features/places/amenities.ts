import type { IconType } from "react-icons";
import {
  LuTrees,
  LuCigarette,
  LuBeer,
  LuGlassWater,
  LuUtensils,
  LuMusic,
  LuDog,
  LuTag,
} from "react-icons/lu";
import type { AmenityKey } from "@/features/places/schemas";

export { AMENITY_KEYS, AMENITY_OTHER_MAX, type AmenityKey } from "@/features/places/schemas";

// labelKey resolves against the `guestCheck` translation namespace.
export const AMENITY_CONFIG: Record<AmenityKey, { labelKey: string; Icon: IconType }> = {
  outdoor_seating: { labelKey: "outdoor", Icon: LuTrees },
  smoking_area: { labelKey: "smoking", Icon: LuCigarette },
  great_beer_selection: { labelKey: "beerSelection", Icon: LuBeer },
  lots_of_beers_on_tap: { labelKey: "beersOnTap", Icon: LuGlassWater },
  serves_food: { labelKey: "servesFood", Icon: LuUtensils },
  live_music: { labelKey: "liveMusic", Icon: LuMusic },
  dog_friendly: { labelKey: "dogFriendly", Icon: LuDog },
};

export const OtherAmenityIcon: IconType = LuTag;
