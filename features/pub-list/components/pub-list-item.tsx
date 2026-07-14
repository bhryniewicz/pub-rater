"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { type PubListItem as PubListItemType } from "@/lib/supabase";
import {
  isOpenNow,
  getCloseTimeToday,
  minutesUntilClose,
} from "@/lib/opening-hours";
import Image from "next/image";
import { LuMap, LuCheck } from "react-icons/lu";
import { PubMug } from "@/assets/icons";
import { motion } from "framer-motion";
import { HeartIcon, HeartOutlineIcon } from "@/assets/icons";
import { PlaceTypeIcon } from "@/lib/place-type";
import {
  AMENITY_CONFIG,
  OtherAmenityIcon,
  type AmenityKey,
} from "@/lib/amenities";
import { Tooltip } from "@/components/ui/tooltip";
import { useLikePlace } from "@/features/pub-list/api/like-place";
import { analytics } from "@/lib/analytics";
import { OpenStatus } from "./open-status";
import { useReviewedMarkerIds } from "../api/get-reviewed-marker-ids";

// Status colors resolve from CSS variables so light + dark share one card.
const CARD_STATUS_COLORS = {
  open: "var(--status-open)",
  closingSoon: "var(--status-closing)",
  closed: "var(--status-closed)",
};

type Props = {
  marker: PubListItemType;
  shouldAnimate: boolean;
  onShowMap: (coords?: { id: string; lat: number; lon: number }) => void;
};

