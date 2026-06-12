"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { type PubListItem } from "@/lib/supabase";
import { isOpenNow, getCloseTimeToday } from "@/lib/opening-hours";
import Image from "next/image";
import { IoLocationSharp } from "react-icons/io5";
import { LuMap } from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";
import {
  PubLine,
  BarSolid,
  BiergartenSolid,
  MixedSolid,
  HeartIcon,
  HeartOutlineIcon,
} from "@/components/icons";
import { OpenToggle } from "@/components/open-toggle";

function TicketBarcode({ id, name }: { id: string; name: string }) {
  // Dense horizontal bars from id+name — thin bars (1–2 units), 1-unit gaps
  const bars: Array<{ y: number; h: number }> = [];
  const src = (id + name + id + name).replace(/[-\s]/g, "").toUpperCase();
  let y = 0;
  for (const ch of src) {
    const code = ch.charCodeAt(0);
    const h = (code % 3) + 1; // 1, 2, or 3 units
    bars.push({ y, h });
    y += h + 3; // 3-unit gap — fewer lines overall
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
}

function AmenityIcon({
  amenity,
  size = 16,
  color = "currentColor",
}: {
  amenity: string;
  size?: number;
  color?: string;
}) {
  switch (amenity) {
    case "pub":
    case "restaurant":
    case "cafe":
    case "nightclub":
      return <PubLine size={size} color={color} />;
    case "bar":
      return <BarSolid size={size} color={color} />;
    case "biergarten":
      return <BiergartenSolid size={size} color={color} />;
    default:
      return <MixedSolid size={size} color={color} />;
  }
}

function BeerRating({
  rating,
  count,
}: {
  rating: number;
  count: number | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const full = rating >= i + 1;
          const half = !full && rating >= i + 0.5;
          if (half) {
            return (
              <span
                key={i}
                className="relative inline-flex items-center justify-center w-[14px] h-[14px]"
              >
                <PubLine size={14} className="text-muted-foreground" />
                <span
                  className="absolute top-0 left-0 bottom-0 overflow-hidden"
                  style={{ width: "50%" }}
                >
                  <PubLine size={14} className="text-primary" />
                </span>
              </span>
            );
          }
          return (
            <span
              key={i}
              className="inline-flex items-center justify-center w-[14px] h-[14px]"
            >
              {full ? (
                <PubLine size={14} className="text-primary" />
              ) : (
                <PubLine size={14} className="text-muted-foreground" />
              )}
            </span>
          );
        })}
      </div>
      <span className="text-xs font-semibold text-foreground font-sans">
        {rating.toFixed(1)}
      </span>
      {count != null && (
        <span className="text-xs text-muted-foreground font-sans">
          ({count} reviews)
        </span>
      )}
    </div>
  );
}

