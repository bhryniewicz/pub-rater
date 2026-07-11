import type { ComponentType } from "react";
import { LuCigarette, LuGlassWater, LuTag } from "react-icons/lu";
import {
  BiergartenSolid,
  PubMug,
  ForkKnife,
  Music,
  Dog,
} from "@/assets/icons";
import type { AmenityKey } from "@/schemas/forms";

export { AMENITY_KEYS, type AmenityKey } from "@/schemas/forms";

type AmenityIcon = ComponentType<{
  size?: number;
  color?: string;
  className?: string;
}>;

// labelKey resolves against the `guestCheck` translation namespace.
export const AMENITY_CONFIG: Record<AmenityKey, { labelKey: string; Icon: AmenityIcon }> = {
  outdoor_seating: { labelKey: "outdoor", Icon: BiergartenSolid },
  smoking_area: { labelKey: "smoking", Icon: LuCigarette },
  great_beer_selection: { labelKey: "beerSelection", Icon: PubMug },
  lots_of_beers_on_tap: { labelKey: "beersOnTap", Icon: LuGlassWater },
  serves_food: { labelKey: "servesFood", Icon: ForkKnife },
  live_music: { labelKey: "liveMusic", Icon: Music },
  dog_friendly: { labelKey: "dogFriendly", Icon: Dog },
};

export const OtherAmenityIcon: AmenityIcon = LuTag;