export function PubListItem({ marker, shouldAnimate, onShowMap }: Props) {
  const t = useTranslations("pubList");
  const tGC = useTranslations("guestCheck");
  const { toggle, likedPlaces, canLike } = useLikePlace();
  const amenities = (marker.amenities ?? []) as AmenityKey[];
  const reviewedIds = useReviewedMarkerIds();
  const isValidated = reviewedIds.has(marker.id);

  // Tag pills — colors resolve from CSS variables per theme.
  const pillBase =
    "shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono font-semibold text-[8px] uppercase tracking-[0.12em]";
  const pillCategory = `${pillBase} [background-color:var(--chip-cat-bg)] border-[color:var(--chip-cat-border)] text-[color:var(--chip-cat-text)]`;
  const pillPlain = `${pillBase} [background-color:var(--chip-plain-bg)] border-[color:var(--chip-plain-border)] text-[color:var(--chip-plain-text)]`;

  const isLiked = likedPlaces.includes(marker.id);

  function handleShowMap() {
    analytics.mapButtonClicked(marker);
    onShowMap({ id: marker.id, lat: marker.lat, lon: marker.lon });
  }

  function handleLike() {
    analytics.pubCardLikeToggled({ ...marker, liked: !isLiked });
    toggle(marker.id);
  }

  const openNow = marker.opening_hours ? isOpenNow(marker.opening_hours) : null;
  const closeTime = marker.opening_hours
    ? getCloseTimeToday(marker.opening_hours)
    : null;
  const minsToClose = marker.opening_hours
    ? minutesUntilClose(marker.opening_hours)
    : null;
  const closingSoon = minsToClose !== null && minsToClose <= 60;
  const reviewCount = marker.app_review_count ?? 0;
  const location = marker.address
    ? [marker.address, marker.city].filter(Boolean).join(", ")
    : marker.city;
  const rating =
    marker.app_rating && marker.app_rating > 0
      ? marker.app_rating.toFixed(1)
      : "–";

  return (
    <motion.li
      key={marker.id}
      initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="shrink-0 rounded-2xl overflow-hidden border border-[color:var(--pubcard-border)] [background:var(--pubcard-bg)] hover:shadow-sm hover:shadow-black/10 transition-all md:overflow-visible md:rounded-[22px] md:flex md:flex-row md:items-stretch md:gap-4 md:p-4"
    >
      {/* Desktop: horizontal card */}
      <div className="hidden md:flex w-full flex-row items-stretch gap-4">
        {/* Image with rating badge overlay */}
        <Link
          href={`/places/${marker.id}`}
          onClick={() => analytics.pubCardOpened(marker)}
          className="relative shrink-0 w-[120px] h-[120px] rounded-[18px] overflow-hidden border border-[color:var(--pubcard-border)] [background-color:var(--pubcard-img-bg)]"
        >
          {marker.thumbnail ? (
            <Image
              src={marker.thumbnail}
              alt={marker.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[color:var(--pubcard-img-icon)]">
              <PlaceTypeIcon placeType={marker.place_type} size={44} />
            </div>
          )}
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--pubcard-badge-border)] [background-color:var(--pubcard-badge-bg)] px-2 py-1 backdrop-blur-sm">
            <PubMug size={16} className="text-primary" />
            <span className="font-mono font-bold text-sm text-[color:var(--pubcard-badge-text)]">
              {rating}
            </span>
          </div>
        </Link>

        {/* Middle content — title/info at top, categories at bottom */}
        <div className="flex flex-col flex-1 min-w-0 justify-between py-2">
          <Link
            href={`/places/${marker.id}`}
            onClick={() => analytics.pubCardOpened(marker)}
            className="flex flex-col gap-1 min-w-0"
          >
            <p className="font-mono font-bold text-xl text-[color:var(--pubcard-title)] leading-tight truncate">
              {marker.name}
            </p>

            <p className="flex items-center gap-1.5 flex-nowrap overflow-hidden text-[11px] font-sans font-semibold text-[color:var(--pubcard-meta)]">
              {reviewCount > 0 && (
                <span className="shrink-0">
                  {t("reviewCount", { count: reviewCount })}
                </span>
              )}
              {(marker.address || marker.city) && (
                <>
                  {reviewCount > 0 && (
                    <span className="shrink-0 text-[color:var(--pubcard-sep)] text-[13px] leading-none">
                      •
                    </span>
                  )}
                  {marker.address ? (
                    <Tooltip label={location!} className="min-w-0">
                      <span className="min-w-0 truncate">{location}</span>
                    </Tooltip>
                  ) : (
                    <span className="shrink-0">{marker.city}</span>
                  )}
                </>
              )}
              {marker.price_tier != null && (
                <>
                  {(reviewCount > 0 || marker.address || marker.city) && (
                    <span className="shrink-0 text-[color:var(--pubcard-sep)] text-[13px] leading-none">
                      •
                    </span>
                  )}
                  <span className="shrink-0 inline-flex items-center font-mono font-bold tracking-tight">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={
                          i <= marker.price_tier!
                            ? "text-[color:var(--pubcard-price)]"
                            : "text-[color:var(--pubcard-price-off)]"
                        }
                      >
                        $
                      </span>
                    ))}
                  </span>
                </>
              )}
              {(reviewCount > 0 ||
                marker.address ||
                marker.city ||
                marker.price_tier != null) && (
                <span className="shrink-0 text-[color:var(--pubcard-sep)] text-[13px] leading-none">
                  •
                </span>
              )}
              <span className="shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap">
                <OpenStatus
                  openNow={openNow}
                  closeTime={closeTime}
                  closingSoon={closingSoon}
                  variant="inline"
                  accentSecondary
                  solid
                  colors={CARD_STATUS_COLORS}
                />
              </span>
            </p>
          </Link>

          {/* Tags — single scrollable row (verified first) */}
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {isValidated && (
              <span className={pillPlain}>
                <LuCheck size={10} />
                {t("verified")}
              </span>
            )}
            <span className={pillCategory}>
              <PlaceTypeIcon placeType={marker.place_type} size={10} />
              {marker.place_type}
            </span>
            {amenities.map((key) => {
              const config = AMENITY_CONFIG[key];
              if (!config) return null;
              const { labelKey, Icon } = config;
              return (
                <span key={key} className={pillCategory}>
                  <Icon size={10} />
                  {tGC(labelKey)}
                </span>
              );
            })}
            {marker.amenity_other && (
              <span className={pillCategory}>
                <OtherAmenityIcon size={10} />
                {marker.amenity_other}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 self-start">
          <button
            onClick={handleShowMap}
            aria-label={t("showOnMap")}
            className="w-9 h-9 flex items-center justify-center rounded-[12px] border border-[color:var(--pubcard-btn-border)] text-[color:var(--pubcard-btn-text)] hover:[background-color:var(--pubcard-btn-hover)] transition cursor-pointer"
          >
            <LuMap size={14} />
          </button>
          {canLike && (
            <button
              onClick={handleLike}
              aria-label={isLiked ? t("unlike") : t("like")}
              className="w-9 h-9 flex items-center justify-center rounded-[12px] border border-[color:var(--pubcard-btn-border)] hover:[background-color:var(--pubcard-btn-hover)] transition cursor-pointer"
            >
              {isLiked ? (
                <HeartIcon size={14} className="text-primary" />
              ) : (
                <HeartOutlineIcon
                  size={14}
                  className="text-[color:var(--pubcard-btn-text)]"
                />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile: vertical card */}
      <div className="flex md:hidden w-full flex-col">
        {/* Hero image — full width with overlays */}
        <Link
          href={`/places/${marker.id}`}
          onClick={() => analytics.pubCardOpened(marker)}
          className="relative block w-full h-40 [background-color:var(--pubcard-img-bg)]"
        >
          {marker.thumbnail ? (
            <Image
              src={marker.thumbnail}
              alt={marker.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[color:var(--pubcard-img-icon)]">
              <PlaceTypeIcon placeType={marker.place_type} size={52} />
            </div>
          )}

          {/* Top-right: map + mark buttons */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                handleShowMap();
              }}
              aria-label={t("showOnMap")}
              className="w-9 h-9 flex items-center justify-center rounded-[12px] border border-white/15 bg-black/40 backdrop-blur-sm text-[#EFE4CF] hover:bg-black/60 transition cursor-pointer"
            >
              <LuMap size={16} />
            </button>
            {canLike && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleLike();
                }}
                aria-label={isLiked ? t("unlike") : t("like")}
                className="w-9 h-9 flex items-center justify-center rounded-[12px] border border-white/15 bg-black/40 backdrop-blur-sm hover:bg-black/60 transition cursor-pointer"
              >
                {isLiked ? (
                  <HeartIcon size={16} className="text-primary" />
                ) : (
                  <HeartOutlineIcon size={16} className="text-[#EFE4CF]" />
                )}
              </button>
            )}
          </div>

          {/* Bottom-left: rating badge */}
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--pubcard-badge-border)] [background-color:var(--pubcard-badge-bg)] px-2 py-1 backdrop-blur-sm">
            <PubMug size={16} className="text-primary" />
            <span className="font-mono font-bold text-sm text-[color:var(--pubcard-badge-text)]">
              {rating}
            </span>
          </div>
        </Link>

        {/* Content below image */}
        <div className="flex flex-col gap-2.5 p-4">
          <Link
            href={`/places/${marker.id}`}
            onClick={() => analytics.pubCardOpened(marker)}
            className="flex flex-col gap-1.5 min-w-0"
          >
            <p className="font-mono font-bold text-xl text-[color:var(--pubcard-title)] leading-tight truncate">
              {marker.name}
            </p>

            {/* Info line — horizontally scrollable */}
            <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[11px] font-sans font-semibold text-[color:var(--pubcard-meta)]">
              {reviewCount > 0 && (
                <span className="shrink-0">
                  {t("reviewCount", { count: reviewCount })}
                </span>
              )}
              {(marker.address || marker.city) && (
                <>
                  {reviewCount > 0 && (
                    <span className="shrink-0 text-[color:var(--pubcard-sep)] text-[13px] leading-none">
                      •
                    </span>
                  )}
                  <span className="shrink-0">{location}</span>
                </>
              )}
              {marker.price_tier != null && (
                <>
                  {(reviewCount > 0 || marker.address || marker.city) && (
                    <span className="shrink-0 text-[color:var(--pubcard-sep)] text-[13px] leading-none">
                      •
                    </span>
                  )}
                  <span className="shrink-0 inline-flex items-center font-mono font-bold tracking-tight">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={
                          i <= marker.price_tier!
                            ? "text-[color:var(--pubcard-price)]"
                            : "text-[color:var(--pubcard-price-off)]"
                        }
                      >
                        $
                      </span>
                    ))}
                  </span>
                </>
              )}
              {(reviewCount > 0 ||
                marker.address ||
                marker.city ||
                marker.price_tier != null) && (
                <span className="shrink-0 text-[color:var(--pubcard-sep)] text-[13px] leading-none">
                  •
                </span>
              )}
              <span className="shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap">
                <OpenStatus
                  openNow={openNow}
                  closeTime={closeTime}
                  closingSoon={closingSoon}
                  variant="inline"
                  accentSecondary
                  solid
                  colors={CARD_STATUS_COLORS}
                />
              </span>
            </div>
          </Link>

          {/* Tags — single scrollable row (verified first) */}
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {isValidated && (
              <span className={pillPlain}>
                <LuCheck size={10} />
                {t("verified")}
              </span>
            )}
            <span className={pillCategory}>
              <PlaceTypeIcon placeType={marker.place_type} size={10} />
              {marker.place_type}
            </span>
            {amenities.map((key) => {
              const config = AMENITY_CONFIG[key];
              if (!config) return null;
              const { labelKey, Icon } = config;
              return (
                <span key={key} className={pillCategory}>
                  <Icon size={10} />
                  {tGC(labelKey)}
                </span>
              );
            })}
            {marker.amenity_other && (
              <span className={pillCategory}>
                <OtherAmenityIcon size={10} />
                {marker.amenity_other}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.li>
  );
}
