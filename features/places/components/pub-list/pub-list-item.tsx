"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { type PubListItem as PubListItemType } from "@/lib/supabase";
import { isOpenNow, getCloseTimeToday } from "@/lib/opening-hours";
import Image from "next/image";
import { IoLocationSharp } from "react-icons/io5";
import { LuMap } from "react-icons/lu";
import { motion } from "framer-motion";
import { HeartIcon, HeartOutlineIcon } from "@/assets/icons";
import { PlaceTypeIcon } from "@/features/places/place-type";
import { BeerRating } from "@/components/beer-rating";
import { useLikePlace } from "@/features/places/api/like-place";

function TicketBarcode({ id, name }: { id: string; name: string }) {
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
        <rect key={i} x={0} y={bar.y} width={1} height={bar.h} fill="currentColor" />
      ))}
    </svg>
  );
}

function TicketBarcodeHorizontal({ id, name }: { id: string; name: string }) {
  const bars: Array<{ x: number; w: number }> = [];
  const src = (id + name + id + name).replace(/[-\s]/g, "").toUpperCase();
  let x = 0;
  for (const ch of src) {
    const code = ch.charCodeAt(0);
    const w = (code % 3) + 1;
    bars.push({ x, w });
    x += w + 3;
    if (x > 300) break;
  }
  return (
    <svg
      viewBox={`0 0 ${x} 1`}
      preserveAspectRatio="none"
      className="w-full h-6 block text-foreground/30"
      aria-hidden="true"
    >
      {bars.map((bar, i) => (
        <rect key={i} x={bar.x} y={0} width={bar.w} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}

type Props = {
  marker: PubListItemType;
  index: number;
  onShowOnMap: (coords: { id: string; lat: number; lon: number }) => void;
};

export function PubListItem({ marker, index, onShowOnMap }: Props) {
  const t = useTranslations("pubList");
  const { toggle, likedPlaces, canLike } = useLikePlace();
  const isLiked = likedPlaces.includes(marker.id);
  const openNow = marker.opening_hours ? isOpenNow(marker.opening_hours) : null;
  const closeTime = marker.opening_hours ? getCloseTimeToday(marker.opening_hours) : null;

  return (
    <motion.li
      key={marker.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.22,
        delay: Math.min(index * 0.04, 0.4),
        ease: "easeOut",
      }}
      className="shrink-0 rounded-2xl overflow-hidden bg-card border border-transparent dark:border-white/10 hover:shadow-sm hover:shadow-black/10 transition-all md:rounded md:flex md:flex-row md:gap-3 md:p-4 md:overflow-visible"
    >
      {/* Image — full-width on mobile, fixed square on desktop */}
      <div className="relative w-full h-52 bg-secondary md:w-36 md:h-36 md:shrink-0 md:rounded-lg md:overflow-hidden">
        <Link href={`/places/${marker.id}`} className="relative block w-full h-full">
          {marker.thumbnail ? (
            <Image src={marker.thumbnail} alt={marker.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary/40">
              <PlaceTypeIcon placeType={marker.place_type} size={52} />
            </div>
          )}
        </Link>

        {/* Mobile top-right: map + mark buttons */}
        <div className="md:hidden absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={() => onShowOnMap({ id: marker.id, lat: marker.lat, lon: marker.lon })}
            aria-label="Show on map"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm cursor-pointer"
          >
            <LuMap size={18} className="text-white" />
          </button>
          {canLike && (
            <button
              onClick={() => toggle(marker.id)}
              aria-label={isLiked ? "Unlike" : "Like"}
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${openNow === true ? "bg-open" : openNow === false ? "bg-closed" : "bg-zinc-400"}`}
            />
            <span className="text-xs font-bold text-white">
              {openNow === true
                ? closeTime
                  ? t("openUntil", { time: closeTime })
                  : t("openStatus")
                : openNow === false
                  ? t("closedStatus")
                  : t("noHours")}
            </span>
          </div>
        </div>
      </div>

      {/* Content + mobile footer */}
      <div className="flex flex-col flex-1 min-w-0">
        <Link
          href={`/places/${marker.id}`}
          className="flex flex-col gap-2.5 p-4 md:p-0 md:py-1 flex-1 min-w-0"
        >
          <p className="pub-name font-mono font-extrabold text-base md:text-base uppercase tracking-wider text-foreground leading-tight truncate">
            {marker.name}
          </p>

          {marker.app_rating ? (
            <BeerRating rating={marker.app_rating} count={marker.app_review_count} />
          ) : (
            <span className="text-xs text-muted-foreground font-sans">{t("noReview")}</span>
          )}

          <p className="flex items-center gap-1.5 text-xs text-foreground/80 font-sans font-semibold">
            {(marker.address || marker.city) && (
              <>
                <IoLocationSharp className="w-3.5 h-3.5 shrink-0 text-primary self-center" />
                {marker.address ?? marker.city}
              </>
            )}
            <span className="hidden md:inline-flex items-center gap-1.5">
              {(marker.address || marker.city) && (
                <span className="text-foreground/80 text-[8px]">•</span>
              )}
              {openNow === true ? (
                <>
                  <span className="font-sans font-bold text-open">{t("openStatus")}</span>
                  {closeTime && (
                    <span className="text-foreground/80 font-sans">{t("until", { time: closeTime })}</span>
                  )}
                </>
              ) : openNow === false ? (
                <span className="font-sans font-bold text-closed">{t("closedStatus")}</span>
              ) : (
                <span className="font-sans text-muted-foreground">{t("noHours")}</span>
              )}
            </span>
          </p>

          <div className="flex items-center gap-1.5 flex-wrap md:mt-auto">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary dark:bg-primary/20 text-foreground dark:text-white font-mono font-bold text-[10px] uppercase tracking-[0.15em]">
              <PlaceTypeIcon placeType={marker.place_type} size={12} />
              {marker.place_type}
            </span>
          </div>
        </Link>

      </div>

      {/* Desktop: action icons */}
      <div className="hidden md:flex flex-row items-center gap-4 shrink-0 self-start pt-1 pr-4">
        <button
          onClick={() => onShowOnMap({ id: marker.id, lat: marker.lat, lon: marker.lon })}
          aria-label="Show on map"
          className="flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground cursor-pointer"
        >
          <LuMap size={15} />
        </button>
        {canLike && (
          <button
            onClick={() => toggle(marker.id)}
            aria-label={isLiked ? "Unlike" : "Like"}
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

        {/* Stub content — barcode only */}
        <div className="w-[100px] max-h-[180px] self-stretch overflow-hidden p-[14px] flex flex-col">
          <TicketBarcode id={marker.id} name={marker.name} />
        </div>
      </div>
    </motion.li>
  );
}
