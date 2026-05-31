"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { type PubListItem } from "@/lib/supabase";
import { isOpenNow, getCloseTimeToday } from "@/lib/opening-hours";
import Image from "next/image";
import { IoLocationSharp } from "react-icons/io5";
import { MdDoorFront } from "react-icons/md";
import { LuMap } from "react-icons/lu";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import {
  PubSolid,
  PubLine,
  BarSolid,
  BiergartenSolid,
  MixedSolid,
} from "@/components/icons";

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
      return <PubSolid size={size} color={color} />;
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
    <div className="flex items-center gap-1.5">
      <div className="flex gap-[3px]">
        {Array.from({ length: 5 }).map((_, i) => {
          const full = rating >= i + 1;
          const half = !full && rating >= i + 0.5;
          if (half) {
            return (
              <span
                key={i}
                className="relative inline-flex items-center justify-center w-[18px] h-[18px]"
              >
                <PubLine size={18} className="text-muted-foreground" />
                <span
                  className="absolute top-0 left-0 bottom-0 overflow-hidden"
                  style={{ width: "50%" }}
                >
                  <PubSolid size={18} className="text-primary" />
                </span>
              </span>
            );
          }
          return (
            <span
              key={i}
              className="inline-flex items-center justify-center w-[18px] h-[18px]"
            >
              {full ? (
                <PubSolid size={18} className="text-primary" />
              ) : (
                <PubLine size={18} className="text-muted-foreground" />
              )}
            </span>
          );
        })}
      </div>
      <span className="text-xs font-bold text-foreground">
        {rating.toFixed(1)}
      </span>
      {count != null && (
        <span className="text-xs text-muted-foreground">({count} reviews)</span>
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
  openFilterActive?: boolean;
  onOpenFilterToggle?: () => void;
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
  openFilterActive,
  onOpenFilterToggle,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const isFetchingRef = useRef(isFetchingNextPage);
  useEffect(() => {
    isFetchingRef.current = isFetchingNextPage;
  });

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
    <aside className="flex flex-col h-full overflow-hidden border-r border-border">
      <div className="md:pr-4 pt-2 pb-4 shrink-0 flex items-center justify-between">
        <p className="text-sm text-muted-foreground bg- font-extrabold">
          Dostępne lokale - {totalCount} lokali
        </p>
        <div className="flex items-center gap-2">
          {onOpenFilterToggle && (
            <label
              className={`flex items-center gap-1.5 cursor-pointer text-xs font-extrabold transition-colors ${
                openFilterActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <MdDoorFront
                className={`text-base transition-colors ${
                  openFilterActive ? "text-primary" : "text-muted-foreground"
                }`}
              />

              <Switch
                checked={openFilterActive ?? false}
                onCheckedChange={() => onOpenFilterToggle()}
                className="data-unchecked:bg-muted-foreground dark:data-unchecked:bg-muted-foreground data-checked:bg-primary"
              />
            </label>
          )}
          {onShowMap && (
            <button
              onClick={onShowMap}
              className="md:hidden flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border text-muted-foreground border-border hover:border-primary/50 transition-colors"
            >
              <LuMap size={13} />
              Map
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
                        <BsBookmarkFill className="w-5 h-5 text-primary" />
                      ) : (
                        <BsBookmark className="w-5 h-5 text-white" />
                      )}
                    </button>
                  )}

                  {/* Mobile bottom overlay: open/close status left, map icon right */}
                  <div className="absolute bottom-3 left-3 right-3 md:hidden flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${openNow === true ? "bg-green-400" : openNow === false ? "bg-red-400" : "bg-zinc-400"}`}
                      />
                      <span className="text-xs font-bold text-white">
                        {openNow === true
                          ? closeTime
                            ? `Open until ${closeTime}`
                            : "Open"
                          : openNow === false
                            ? "Closed"
                            : "No hours"}
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
                    <p className="font-extrabold text-lg md:text-lg text-foreground leading-tight truncate">
                      {marker.name}
                    </p>

                    {marker.app_rating ? (
                      <BeerRating
                        rating={marker.app_rating}
                        count={marker.app_review_count}
                      />
                    ) : null}

                    <p className="flex items-center gap-1.5 text-xs text-foreground/80 font-extrabold">
                      {(marker.address || marker.city) && (
                        <>
                          <IoLocationSharp className="w-3.5 h-3.5 shrink-0 text-muted-foreground -mr-1" />
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
                            <span className="font-extrabold text-green-500">
                              Open
                            </span>
                            {closeTime && (
                              <span className="text-foreground/80 font-extrabold">
                                until {closeTime}
                              </span>
                            )}
                          </>
                        ) : openNow === false ? (
                          <span className="font-extrabold text-red-500">
                            Closed
                          </span>
                        ) : (
                          <span className="font-extrabold text-muted-foreground">
                            No hours
                          </span>
                        )}
                      </span>
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap md:mt-auto">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] md:text-[12px] bg-secondary dark:bg-primary/20 text-foreground dark:text-white font-bold">
                        <AmenityIcon amenity={marker.amenity} size={13} />
                        {marker.amenity.charAt(0).toUpperCase() +
                          marker.amenity.slice(1)}
                      </span>
                    </div>
                  </Link>
                </div>

                {/* Desktop: action icons — top-right corner */}
                <div className="hidden md:flex flex-row items-center gap-1 shrink-0 self-start">
                  <button
                    onClick={() =>
                      onShowOnMap({
                        id: marker.id,
                        lat: marker.lat,
                        lon: marker.lon,
                      })
                    }
                    aria-label="Show on map"
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <LuMap size={16} />
                  </button>
                  {onLikeToggle && (
                    <button
                      onClick={() => onLikeToggle(marker.id)}
                      aria-label={isLiked ? "Unlike" : "Like"}
                      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                    >
                      {isLiked ? (
                        <BsBookmarkFill className="w-4 h-4 text-primary" />
                      ) : (
                        <BsBookmark className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  )}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="py-4 text-center">
          {isFetchingNextPage && (
            <p className="text-xs text-muted-foreground">Loading more...</p>
          )}
          {!hasNextPage && markers.length > 0 && (
            <p className="text-xs text-muted-foreground">All places loaded</p>
          )}
        </div>
      </ul>
    </aside>
  );
}
