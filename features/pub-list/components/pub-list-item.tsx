"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { type PubListItem as PubListItemType } from "@/lib/supabase";
import {
  isOpenNow,
  getCloseTimeToday,
  minutesUntilClose,
} from "@/lib/opening-hours";
import Image from "next/image";
import { IoLocationSharp } from "react-icons/io5";
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
import { BeerRating } from "@/components/beer-rating";
import { Tooltip } from "@/components/ui/tooltip";
import { useLikePlace } from "@/features/pub-list/api/like-place";
import { analytics } from "@/lib/analytics";
import { OpenStatus } from "./open-status";
import { useReviewedMarkerIds } from "../api/get-reviewed-marker-ids";

// Lighter, harmonized status palette for the espresso desktop-dark card.
const DARK_STATUS_COLORS = {
  open: "#6FBF73",
  closingSoon: "#E3B84C",
  closed: "#E36A6A",
};

const TicketBarcode = memo(function TicketBarcode({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const bars: Array<{ y: number; h: number }> = [];
  const src = (id + name + id + name).replace(/[-\s]/g, "").toUpperCase();
  let y = 0;
  for (const ch of src) {
    const code = ch.charCodeAt(0);
    const h = (code % 3) + 1;
    bars.push({ y, h });
    y += h + 3;
    if (y > 200) break;
  }
  return (
    <svg
      viewBox={`0 0 1 ${y}`}
      preserveAspectRatio="none"
      height={1}
      className="flex-1 w-full block min-h-0 text-foreground/30"
      aria-hidden="true"
    >
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={0}
          y={bar.y}
          width={1}
          height={bar.h}
          fill="currentColor"
        />
      ))}
    </svg>
  );
});

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

  // Tag pills for the desktop-dark (espresso) redesign card — outline style.
  const darkPillBase =
    "shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-transparent font-mono font-semibold text-[8px] uppercase tracking-[0.12em]";
  const darkPillMuted = `${darkPillBase} border-primary/45 text-primary`;
  const darkPillCream = `${darkPillBase} border-[#6F6350] text-[#DBCDB2]`;

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

  return (
    <motion.li
      key={marker.id}
      initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="shrink-0 rounded-2xl overflow-hidden bg-card border border-transparent dark:border-white/10 hover:shadow-sm hover:shadow-black/10 transition-all md:rounded md:flex md:flex-row md:gap-3 md:p-4 md:overflow-visible dark:bg-[radial-gradient(140%_160%_at_100%_0%,#2a1c10,#170f09_65%)] md:dark:gap-4 md:dark:rounded-[22px] md:dark:border-white/10 md:dark:p-4 md:dark:items-stretch"
    >
      {/* Light theme (mobile + desktop): existing layout — hidden on all dark */}
      <div className="contents dark:hidden">
      {/* Image — full-width on mobile, fixed square on desktop */}
      <div className="relative w-full h-52 bg-secondary md:w-36 md:h-36 md:shrink-0 md:rounded-lg md:overflow-hidden">
        <Link
          href={`/places/${marker.id}`}
          onClick={() => analytics.pubCardOpened(marker)}
          className="relative block w-full h-full"
        >
          {marker.thumbnail ? (
            <Image
              src={marker.thumbnail}
              alt={marker.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary/40">
              <PlaceTypeIcon placeType={marker.place_type} size={52} />
            </div>
          )}
        </Link>

        {/* Mobile top-right: map + mark buttons */}
        <div className="md:hidden absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={handleShowMap}
            aria-label={t("showOnMap")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm cursor-pointer"
          >
            <LuMap size={18} className="text-white" />
          </button>
          {canLike && (
            <button
              onClick={handleLike}
              aria-label={isLiked ? t("unlike") : t("like")}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm cursor-pointer"
            >
              {isLiked ? (
                <HeartIcon size={18} className="text-primary" />
              ) : (
                <HeartOutlineIcon size={18} className="text-white" />
              )}
            </button>
          )}
        </div>

        {/* Mobile bottom-left: open/close status */}
        <div className="md:hidden absolute bottom-3 left-3">
          <OpenStatus
            openNow={openNow}
            closeTime={closeTime}
            closingSoon={closingSoon}
            variant="badge"
          />
        </div>
      </div>

      {/* Content + mobile footer */}
      <div className="flex flex-col flex-1 min-w-0">
        <Link
          href={`/places/${marker.id}`}
          onClick={() => analytics.pubCardOpened(marker)}
          className="flex flex-col gap-2.5 p-4 md:p-0 md:py-1 flex-1 min-w-0"
        >
          <p className="pub-name font-mono font-semibold text-base md:text-base uppercase tracking-wider text-foreground leading-tight truncate">
            {marker.name}
          </p>

          {marker.app_rating ? (
            <BeerRating
              rating={marker.app_rating}
              count={marker.app_review_count}
            />
          ) : (
            <span className="text-xs text-muted-foreground font-sans">
              {t("noReview")}
            </span>
          )}

          <p className="flex items-center gap-1.5 text-xs text-foreground/80 font-sans font-semibold">
            {(marker.address || marker.city) && (
              <>
                <IoLocationSharp className="w-3.5 h-3.5 shrink-0 text-primary self-center" />
                {marker.address ?? marker.city}
              </>
            )}
            {marker.price_tier != null && (marker.address || marker.city) && (
              <span className="text-foreground/80 text-[8px]">•</span>
            )}
            {marker.price_tier != null && (
              <span className="shrink-0 inline-flex items-center font-mono font-bold tracking-tight">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={
                      i <= marker.price_tier!
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                  >
                    $
                  </span>
                ))}
              </span>
            )}
            <span className="hidden md:inline-flex items-center gap-1.5">
              {(marker.address || marker.city) && (
                <span className="text-foreground/80 text-[8px]">•</span>
              )}
              <OpenStatus
                openNow={openNow}
                closeTime={closeTime}
                closingSoon={closingSoon}
                variant="inline"
              />
            </span>
          </p>

          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto md:mt-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary dark:bg-primary/20 text-foreground dark:text-white font-mono font-semibold text-[9px] uppercase tracking-[0.15em]">
              <PlaceTypeIcon placeType={marker.place_type} size={12} />
              {marker.place_type}
            </span>
            {amenities.map((key) => {
              const config = AMENITY_CONFIG[key];
              if (!config) return null;
              const { labelKey, Icon } = config;
              return (
                <span
                  key={key}
                  className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary dark:bg-primary/20 text-foreground dark:text-white font-mono font-semibold text-[9px] uppercase tracking-[0.15em]"
                >
                  <Icon size={12} />
                  {tGC(labelKey)}
                </span>
              );
            })}
            {marker.amenity_other && (
              <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary dark:bg-primary/20 text-foreground dark:text-white font-mono font-semibold text-[9px] uppercase tracking-[0.15em]">
                <OtherAmenityIcon size={12} />
                {marker.amenity_other}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Desktop: action icons */}
      <div className="hidden md:flex flex-row items-center gap-4 shrink-0 self-start pt-1 pr-4">
        <button
          onClick={handleShowMap}
          aria-label={t("showOnMap")}
          className="flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground cursor-pointer"
        >
          <LuMap size={15} />
        </button>
        {canLike && (
          <button
            onClick={handleLike}
            aria-label={isLiked ? t("unlike") : t("like")}
            className="flex items-center justify-center rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            {isLiked ? (
              <HeartIcon size={15} className="text-primary" />
            ) : (
              <HeartOutlineIcon size={15} className="text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Desktop: ticket stub — right side */}
      <div className="hidden md:flex shrink-0 self-stretch -my-4 -mr-4 items-stretch min-h-0">
        {/* Perforated separator with notches */}
        <div className="relative flex flex-col items-center self-stretch">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-background z-10" />
          <div className="flex-1 mt-[7px] mb-[7px] border-l border-dashed border-white/20" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 rounded-full bg-background z-10" />
        </div>

        {/* Stub content — barcode + validated stamp */}
        <div className="relative w-[112px] max-h-[180px] self-stretch overflow-hidden p-[14px] flex flex-col">
          <TicketBarcode id={marker.id} name={marker.name} />
          {isValidated && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="inline-flex rotate-[-68deg] whitespace-nowrap rounded-lg border-2 border-red-500 bg-black/30 px-2 py-1 font-mono text-[12px] font-extrabold uppercase tracking-[0.1em] text-red-400 shadow-[0_0_10px_1px_rgba(239,68,68,0.55)] [text-shadow:0_0_6px_rgba(239,68,68,0.9)]">
                {t("validated")}
              </span>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Desktop + dark: espresso redesign card */}
      <div className="hidden md:dark:flex w-full flex-row items-stretch gap-4">
        {/* Image — dark square with rating badge overlay */}
        <Link
          href={`/places/${marker.id}`}
          onClick={() => analytics.pubCardOpened(marker)}
          className="relative shrink-0 w-[120px] h-[120px] rounded-[18px] overflow-hidden border border-white/10 bg-[#241207]"
        >
          {marker.thumbnail ? (
            <Image
              src={marker.thumbnail}
              alt={marker.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/25">
              <PlaceTypeIcon placeType={marker.place_type} size={44} />
            </div>
          )}
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#160d07]/85 px-2 py-1 backdrop-blur-sm">
            <PubMug size={16} className="text-primary" />
            <span className="font-mono font-bold text-sm text-[#F2E8D4]">
              {marker.app_rating && marker.app_rating > 0
                ? marker.app_rating.toFixed(1)
                : "–"}
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
            <p className="font-mono font-bold text-xl text-[#F2E8D4] leading-tight truncate">
              {marker.name}
            </p>

            <p className="flex items-center gap-1.5 flex-nowrap overflow-hidden text-[11px] font-sans font-semibold text-[#B3A184]">
              {reviewCount > 0 && (
                <span className="shrink-0">
                  {t("reviewCount", { count: reviewCount })}
                </span>
              )}
              {(marker.address || marker.city) && (
                <>
                  {reviewCount > 0 && (
                    <span className="shrink-0 text-[#8A7A5E] text-[13px] leading-none">
                      •
                    </span>
                  )}
                  {marker.address ? (
                    <Tooltip label={marker.address} className="min-w-0">
                      <span className="min-w-0 truncate">{marker.address}</span>
                    </Tooltip>
                  ) : (
                    <span className="shrink-0">{marker.city}</span>
                  )}
                </>
              )}
              {marker.price_tier != null && (
                <>
                  {(reviewCount > 0 ||
                    marker.address ||
                    marker.city) && (
                    <span className="shrink-0 text-[#8A7A5E] text-[13px] leading-none">
                      •
                    </span>
                  )}
                  <span className="shrink-0 inline-flex items-center font-mono font-bold tracking-tight text-[#DBCDB2]">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={
                          i <= marker.price_tier!
                            ? "text-[#DBCDB2]"
                            : "text-[#DBCDB2]/30"
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
                <span className="shrink-0 text-[#8A7A5E] text-[13px] leading-none">
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
                  colors={DARK_STATUS_COLORS}
                />
              </span>
            </p>
          </Link>

          {/* Tags — single scrollable row (verified first) */}
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {isValidated && (
              <span className={darkPillCream}>
                <LuCheck size={10} />
                {t("verified")}
              </span>
            )}
            <span className={darkPillMuted}>
              <PlaceTypeIcon placeType={marker.place_type} size={10} />
              {marker.place_type}
            </span>
            {amenities.map((key) => {
              const config = AMENITY_CONFIG[key];
              if (!config) return null;
              const { labelKey, Icon } = config;
              return (
                <span key={key} className={darkPillMuted}>
                  <Icon size={10} />
                  {tGC(labelKey)}
                </span>
              );
            })}
            {marker.amenity_other && (
              <span className={darkPillMuted}>
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
            className="w-9 h-9 flex items-center justify-center rounded-[12px] border border-white/15 bg-transparent text-[#EFE4CF] hover:bg-white/8 transition cursor-pointer"
          >
            <LuMap size={14} />
          </button>
          {canLike && (
            <button
              onClick={handleLike}
              aria-label={isLiked ? t("unlike") : t("like")}
              className="w-9 h-9 flex items-center justify-center rounded-[12px] border border-white/15 bg-transparent hover:bg-white/8 transition cursor-pointer"
            >
              {isLiked ? (
                <HeartIcon size={14} className="text-primary" />
              ) : (
                <HeartOutlineIcon size={14} className="text-[#EFE4CF]" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile + dark: espresso redesign card (vertical) */}
      <div className="hidden max-md:dark:flex w-full flex-col">
        {/* Hero image — full width with overlays */}
        <Link
          href={`/places/${marker.id}`}
          onClick={() => analytics.pubCardOpened(marker)}
          className="relative block w-full h-40 bg-[#241207]"
        >
          {marker.thumbnail ? (
            <Image
              src={marker.thumbnail}
              alt={marker.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/25">
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
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#160d07]/85 px-2 py-1 backdrop-blur-sm">
            <PubMug size={16} className="text-primary" />
            <span className="font-mono font-bold text-sm text-[#F2E8D4]">
              {marker.app_rating && marker.app_rating > 0
                ? marker.app_rating.toFixed(1)
                : "–"}
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
            <p className="font-mono font-bold text-xl text-[#F2E8D4] leading-tight truncate">
              {marker.name}
            </p>

            {/* Info line — horizontally scrollable */}
            <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[11px] font-sans font-semibold text-[#B3A184]">
              {reviewCount > 0 && (
                <span className="shrink-0">
                  {t("reviewCount", { count: reviewCount })}
                </span>
              )}
              {(marker.address || marker.city) && (
                <>
                  {reviewCount > 0 && (
                    <span className="shrink-0 text-[#8A7A5E] text-[13px] leading-none">
                      •
                    </span>
                  )}
                  <span className="shrink-0">
                    {marker.address ?? marker.city}
                  </span>
                </>
              )}
              {marker.price_tier != null && (
                <>
                  {(reviewCount > 0 ||
                    marker.address ||
                    marker.city) && (
                    <span className="shrink-0 text-[#8A7A5E] text-[13px] leading-none">
                      •
                    </span>
                  )}
                  <span className="shrink-0 inline-flex items-center font-mono font-bold tracking-tight text-[#DBCDB2]">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={
                          i <= marker.price_tier!
                            ? "text-[#DBCDB2]"
                            : "text-[#DBCDB2]/30"
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
                <span className="shrink-0 text-[#8A7A5E] text-[13px] leading-none">
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
                  colors={DARK_STATUS_COLORS}
                />
              </span>
            </div>
          </Link>

          {/* Tags — single scrollable row (verified first) */}
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {isValidated && (
              <span className={darkPillCream}>
                <LuCheck size={10} />
                {t("verified")}
              </span>
            )}
            <span className={darkPillMuted}>
              <PlaceTypeIcon placeType={marker.place_type} size={10} />
              {marker.place_type}
            </span>
            {amenities.map((key) => {
              const config = AMENITY_CONFIG[key];
              if (!config) return null;
              const { labelKey, Icon } = config;
              return (
                <span key={key} className={darkPillMuted}>
                  <Icon size={10} />
                  {tGC(labelKey)}
                </span>
              );
            })}
            {marker.amenity_other && (
              <span className={darkPillMuted}>
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