interface Props {
  markers: PubListItem[];
  totalCount: number;
  onShowOnMap: (coords: { id: string; lat: number; lon: number }) => void;
  onShowMap?: () => void;
  likedPlaces?: string[];
  onLikeToggle?: (id: string) => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export default function PubList({
  markers,
  totalCount,
  onShowOnMap,
  onShowMap,
  likedPlaces = [],
  onLikeToggle,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: Props) {
  const t = useTranslations("pubList");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const isFetchingRef = useRef(isFetchingNextPage);
  useEffect(() => {
    isFetchingRef.current = isFetchingNextPage;
  }, [isFetchingNextPage]);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && !isFetchingRef.current && onLoadMore) {
        onLoadMore();
      }
    },
    [onLoadMore],
  );

  useEffect(() => {
    if (!onLoadMore || !hasNextPage) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      root: listRef.current,
      threshold: 0,
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, handleIntersect]);

  return (
    <aside className="flex flex-col h-full overflow-hidden">
      <div className="md:pr-4 pt-2 pb-4 shrink-0 flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] shrink-0">
          <span className="text-muted-foreground">{t("availableLabel")}</span>
          <span className="text-white">
            {" "}
            {t("availableCount", { count: totalCount })}
          </span>
        </p>
        <div className="flex items-center gap-3">
          <OpenToggle />
          {onShowMap && (
            <button
              onClick={onShowMap}
              className="md:hidden flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border text-muted-foreground border-border hover:border-primary/50 transition-colors shrink-0"
            >
              <LuMap size={13} />
              {t("map")}
            </button>
          )}
        </div>
      </div>

      <ul
        ref={listRef}
        className="flex-1 overflow-y-auto flex flex-col gap-4 md:gap-3 md:pr-4 pt-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <AnimatePresence initial={false}>
          {markers.map((marker, index) => {
            const openNow = marker.opening_hours
              ? isOpenNow(marker.opening_hours)
              : null;
            const closeTime = marker.opening_hours
              ? getCloseTimeToday(marker.opening_hours)
              : null;
            const isLiked = likedPlaces.includes(marker.id);
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
                  <Link
                    href={`/places/${marker.id}`}
                    className="block w-full h-full"
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
                        <AmenityIcon amenity={marker.amenity} size={52} />
                      </div>
                    )}
                  </Link>

                  {/* Bookmark — top-right of image, mobile only */}
                  {onLikeToggle && (
                    <button
                      onClick={() => onLikeToggle(marker.id)}
                      aria-label={isLiked ? "Unlike" : "Like"}
                      className="md:hidden absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm"
                    >
                      {isLiked ? (
                        <HeartIcon size={18} className="text-primary" />
                      ) : (
                        <HeartOutlineIcon size={18} className="text-white" />
                      )}
                    </button>
                  )}

                  {/* Mobile bottom overlay: open/close status left, map icon right */}
                  <div className="absolute bottom-3 left-3 right-3 md:hidden flex items-center justify-between">
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
                    <button
                      onClick={() =>
                        onShowOnMap({
                          id: marker.id,
                          lat: marker.lat,
                          lon: marker.lon,
                        })
                      }
                      aria-label="Show on map"
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm"
                    >
                      <LuMap size={18} className="text-white" />
                    </button>
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
                      <span className="hidden md:inline-flex items-center gap-1.5">
                        {(marker.address || marker.city) && (
                          <span className="text-foreground/80 text-[8px]">
                            •
                          </span>
                        )}
                        {openNow === true ? (
                          <>
                            <span className="font-sans font-bold text-open">
                              {t("openStatus")}
                            </span>
                            {closeTime && (
                              <span className="text-foreground/80 font-sans">
                                {t("until", { time: closeTime })}
                              </span>
                            )}
                          </>
                        ) : openNow === false ? (
                          <span className="font-sans font-bold text-closed">
                            {t("closedStatus")}
                          </span>
                        ) : (
                          <span className="font-sans text-muted-foreground">
                            {t("noHours")}
                          </span>
                        )}
                      </span>
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap md:mt-auto">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary dark:bg-primary/20 text-foreground dark:text-white font-mono font-bold text-[10px] uppercase tracking-[0.15em]">
                        <AmenityIcon amenity={marker.amenity} size={12} />
                        {marker.amenity}
                      </span>
                    </div>
                  </Link>
                </div>

                {/* Desktop: action icons */}
                <div className="hidden md:flex flex-row items-center gap-4 shrink-0 self-start pt-1 pr-4">
                  <button
                    onClick={() =>
                      onShowOnMap({
                        id: marker.id,
                        lat: marker.lat,
                        lon: marker.lon,
                      })
                    }
                    aria-label="Show on map"
                    className=" flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <LuMap size={15} />
                  </button>
                  {onLikeToggle && (
                    <button
                      onClick={() => onLikeToggle(marker.id)}
                      aria-label={isLiked ? "Unlike" : "Like"}
                      className=" flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                    >
                      {isLiked ? (
                        <HeartIcon size={15} className="text-primary" />
                      ) : (
                        <HeartOutlineIcon
                          size={15}
                          className="text-muted-foreground"
                        />
                      )}
                    </button>
                  )}
                </div>

                {/* Desktop: ticket stub — right side */}
                <div className="hidden md:flex shrink-0 self-stretch -my-4 -mr-4 items-stretch min-h-0">
                  {/* Perforated separator with notches */}
                  <div className="relative flex flex-col items-center self-stretch">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-background z-10" />
                    {/* mt/mb = half notch height (7px) so dashes don't bleed into the circles */}
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
          })}
        </AnimatePresence>

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="py-4 text-center">
          {isFetchingNextPage && (
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              {t("loadingMore")}
            </p>
          )}
          {!hasNextPage && markers.length > 0 && (
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              {t("allLoaded")}
            </p>
          )}
        </div>
      </ul>
    </aside>
  );
}
